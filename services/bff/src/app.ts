import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyWebSocket from "@fastify/websocket";
import { setupSentryFastifyErrorHandler } from "@daily-tour/shared-sentry";
import { CHAT_JWT_SUBPROTOCOL } from "@daily-tour/shared-types";
import Fastify, { type FastifyInstance } from "fastify";
import authPlugin from "./plugins/auth.js";
import mediaSvcPlugin from "./plugins/media-client.js";
import ownerAuthPlugin from "./plugins/owner-auth.js";
import adminBetaMetricsRoute from "./routes/admin-beta-metrics.js";
import adminChatRoute from "./routes/admin-chat.js";
import adminGeocodeRoute from "./routes/admin-geocode.js";
import adminGuesthousesRoute from "./routes/admin-guesthouses.js";
import adminMediaRoute from "./routes/admin-media.js";
import mediaDisplayRoute from "./routes/media-display.js";
import adminPlacesRoute from "./routes/admin-places.js";
import adminProfileRoute from "./routes/admin-profile.js";
import adminReservationsRoute from "./routes/admin-reservations.js";
import adminTranslateRoute from "./routes/admin-translate.js";
import authRefreshRoute from "./routes/auth-refresh.js";
import chatHistoryRoute from "./routes/chat-history.js";
import chatWsRoute from "./routes/chat-ws.js";
import discoverRoute from "./routes/discover.js";
import healthRoute from "./routes/health.js";
import placesRoute from "./routes/places.js";
import tokenExchangeRoute from "./routes/token-exchange.js";
import telemetryRoute from "./routes/telemetry.js";
import tourPlansRoute from "./routes/tour-plans.js";
import publicTourPlansRoute from "./routes/public-tour-plans.js";

// Credential-bearing query parameters. Masked by value, never dropped, so a
// log line still shows that the parameter was present.
const CREDENTIAL_QUERY_PARAMS = new Set(["token", "access_token"]);

// Credentials MUST NEVER land in logs (D15: token-in-URL hygiene). The
// default pino req serializer logs the full URL, so we mask both shapes one
// can take there: the opaque `/r/<token>` path segment, and the value of a
// credential-bearing query parameter. Mirrors the token-svc pattern (see
// services/token-svc/src/app.ts).
//
// The query half is defence in depth, not the primary control. Chat used to
// carry the guest JWT as `?token=`, which put a live bearer credential into
// TWO sinks — this log and Traefik's JSON access log, whose `RequestPath`
// field includes the query string and offers no redaction of its own. The fix
// for that was to move the credential into `Sec-WebSocket-Protocol` (see
// routes/chat-ws.ts), because masking here would only have closed the sink we
// control. This stays because a URL is the wrong place for a credential
// whether or not a route puts one there today.
export function redactUrlForLog(url: string | undefined): string {
  if (!url) return "";
  const queryStart = url.indexOf("?");
  const path = queryStart === -1 ? url : url.slice(0, queryStart);
  const redactedPath = path.replace(/\/r\/[^/?#]+/, "/r/[redacted]");
  if (queryStart === -1) return redactedPath;

  const redactedQuery = url
    .slice(queryStart + 1)
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return pair;
      const name = pair.slice(0, eq);
      return CREDENTIAL_QUERY_PARAMS.has(name.toLowerCase()) ? `${name}=[redacted]` : pair;
    })
    .join("&");
  return `${redactedPath}?${redactedQuery}`;
}

/**
 * Number of reverse-proxy hops in front of this service whose
 * `X-Forwarded-For` contribution may be believed. Deployments put exactly one
 * (Traefik) in the path; see infra/compose/docker-compose.traefik.yml.
 */
const TRUSTED_PROXY_HOPS = 1;

/**
 * The request serializer Fastify is actually given, exported so a test can
 * assert the redaction is WIRED and not merely available: a redactor that no
 * serializer calls reads exactly like one that works.
 */
