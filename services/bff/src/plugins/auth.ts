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
    // Routes opt OUT of the global authenticate hook by setting auth: 'public'.
    // The default (undefined) is required-auth — secure by default.
    auth?: "required" | "public";
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

  // Secure-by-default: every route gets the authenticate preHandler unless
  // it explicitly opts out via `config: { auth: 'public' }`. /health and
  // /r/:token must opt out — /health is a probe, /r/:token IS the auth
  // ceremony itself (no JWT exists yet at that point).
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config?.auth === "public") return;
    const existing = routeOptions.preHandler;
    if (!existing) {
      routeOptions.preHandler = [fastify.authenticate];
    } else if (Array.isArray(existing)) {
      routeOptions.preHandler = [fastify.authenticate, ...existing];
    } else {
      routeOptions.preHandler = [fastify.authenticate, existing];
    }
  });
}

export default fp(authPlugin, { name: "bff-auth" });
