import type { FastifyInstance } from "fastify";
import { VERSION } from "../version.js";
import { getPool } from "../db.js";
import { isBrokerConnected } from "../lib/mq.js";

export function healthRoutes(app: FastifyInstance): void {
  // GET /health — liveness probe. No DB ping (a slow PG shouldn't fail
  // liveness, only readiness — that's what /ready is for).
  app.get("/health", { config: { rateLimit: false } }, () => ({
    status: "ok",
    service: "media-svc",
    version: VERSION,
  }));

  // GET /ready — readiness probe. The DB (SELECT 1) is the ONLY thing that
  // 503s — the compose `--wait` gate uses this, so peer checks would deadlock
  // startup. Broker liveness is reported informationally (cached amqp
  // connection-open check, no publish/round-trip) but never fails readiness.
  app.get("/ready", { config: { rateLimit: false } }, async (_req, reply) => {
    try {
      await getPool().query("SELECT 1");
      return {
        status: "ready",
        service: "media-svc",
        version: VERSION,
        broker: isBrokerConnected() ? "up" : "down",
      };
    } catch {
      reply.code(503);
      return { status: "not_ready", service: "media-svc", reason: "db_unreachable" };
    }
  });
}
