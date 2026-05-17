import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import type { JWTPayload } from "jose";
import { z } from "zod";
import { loadConfig } from "../config.js";

const IdParamSchema = z.object({ id: z.string().uuid() });

function ownerSub(req: FastifyRequest): string | undefined {
  return (req as FastifyRequest & { user: JWTPayload }).user?.sub;
}

// eslint-disable-next-line @typescript-eslint/require-await
const adminGuesthousesRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List returns all guesthouses — single-owner v1; owner_id filter deferred to Phase 2.
  fastify.get("/v1/admin/guesthouses", { config: { auth: "owner" } }, async (req, reply) => {
    const { CATALOG_SVC_URL } = loadConfig();
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = qs
      ? `${CATALOG_SVC_URL}/v1/guesthouses?${qs}`
      : `${CATALOG_SVC_URL}/v1/guesthouses`;
    const res = await fetch(url);
    if (!res.ok) {
      fastify.log.error({ status: res.status }, "[admin-guesthouses] catalog-svc list error");
      return reply.code(502).send({ error: "catalog_unavailable" });
    }
    return reply.code(200).send(await res.json());
  });

  fastify.get("/v1/admin/guesthouses/:id", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/guesthouses/${parsed.data.id}`);
    if (!res.ok) {
      return reply.code(res.status === 404 ? 404 : 502).send({ error: "catalog_error" });
    }
    return reply.code(200).send(await res.json());
  });

  // owner_id is injected from the verified JWT sub — the PWA body must not include it.
  fastify.post("/v1/admin/guesthouses", { config: { auth: "owner" } }, async (req, reply) => {
    const ownerId = ownerSub(req);
    if (!ownerId) return reply.code(400).send({ error: "missing_sub_claim" });
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/guesthouses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(req.body as object), owner_id: ownerId }),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  fastify.patch("/v1/admin/guesthouses/:id", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/guesthouses/${parsed.data.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });
};

export default adminGuesthousesRoute;
