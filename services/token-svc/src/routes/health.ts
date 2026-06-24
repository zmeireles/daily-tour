import type { FastifyInstance } from "fastify";
import { VERSION } from "../version.js";
import { getPool } from "../db/client.js";

// GET /health — liveness probe for Docker/k8s. No rate-limiting (probes must
// never be throttled). Stays minimal; no DB ping (a slow PG shouldn't fail
// liveness, only readiness — that's what /ready is for).
export function healthRoutes(app: FastifyInstance): void {
  app.get("/health", { config: { rateLimit: false } }, () => ({
    status: "ok",
    service: "token-svc",
    version: VERSION,
  }));

  // GET /ready — readiness probe. Checks ONLY this service's own Postgres
  // (SELECT 1). No downstream peers/Redis/etc — the compose `--wait` gate
  // uses this, so peer checks would deadlock startup.
  // Inherits the global rate-limit (unlike /health): a DB-touching route must be
  // rate-limited (CWE-770). The loopback healthcheck runs far under the limit.
  app.get("/ready", async (_req, reply) => {
    try {
      await getPool().query("SELECT 1");
      return { status: "ready", service: "token-svc", version: VERSION };
    } catch {
      reply.code(503);
      return { status: "not_ready", service: "token-svc", reason: "db_unreachable" };
    }
  });
}
