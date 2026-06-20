import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { setupSentryFastifyErrorHandler } from "@daily-tour/shared-sentry";
import { loadConfig } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { issueRoutes } from "./routes/issue.js";
import { exchangeRoutes } from "./routes/exchange.js";
import { revokeRoutes } from "./routes/revoke.js";
import { listRoutes } from "./routes/list.js";

// Opaque tokens MUST NEVER land in logs (D15: token-in-URL hygiene). Pino's
// default req serializer logs the full URL — we replace the opaque path
// segment with a placeholder before logging.
function redactOpaqueInUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\/v1\/tokens\/[^/]+\/exchange/, "/v1/tokens/[redacted]/exchange");
}

export async function createApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
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
  });

  await app.register(helmet);
  await app.register(cors, { origin: true, credentials: true });
  // Global default; per-route overrides in issue/exchange/revoke.
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  await app.register(healthRoutes);
  await app.register(issueRoutes);
  await app.register(exchangeRoutes);
  await app.register(revokeRoutes);
  await app.register(listRoutes);

  // Report route errors to Sentry, then defer to Fastify's default handler.
  // No-op when SENTRY_DSN is unset (see @daily-tour/shared-sentry).
  setupSentryFastifyErrorHandler(app);

  return app;
}
