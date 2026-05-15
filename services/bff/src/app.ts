import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import authPlugin from "./plugins/auth.js";
import healthRoute from "./routes/health.js";

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env["LOG_LEVEL"] ?? "info" },
    trustProxy: true,
  });

  // Security headers. CSP is relaxed for dev; Phase 5 tightens it once
  // the PWA origin and downstream-service hostnames are known.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  // Echo the request origin in dev; the real allowlist lands when the
  // PWA's public hostname is provisioned.
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Global cap; per-route overrides are added as features land. /health
  // sets `rateLimit: false` so probes are never throttled.
  await app.register(fastifyRateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  await app.register(authPlugin);
  await app.register(healthRoute);

  return app;
}
