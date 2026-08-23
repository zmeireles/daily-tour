import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";

// Internal-token gate for the whole service (mirrors media-svc's
// plugins/internal-auth.ts, which guards its upload routes).
//
// Why every route and not selected ones: unlike media-svc, catalog-svc has no
// deliberately-public endpoint — the BFF is its only legitimate caller. The
// premise "the BFF is the sole caller on dt_internal" stopped holding the day
// qr-bell's containers joined the network to reuse Traefik (measured 2026-08-21:
// 25 containers on dt_internal, `GET /v1/places` answered a qr-bell container
// with full data, no credential). Network membership is not identity, so the
// route layer has to check one.
//
// /health and /ready stay open: Docker's healthcheck wget sends no headers, and
// a probe that needs a secret is a probe that gets disabled.
const OPEN_PATHS = new Set(["/health", "/ready"]);

function internalAuthPlugin(fastify: FastifyInstance, _opts: object, done: () => void): void {
  const { CATALOG_SVC_INTERNAL_TOKEN } = loadConfig();

  fastify.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0];
    if (OPEN_PATHS.has(path ?? "")) return;
    const token = req.headers["x-internal-token"];
    if (!token || token !== CATALOG_SVC_INTERNAL_TOKEN) {
      await reply.code(401).send({ error: "unauthorized" });
    }
  });
  done();
}

export default fp(internalAuthPlugin, { name: "catalog-internal-auth" });
