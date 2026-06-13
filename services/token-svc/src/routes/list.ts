import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { guestTable, reservationTable, tokenGrantTable } from "../db/schema.js";

const QuerySchema = z.object({ guesthouse_id: z.string().uuid().optional() });

// Per-reservation token state, derived from its grants:
//   active  — at least one non-revoked, non-expired grant exists
//   revoked — grants were issued but none is currently usable
//   none    — no grant has ever been issued
type TokenState = "none" | "active" | "revoked";

function deriveTokenState(activeGrants: number, totalGrants: number): TokenState {
  if (activeGrants > 0) return "active";
  if (totalGrants > 0) return "revoked";
  return "none";
}

export function listRoutes(app: FastifyInstance): void {
  // GET /v1/reservations[?guesthouse_id=]
  // Lists reservations (joined to guest for the display name) with each
  // reservation's current token state, so the backoffice can show issued /
  // revoked without an extra round-trip. Returns snake_case to match the
  // catalog-svc response convention the BFF proxies elsewhere.
  app.get("/v1/reservations", async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_guesthouse_id" });
    }
    const { guesthouse_id } = parsed.data;

    const db = getDb();
    const rows = await db
      .select({
        id: reservationTable.id,
        guesthouseId: reservationTable.guesthouseId,
        guestId: reservationTable.guestId,
        guestName: guestTable.displayName,
        checkin: reservationTable.checkin,
        checkout: reservationTable.checkout,
        partySize: reservationTable.partySize,
        locale: reservationTable.locale,
        status: reservationTable.status,
        activeGrants: sql<number>`cast(count(*) filter (where ${tokenGrantTable.revokedAt} is null and ${tokenGrantTable.expiresAt} > now()) as int)`,
        totalGrants: sql<number>`cast(count(${tokenGrantTable.jti}) as int)`,
      })
      .from(reservationTable)
      .innerJoin(guestTable, eq(reservationTable.guestId, guestTable.id))
      .leftJoin(tokenGrantTable, eq(tokenGrantTable.reservationId, reservationTable.id))
      .where(guesthouse_id ? eq(reservationTable.guesthouseId, guesthouse_id) : undefined)
      .groupBy(reservationTable.id, guestTable.displayName)
      .orderBy(reservationTable.checkin);

    const data = rows.map((r) => ({
      id: r.id,
      guesthouse_id: r.guesthouseId,
      guest_id: r.guestId,
      guest_name: r.guestName,
      checkin: r.checkin,
      checkout: r.checkout,
      party_size: r.partySize,
      locale: r.locale,
      status: r.status,
      token_state: deriveTokenState(r.activeGrants, r.totalGrants),
    }));

    return reply.code(200).send({ data });
  });
}
