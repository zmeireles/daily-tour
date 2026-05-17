import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { loadConfig } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    // Temporary auth posture until T-1.6.x integrates Authentik for owner identity.
    // The BFF is the sole trusted caller on dt_internal; it must send X-Internal-Token
    // matching MEDIA_SVC_INTERNAL_TOKEN on every request to protected endpoints.
    // T-1.6.x will replace this stub with an Authentik audience check (aud: staff).
    verifyInternal: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function internalAuthPlugin(fastify: FastifyInstance, _opts: object, done: () => void): void {
  const { MEDIA_SVC_INTERNAL_TOKEN } = loadConfig();

  fastify.decorate(
    "verifyInternal",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const token = req.headers["x-internal-token"];
      if (!token || token !== MEDIA_SVC_INTERNAL_TOKEN) {
        await reply.code(401).send({ error: "unauthorized" });
      }
    },
  );
  done();
}

export default fp(internalAuthPlugin, { name: "media-internal-auth" });
