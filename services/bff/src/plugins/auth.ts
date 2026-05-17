import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { loadConfig } from "../config.js";
import { isJtiRevoked } from "../lib/redis.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyContextConfig {
    // Three postures:
    //   'required' (default) → guest path (HS256, token-svc issued).
    //   'public'             → no auth (probes, /r/:token).
    //   'owner'              → Authentik RS256 (JWKS) + aud/group check.
    // See services/bff/src/plugins/AUTH_POSTURES.md.
    auth?: "required" | "public" | "owner";
  }
}

// Verify-only HS256: token-svc signs, the BFF only verifies. The shared
// secret comes from JWT_SIGNING_KEY (validated min 32 chars in config).
// Revocation is enforced via the Redis JTI cache — a JTI may be valid by
// signature + exp but still rejected if it's in jti:revoked:<jti>.
async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const config = loadConfig();
  await fastify.register(fastifyJwt, { secret: config.JWT_SIGNING_KEY });

  fastify.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "unauthorized" });
        return;
      }
      const jti = (req.user as { jti?: string }).jti;
      if (jti && (await isJtiRevoked(jti))) {
        await reply.code(401).send({ error: "revoked" });
      }
    },
  );

  // Secure-by-default: every route gets a preHandler unless it explicitly
  // opts out via `config: { auth: 'public' }`. /health and /r/:token must
  // opt out — /health is a probe, /r/:token IS the auth ceremony itself
  // (no JWT exists yet at that point). Owner-tagged routes dispatch to
  // fastify.authenticateOwner (registered by the owner-auth plugin); we
  // resolve the decorator at request time rather than at onRoute time so
  // that owner-auth can be registered after this plugin without breaking
  // route registration order.
  fastify.addHook("onRoute", (routeOptions) => {
    const posture = routeOptions.config?.auth;
    if (posture === "public") return;
    const handler =
      posture === "owner"
        ? async (req: FastifyRequest, reply: FastifyReply) => fastify.authenticateOwner(req, reply)
        : fastify.authenticate;
    const existing = routeOptions.preHandler;
    if (!existing) {
      routeOptions.preHandler = [handler];
    } else if (Array.isArray(existing)) {
      routeOptions.preHandler = [handler, ...existing];
    } else {
      routeOptions.preHandler = [handler, existing];
    }
  });
}

export default fp(authPlugin, { name: "bff-auth" });
