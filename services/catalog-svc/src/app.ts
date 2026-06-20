import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { setupSentryFastifyErrorHandler } from "@daily-tour/shared-sentry";
import { loadConfig } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { placesRoutes } from "./routes/places.js";
import { guesthousesRoutes } from "./routes/guesthouses.js";
import { ownerProfilesRoutes } from "./routes/owner-profiles.js";

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
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  await app.register(healthRoutes);
  await app.register(placesRoutes);
  await app.register(guesthousesRoutes);
  await app.register(ownerProfilesRoutes);

  // Report route errors to Sentry, then defer to Fastify's default handler.
  // No-op when SENTRY_DSN is unset (see @daily-tour/shared-sentry).
  setupSentryFastifyErrorHandler(app);

  return app;
}
