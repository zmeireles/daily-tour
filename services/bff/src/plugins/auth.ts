import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { loadConfig } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const DEV_FALLBACK_SECRET = "dev-bff-jwt-do-not-use-in-prod";

// T-1.0.2 will replace this stub with the real token-svc integration:
// opaque-token → JWT exchange, JTI cache in Redis, asymmetric verification.
async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const secret = config.JWT_PUBLIC_KEY ?? DEV_FALLBACK_SECRET;

  if (!config.JWT_PUBLIC_KEY) {
    fastify.log.warn(
      "[bff:auth] JWT_PUBLIC_KEY not set — using dev HS256 fallback. T-1.0.2 wires real auth.",
    );
  }

  await fastify.register(fastifyJwt, { secret });

  fastify.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "unauthorized" });
      }
    },
  );
}

export default fp(authPlugin, { name: "bff-auth" });
