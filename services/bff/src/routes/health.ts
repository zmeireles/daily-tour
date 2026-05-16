import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { VERSION } from "../version.js";

// Fastify's plugin signature requires a Promise return so `app.register()`
// can await it, but the body has no awaits — hence the targeted disable.
// The route handler itself is sync (Fastify accepts both sync and async).
// eslint-disable-next-line @typescript-eslint/require-await
const healthRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/health",
    {
      // Probes must never hit auth or the rate-limiter.
      config: { rateLimit: false, auth: "public" },
    },
    () => ({
      status: "ok" as const,
      service: "bff" as const,
      version: VERSION,
    }),
  );
};

export default healthRoute;