export function serializeRequestForLog(req: { method: string; url: string; ip: string }): {
  method: string;
  url: string;
  remoteAddress: string;
} {
  return {
    method: req.method,
    url: redactUrlForLog(req.url),
    remoteAddress: req.ip,
  };
}

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      serializers: {
        req: serializeRequestForLog,
      },
    },
    // Trust exactly ONE proxy hop — the Traefik instance that fronts this
    // service — so `req.ip` is the address that proxy observed, not whatever
    // a caller put in `X-Forwarded-For`. `true` would trust the whole chain,
    // which makes the client's own value authoritative; since the global
    // rate-limiter keys on `req.ip`, that hands callers control of their own
    // limiter bucket. Covered by __tests__/proxy-trust.test.ts.
    //
    // A CIDR would be stricter still, but `dt_internal`'s subnet is assigned
    // by Docker and is not pinned in the compose files, so it drifts between
    // hosts; a stale CIDR fails closed into "every client shares one bucket".
    trustProxy: TRUSTED_PROXY_HOPS,
  });

  // Security headers. CSP is relaxed for dev; Phase 5 tightens it once
  // the PWA origin and downstream-service hostnames are known.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  // Echo the request origin in dev; the real allowlist lands when the
  // PWA's public hostname is provisioned.
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Global cap; per-route overrides are added as features land. /health
  // sets `rateLimit: false` so probes are never throttled.
  await app.register(fastifyRateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  // dt_refresh HttpOnly cookie is set by /v1/r/:token; T-1.0.3+ owns the read
  // side. No signed-cookie secret yet — the cookie value is the opaque
  // token, which already carries entropy.
  await app.register(fastifyCookie);

  // Auth plugin installs the global onRoute hook that dispatches each route
  // to fastify.authenticate (guest, default), fastify.authenticateOwner
  // (owner, Authentik RS256), or no preHandler (public). Routes registered
  // BEFORE this point are exempt (e.g. plugins it depends on). We register
  // auth FIRST so route registrations below pick up the hook.
  // @fastify/websocket upgrades HTTP→WS for any route declared `{ websocket: true }`.
  // Must register BEFORE the auth plugin so the chat-ws route picks up the
  // upgrade machinery via its own onRoute hook.
  //
  // `handleProtocols` selects the sentinel out of the client's offer
  // `["dt.jwt", "<guest jwt>"]` and echoes ONLY that back. Left unset, `ws`
  // selects whichever protocol was offered first — today that is the sentinel
  // too, so this looks redundant, but the fallback is positional and would
  // start echoing the JWT in a response header the day the order changed.
  await app.register(fastifyWebSocket, {
    options: {
      handleProtocols: (protocols: Set<string>): string | false =>
        protocols.has(CHAT_JWT_SUBPROTOCOL) ? CHAT_JWT_SUBPROTOCOL : false,
    },
  });
  await app.register(authPlugin);
  // Owner-auth plugin decorates app.authenticateOwner for the 'owner'
  // posture (T-1.6.0 — Authentik-issued JWT verified via JWKS, aud=staff).
  // Registered before any owner-tagged route so the dispatch hook resolves.
  await app.register(ownerAuthPlugin);
  // mediaSvcPlugin decorates app.mediaSvc — used by T-1.6.2 backoffice upload route.
  await app.register(mediaSvcPlugin);
  await app.register(healthRoute);
  await app.register(tokenExchangeRoute);
  await app.register(authRefreshRoute);
  // discoverRoute registers after authPlugin so the onRoute hook applies authentication.
  await app.register(discoverRoute);
  await app.register(placesRoute);
  await app.register(adminMediaRoute);
  await app.register(mediaDisplayRoute);
  await app.register(adminPlacesRoute);
  await app.register(adminProfileRoute);
  await app.register(adminGuesthousesRoute);
  await app.register(adminReservationsRoute);
  await app.register(adminTranslateRoute);
  await app.register(adminGeocodeRoute);
  await app.register(adminChatRoute);
  await app.register(tourPlansRoute);
  await app.register(telemetryRoute);
  await app.register(adminBetaMetricsRoute);
  await app.register(publicTourPlansRoute);
  await app.register(chatHistoryRoute);
  await app.register(chatWsRoute);

  // Report route errors to Sentry, then defer to Fastify's default handler.
  // No-op when SENTRY_DSN is unset (see @daily-tour/shared-sentry).
  setupSentryFastifyErrorHandler(app);

  return app;
}
