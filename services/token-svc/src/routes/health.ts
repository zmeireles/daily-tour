import type { FastifyInstance } from "fastify";
import { VERSION } from "../version.js";

// GET /health — liveness probe for Docker/k8s. No rate-limiting (probes must
// never be throttled). Stays minimal; no DB ping (a slow PG shouldn't fail
// liveness, only readiness — but we don't ship a /ready yet).
export function healthRoutes(app: FastifyInstance): void {
  app.get("/health", { config: { rateLimit: false } }, () => ({
    status: "ok",
    service: "token-svc",
    version: VERSION,
  }));
}
