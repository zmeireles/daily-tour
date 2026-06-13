import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loadConfig } from "../config.js";

const IdParamSchema = z.object({ id: z.string().uuid() });

// eslint-disable-next-line @typescript-eslint/require-await
const adminReservationsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List returns all reservations — single-owner v1; owner_id filter deferred to Phase 2.
  fastify.get("/v1/admin/reservations", { config: { auth: "owner" } }, async (req, reply) => {
    const { TOKEN_SVC_URL } = loadConfig();
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = qs ? `${TOKEN_SVC_URL}/v1/reservations?${qs}` : `${TOKEN_SVC_URL}/v1/reservations`;
    const res = await fetch(url);
    if (!res.ok) {
      fastify.log.error({ status: res.status }, "[admin-reservations] token-svc list error");
      return reply.code(502).send({ error: "token_svc_unavailable" });
    }
    return reply.code(200).send(await res.json());
  });

  // Issue a guest-entry token for a reservation. Proxies token-svc, which
  // returns the opaque token; the PWA builds the `/r/<token>` shareable link.
  // Forwards the downstream status so 404 (unknown) / 410 (expired) reach the UI.
  fastify.post(
    "/v1/admin/reservations/:id/token",
    { config: { auth: "owner" } },
    async (req, reply) => {
      const parsed = IdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
      }
      const { TOKEN_SVC_URL } = loadConfig();
      const res = await fetch(`${TOKEN_SVC_URL}/v1/reservations/${parsed.data.id}/token`, {
        method: "POST",
      });
      const data = await res.json();
      return reply.code(res.status).send(data);
    },
  );

  // Revoke a reservation's active token(s). token-svc returns 204 (no body)
  // on success, 404 if the reservation is unknown. Forward the status verbatim.
  fastify.delete(
    "/v1/admin/reservations/:id/token",
    { config: { auth: "owner" } },
    async (req, reply) => {
      const parsed = IdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
      }
      const { TOKEN_SVC_URL } = loadConfig();
      const res = await fetch(`${TOKEN_SVC_URL}/v1/reservations/${parsed.data.id}/token`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        return reply.code(204).send();
      }
      return reply.code(res.status).send(await res.json());
    },
  );
};

export default adminReservationsRoute;
