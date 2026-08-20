import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { GUEST_JWT_MAX_TTL_SECONDS } from "@daily-tour/shared-types";
import { getDb } from "../db/client.js";
import { reservationTable, tokenGrantTable } from "../db/schema.js";
import { markJtisRevoked } from "../lib/redis.js";

// jti is the base64url SHA-256 of the opaque token — 43 chars + padding-stripped.
// Accept slightly looser bounds in case the hash algo changes later.
const ParamsSchema = z.object({ jti: z.string().min(1).max(128) });
const ReservationParamsSchema = z.object({ id: z.string().uuid() });

// Revoking has two halves and BOTH are load-bearing: the Postgres write stops
// the grant being exchanged for a new JWT, and the Redis write stops the JWTs
// already in the guest's hands. Without the second, a revoked guest keeps full
// access until their current token expires — up to GUEST_JWT_MAX_TTL_SECONDS.
//
// So a cache failure is reported, never swallowed. 503 is honest: the record is
// updated, the live sessions are not, and the caller should retry — which is
// safe, because both routes re-derive the JTIs to publish from the grant rows
// rather than from what this particular call happened to change.
async function publishOrFail(
  jtis: readonly string[],
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  try {
    await markJtisRevoked(jtis);
    return true;
  } catch (err: unknown) {
    req.log.error(
      { err, count: jtis.length },
      "[token-svc:revoke] revoked in Postgres but the JTI cache write failed — " +
        "already-minted JWTs stay valid until they expire; retry the revoke",
    );
    await reply.code(503).send({ error: "revocation_cache_unavailable" });
    return false;
  }
}

// A JWT minted before this instant expires at most GUEST_JWT_MAX_TTL_SECONDS
// from now, so grants revoked longer ago than that have nothing left to block.
function replayWindowStart(): string {
  return new Date(Date.now() - GUEST_JWT_MAX_TTL_SECONDS * 1000).toISOString();
}

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

      // Unconditional, not "only if this call did the update": a retry after a
      // failed cache write must still publish.
      if (!(await publishOrFail([jti], req, reply))) return reply;

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

      // Re-read rather than using UPDATE ... RETURNING: on a retry the rows are
      // already revoked, so RETURNING would come back empty and the retry would
      // silently publish nothing. Everything still inside the replay window
      // gets published, every time.
      const toPublish = await db
        .select({ jti: tokenGrantTable.jti })
        .from(tokenGrantTable)
        .where(
          and(
            eq(tokenGrantTable.reservationId, id),
            isNotNull(tokenGrantTable.revokedAt),
            gt(tokenGrantTable.revokedAt, replayWindowStart()),
          ),
        );

      if (
        !(await publishOrFail(
          toPublish.map((r) => r.jti),
          req,
          reply,
        ))
      )
        return reply;

      return reply.code(204).send();
    },
  );
}
