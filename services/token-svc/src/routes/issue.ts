import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { reservationTable, tokenGrantTable } from "../db/schema.js";
import { generateOpaqueToken, hashOpaqueToken } from "../lib/opaque-token.js";

// Stored grant.expires_at is the MAX-life of the credential — the grace
// window beyond checkout. The JWT's `exp` enforces a separate (shorter) 1h
// refresh cycle and is computed at exchange time.
function checkoutGraceUnixSeconds(checkoutIsoDate: string): number {
  // checkout is a YYYY-MM-DD date column; interpret as midnight UTC, add 24h.
  const checkoutMidnight = Date.parse(`${checkoutIsoDate}T00:00:00Z`);
  return Math.floor((checkoutMidnight + 24 * 60 * 60 * 1000) / 1000);
}

const ParamsSchema = z.object({ id: z.string().uuid() });

export function issueRoutes(app: FastifyInstance): void {
  // POST /v1/reservations/:id/token
  // Issues a new opaque token. Rate-limited per-IP to slow token-flood.
  app.post(
    "/v1/reservations/:id/token",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const parsed = ParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_reservation_id" });
      }
      const { id } = parsed.data;

      const db = getDb();
      const [reservation] = await db
        .select()
        .from(reservationTable)
        .where(eq(reservationTable.id, id))
        .limit(1);

      if (!reservation) {
        return reply.code(404).send({ error: "reservation_not_found" });
      }

      // Issuing tokens for finished stays is pointless; grace already past.
      const graceUnix = checkoutGraceUnixSeconds(reservation.checkout);
      const nowUnix = Math.floor(Date.now() / 1000);
      if (graceUnix <= nowUnix) {
        return reply.code(410).send({ error: "reservation_expired" });
      }

      const opaque = generateOpaqueToken();
      const jti = hashOpaqueToken(opaque);
      const expiresAt = new Date(graceUnix * 1000).toISOString();

      await db.insert(tokenGrantTable).values({
        jti,
        reservationId: reservation.id,
        expiresAt,
      });

      return reply.code(200).send({ token: opaque, expires_at: expiresAt });
    },
  );
}
