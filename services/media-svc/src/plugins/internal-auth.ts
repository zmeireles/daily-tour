import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";

// Internal-token gate for the whole service (mirrors catalog-svc's
// plugins/internal-auth.ts).
//
// Why a service-wide hook and not per-route preHandlers: this plugin used to
// decorate `verifyInternal` and rely on each route opting in. That is
// allow-by-default — a route added without the preHandler is unauthenticated,
// and nothing fails. `/v1/assets/:id` was exactly that route, carrying a
// comment calling the presigned URL "the access control mechanism".
//
// It is not one. media-svc has no Traefik router and publishes no port: it is
// reachable only from `dt_internal`, where the BFF is its ONLY caller
// (services/bff/src/plugins/media-client.ts). The premise "the only things on
// dt_internal are ours" stopped holding when qr-bell's containers joined the
// network to reuse Traefik. Measured 2026-08-23 from `dt_notif_svc`, no header:
//   GET dt_media_svc:8087/v1/assets/<id> -> 302 + presigned MinIO GET URL
// i.e. any container on the network could exchange an asset id for bucket
// bytes. Same finding as dt-tests #36, in the service AUTH_POSTURES.md claimed
// was already covered.
//
// /health and /ready stay open: Docker's healthcheck wget sends no headers, and
// a probe that needs a secret is a probe that gets disabled.
const OPEN_PATHS = new Set(["/health", "/ready"]);

function internalAuthPlugin(fastify: FastifyInstance, _opts: object, done: () => void): void {
  const { MEDIA_SVC_INTERNAL_TOKEN } = loadConfig();

  fastify.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0];
    if (OPEN_PATHS.has(path ?? "")) return;
    const token = req.headers["x-internal-token"];
    if (!token || token !== MEDIA_SVC_INTERNAL_TOKEN) {
      await reply.code(401).send({ error: "unauthorized" });
    }
  });
  done();
}

export default fp(internalAuthPlugin, { name: "media-internal-auth" });
