import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { decodeJwt } from "jose";
import { loadConfig } from "../config.js";
import { cacheJtiActive } from "../lib/redis.js";
import { TokenExchangeError, exchangeOpaqueToken } from "../lib/token-svc-client.js";

// Mints a fresh JWT from the HttpOnly `dt_refresh` cookie set during
// /v1/r/:token. The cookie value IS the opaque token — re-exchanging is
// idempotent against token-svc (tokens stay valid until reservation
// checkout + 24h per D6), so this is safe to call on every PWA boot.
//
// 401 paths clear the cookie so the next boot doesn't loop on a stale
// credential — the PWA falls through to the public landing.
// eslint-disable-next-line @typescript-eslint/require-await
const authRefreshRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const config = loadConfig();

  fastify.get(
    "/v1/auth/refresh",
    {
      config: {
        // The cookie IS the credential. No bearer JWT exists yet on a cold
        // boot — the whole point of this endpoint is to mint one.
        auth: "public",
        // Per-session call (once per PWA boot). Same cap as /v1/r/:token; the
        // unauthenticated path-rate limit on the global plugin already
        // backs us up.
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      const opaque = req.cookies["dt_refresh"];

      if (!opaque) {
        return reply.code(401).send({ error: "no_refresh_cookie" });
      }

      let result;
      try {
        result = await exchangeOpaqueToken(opaque);
      } catch (err) {
        if (err instanceof TokenExchangeError && (err.status === 401 || err.status === 404)) {
          // Stale cookie — clear it so the next refresh attempt short-circuits
          // to the no_refresh_cookie path instead of repeatedly hitting
          // token-svc.
          void reply.clearCookie("dt_refresh", { path: "/" });
          return reply.code(401).send({ error: "invalid_refresh" });
        }
        throw err;
      }

      const { jwt, exp } = result;
      const claims = decodeJwt(jwt);
      const jti = claims.jti;

      if (jti) {
        await cacheJtiActive(jti, 60).catch((err: unknown) => {
          req.log.warn({ err }, "[bff:auth-refresh] cacheJtiActive failed");
        });
      }

      // Re-set the cookie with the new exp — tokens have a 14-day window
      // (checkout + 24h) but each refresh slides the visible-to-browser
      // expiry to match the freshly-minted JWT's exp claim.
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

export default authRefreshRoute;
