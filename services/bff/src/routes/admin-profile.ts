import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import type { JWTPayload } from "jose";
import { loadConfig } from "../config.js";

function ownerSub(req: FastifyRequest): string | undefined {
  return (req as FastifyRequest & { user: JWTPayload }).user?.sub;
}

// eslint-disable-next-line @typescript-eslint/require-await
const adminProfileRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/v1/admin/profile", { config: { auth: "owner" } }, async (req, reply) => {
    const ownerId = ownerSub(req);
    if (!ownerId) return reply.code(400).send({ error: "missing_sub_claim" });
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/owner-profiles/${ownerId}`);
    if (res.status === 404) return reply.code(404).send({ error: "profile_not_found" });
    if (!res.ok) {
      fastify.log.error({ status: res.status }, "[admin-profile] catalog-svc get error");
      return reply.code(502).send({ error: "catalog_unavailable" });
    }
    return reply.code(200).send(await res.json());
  });

  // PUT semantics — upsert (POST to catalog-svc with owner_id injected from JWT sub).
  fastify.put("/v1/admin/profile", { config: { auth: "owner" } }, async (req, reply) => {
    const ownerId = ownerSub(req);
    if (!ownerId) return reply.code(400).send({ error: "missing_sub_claim" });
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/owner-profiles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(req.body as object), owner_id: ownerId }),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });
};

export default adminProfileRoute;
