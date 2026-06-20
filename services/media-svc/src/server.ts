import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { setupSentryFastifyErrorHandler } from "@daily-tour/shared-sentry";
import { loadConfig } from "./config.js";
import internalAuthPlugin from "./plugins/internal-auth.js";
import { healthRoutes } from "./routes/health.js";
import { uploadsRoutes } from "./routes/uploads.js";
import { assetsRoutes } from "./routes/assets.js";

export async function createApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            remoteAddress: req.ip,
          };
        },
      },
    },
  });

  await app.register(helmet);
  await app.register(cors, { origin: false }); // internal-only service; no cross-origin callers
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  // Register internalAuthPlugin before routes so verifyInternal is available as preHandler.
  await app.register(internalAuthPlugin);

  await app.register(healthRoutes);
  await app.register(uploadsRoutes);
  await app.register(assetsRoutes);

  // Report route errors to Sentry, then defer to Fastify's default handler.
  // No-op when SENTRY_DSN is unset (see @daily-tour/shared-sentry).
  setupSentryFastifyErrorHandler(app);

  return app;
}
