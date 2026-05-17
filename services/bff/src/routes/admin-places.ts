import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loadConfig } from "../config.js";

const IdParamSchema = z.object({ id: z.string().uuid() });

// eslint-disable-next-line @typescript-eslint/require-await
const adminPlacesRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/v1/admin/places", { config: { auth: "owner" } }, async (req, reply) => {
    const { CATALOG_SVC_URL } = loadConfig();
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = qs ? `${CATALOG_SVC_URL}/v1/places?${qs}` : `${CATALOG_SVC_URL}/v1/places`;
    const res = await fetch(url);
    if (!res.ok) {
      fastify.log.error({ status: res.status }, "[admin-places] catalog-svc list error");
      return reply.code(502).send({ error: "catalog_unavailable" });
    }
    return reply.code(200).send(await res.json());
  });

  fastify.post("/v1/admin/places", { config: { auth: "owner" } }, async (req, reply) => {
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/places`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  fastify.get("/v1/admin/places/:id", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(
      `${CATALOG_SVC_URL}/v1/places/${parsed.data.id}?include_archived=true`,
    );
    if (!res.ok) {
      return reply.code(res.status === 404 ? 404 : 502).send({ error: "catalog_error" });
    }
    return reply.code(200).send(await res.json());
  });

  fastify.patch("/v1/admin/places/:id", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/places/${parsed.data.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  fastify.delete("/v1/admin/places/:id", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { CATALOG_SVC_URL } = loadConfig();
    const res = await fetch(`${CATALOG_SVC_URL}/v1/places/${parsed.data.id}`, {
      method: "DELETE",
    });
    return reply.code(res.status).send();
  });
};

export default adminPlacesRoute;
