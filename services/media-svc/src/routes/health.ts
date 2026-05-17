import type { FastifyInstance } from "fastify";
import { VERSION } from "../version.js";

export function healthRoutes(app: FastifyInstance): void {
  app.get("/health", { config: { rateLimit: false } }, () => ({
    status: "ok",
    service: "media-svc",
    version: VERSION,
  }));
}
