import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { catalogHeaders } from "../lib/catalog-headers.js";
import type { JWTPayload } from "jose";
import { z } from "zod";
import { loadConfig } from "../config.js";

const IdParamSchema = z.object({ id: z.string().uuid() });
const HiddenPlaceParamSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string().uuid(),
});

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
    const res = await fetch(url, { headers: catalogHeaders() });
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
    const res = await fetch(`${CATALOG_SVC_URL}/v1/guesthouses/${parsed.data.id}`, {
      headers: catalogHeaders(),
    });
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
      headers: catalogHeaders({ "content-type": "application/json" }),
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
      headers: catalogHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // Hide / unhide a global place for this guesthouse's guests (Plan-006 6.A.3).
  // Owner-gated proxy → catalog hide/unhide. Single-owner v1: the per-guesthouse
  // owner_id ownership check is deferred (same posture as the routes above).
  async function proxyHidden(req: FastifyRequest, reply: FastifyReply, method: "PUT" | "DELETE") {
    const parsed = HiddenPlaceParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(
      `${CATALOG_SVC_URL}/v1/guesthouses/${parsed.data.id}/hidden-places/${parsed.data.placeId}`,
      { method, headers: catalogHeaders() },
    );
    const data = await res.json();
    return reply.code(res.status).send(data);
  }

  fastify.put(
    "/v1/admin/guesthouses/:id/hidden-places/:placeId",
    { config: { auth: "owner" } },
    (req, reply) => proxyHidden(req, reply, "PUT"),
  );
  fastify.delete(
    "/v1/admin/guesthouses/:id/hidden-places/:placeId",
    { config: { auth: "owner" } },
    (req, reply) => proxyHidden(req, reply, "DELETE"),
  );
};

export default adminGuesthousesRoute;
