import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyWebSocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";
import authPlugin from "./plugins/auth.js";
import mediaSvcPlugin from "./plugins/media-client.js";
import ownerAuthPlugin from "./plugins/owner-auth.js";
import adminBetaMetricsRoute from "./routes/admin-beta-metrics.js";
import adminGuesthousesRoute from "./routes/admin-guesthouses.js";
import adminMediaRoute from "./routes/admin-media.js";
import adminPlacesRoute from "./routes/admin-places.js";
import adminProfileRoute from "./routes/admin-profile.js";
import authRefreshRoute from "./routes/auth-refresh.js";
import chatWsRoute from "./routes/chat-ws.js";
import discoverRoute from "./routes/discover.js";
import feedbackRoute from "./routes/feedback.js";
import healthRoute from "./routes/health.js";
import placesRoute from "./routes/places.js";
import tokenExchangeRoute from "./routes/token-exchange.js";
import telemetryRoute from "./routes/telemetry.js";
import tourPlansRoute from "./routes/tour-plans.js";
import publicTourPlansRoute from "./routes/public-tour-plans.js";

// Opaque tokens MUST NEVER land in logs (D15: token-in-URL hygiene). The
// default pino req serializer logs the full URL — we replace the opaque
// path segment with a placeholder before logging. Mirrors the token-svc
// pattern (see services/token-svc/src/app.ts).
function redactOpaqueInUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\/r\/[^/?#]+/, "/r/[redacted]");
}

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: redactOpaqueInUrl(req.url),
            remoteAddress: req.ip,
          };
        },
      },
    },
    trustProxy: true,
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

  // dt_refresh HttpOnly cookie is set by /r/:token; T-1.0.3+ owns the read
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
  await app.register(fastifyWebSocket);
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
  await app.register(adminPlacesRoute);
  await app.register(adminProfileRoute);
  await app.register(adminGuesthousesRoute);
  await app.register(tourPlansRoute);
  await app.register(telemetryRoute);
  await app.register(feedbackRoute);
  await app.register(adminBetaMetricsRoute);
  await app.register(publicTourPlansRoute);
  await app.register(chatWsRoute);

  return app;
}
