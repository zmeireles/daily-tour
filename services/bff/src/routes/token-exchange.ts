import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { decodeJwt } from "jose";
import { loadConfig } from "../config.js";
import { cacheJtiActive } from "../lib/redis.js";
import { TokenExchangeError, exchangeOpaqueToken } from "../lib/token-svc-client.js";

interface ExchangeParams {
  token: string;
}

// The route hands the opaque path-segment to token-svc, returns the resulting
// JWT to the PWA, and sets a long-lived HttpOnly refresh cookie holding the
// opaque token itself. The PWA never touches that cookie — it's used by a
// future refresh handler (out of scope for T-1.0.2) when the JWT expires.
// eslint-disable-next-line @typescript-eslint/require-await
const tokenExchangeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const config = loadConfig();

  // NOTE: the BFF redeem endpoint lives under /v1 so that on a same-origin
  // deployment (PWA + BFF on one apex host) the apex `/v1` path-router sends
  // this XHR to the BFF while the bare SPA router keeps owning the browser
  // route `/r/:token` (the public guest link). Pre-/v1 this was `/r/:token`
  // and collided with the SPA route on the apex (the link 200'd as raw JSON).
  fastify.get<{ Params: ExchangeParams }>(
    "/v1/r/:token",
    {
      config: {
        // The URL IS the credential — no JWT exists yet at this point.
        auth: "public",
        // Tighter cap than the 200/min global: this endpoint is unauthenticated
        // and back-pressure protects token-svc.
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      const opaque = req.params.token;

      let result;
      try {
        result = await exchangeOpaqueToken(opaque);
      } catch (err) {
        if (err instanceof TokenExchangeError && (err.status === 401 || err.status === 404)) {
          // FR-AC-05: expired/invalid tokens degrade to public landing.
          // The query reason is intentionally generic — no PII, no JTI.
          return reply.redirect("/?reason=expired", 302);
        }
        throw err;
      }

      const { jwt, exp } = result;

      // Trust token-svc's signature here — we already paid that round-trip.
      // We only need jti for the revocation cache.
      const claims = decodeJwt(jwt);
      const jti = claims.jti;

      if (jti) {
        // 60s active-marker: aligns with the 1h JWT lifetime / 1m revocation
        // window described in FR-AC-04. Fire-and-forget: if Redis is briefly
        // down we still want to return the JWT.
        await cacheJtiActive(jti, 60).catch((err: unknown) => {
          req.log.warn({ err }, "[bff:token-exchange] cacheJtiActive failed");
        });
      }

      void reply.setCookie("dt_refresh", opaque, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(exp * 1000),
      });

      return reply.code(200).send({ jwt, exp });
    },
  );
};

export default tokenExchangeRoute;
