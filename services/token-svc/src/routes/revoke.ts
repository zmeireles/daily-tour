import type { FastifyInstance } from "fastify";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { reservationTable, tokenGrantTable } from "../db/schema.js";

// jti is the base64url SHA-256 of the opaque token — 43 chars + padding-stripped.
// Accept slightly looser bounds in case the hash algo changes later.
const ParamsSchema = z.object({ jti: z.string().min(1).max(128) });
const ReservationParamsSchema = z.object({ id: z.string().uuid() });

export function revokeRoutes(app: FastifyInstance): void {
  // DELETE /v1/tokens/:jti
  // Idempotent: re-revoking a revoked token returns 204. 404 only if the
  // jti was never issued.
  //
  // Auth: NONE (internal-only network). Wrap in mTLS / API-key when n8n
  // auto-revoke flow lands (see deferrals in session-handoff.md).
  app.delete(
    "/v1/tokens/:jti",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = ParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(404).send({ error: "token_not_found" });
      }
      const { jti } = parsed.data;

      const db = getDb();
      // First check existence — separate from the UPDATE so we can distinguish
      // 404 (never existed) from 204 (existed; revoked or already-revoked).
      const [existing] = await db
        .select({ jti: tokenGrantTable.jti })
        .from(tokenGrantTable)
        .where(eq(tokenGrantTable.jti, jti))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ error: "token_not_found" });
      }

      await db
        .update(tokenGrantTable)
        .set({ revokedAt: sql`now()` })
        .where(and(eq(tokenGrantTable.jti, jti), isNull(tokenGrantTable.revokedAt)));

      return reply.code(204).send();
    },
  );

  // DELETE /v1/reservations/:id/token
  // Reservation-scoped revoke: marks ALL of a reservation's active grants
  // revoked in one call. The backoffice only knows the reservation id (it
  // never stores the opaque token / jti), so this is the handle it revokes by.
  // Idempotent: re-revoking returns 204. 404 only if the reservation is unknown.
  app.delete(
    "/v1/reservations/:id/token",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = ReservationParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_reservation_id" });
      }
      const { id } = parsed.data;

      const db = getDb();
      const [reservation] = await db
        .select({ id: reservationTable.id })
        .from(reservationTable)
        .where(eq(reservationTable.id, id))
        .limit(1);

      if (!reservation) {
        return reply.code(404).send({ error: "reservation_not_found" });
      }

      await db
        .update(tokenGrantTable)
        .set({ revokedAt: sql`now()` })
        .where(and(eq(tokenGrantTable.reservationId, id), isNull(tokenGrantTable.revokedAt)));

      return reply.code(204).send();
    },
  );
}
