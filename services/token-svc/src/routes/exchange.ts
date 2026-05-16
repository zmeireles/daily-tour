import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { guestTable, reservationTable, tokenGrantTable } from "../db/schema.js";
import { hashOpaqueToken } from "../lib/opaque-token.js";
import { signReservationJwt } from "../lib/jwt.js";

// 1h refresh cycle. JWT `exp` = min(checkout + 24h, now + 1h).
const REFRESH_SECONDS = 60 * 60;

const ParamsSchema = z.object({ opaque: z.string().min(1).max(128) });

function computeExpUnixSeconds(checkoutIsoDate: string): number {
  const nowUnix = Math.floor(Date.now() / 1000);
  const checkoutMidnight = Date.parse(`${checkoutIsoDate}T00:00:00Z`);
  const graceUnix = Math.floor((checkoutMidnight + 24 * 60 * 60 * 1000) / 1000);
  return Math.min(graceUnix, nowUnix + REFRESH_SECONDS);
}

export function exchangeRoutes(app: FastifyInstance): void {
  // GET /v1/tokens/:opaque/exchange
  // Looks up the grant by hashed-opaque, joins reservation + guest,
  // returns a signed JWT or 401 with a generic error (no PII leak).
  app.get(
    "/v1/tokens/:opaque/exchange",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const parsed = ParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(401).send({ error: "invalid_token" });
      }
      const { opaque } = parsed.data;
      const jti = hashOpaqueToken(opaque);

      const db = getDb();
      const [row] = await db
        .select({
          jti: tokenGrantTable.jti,
          revokedAt: tokenGrantTable.revokedAt,
          expiresAt: tokenGrantTable.expiresAt,
          reservationId: reservationTable.id,
          guesthouseId: reservationTable.guesthouseId,
          checkout: reservationTable.checkout,
          status: reservationTable.status,
          guestId: guestTable.id,
          locale: guestTable.locale,
        })
        .from(tokenGrantTable)
        .innerJoin(reservationTable, eq(tokenGrantTable.reservationId, reservationTable.id))
        .innerJoin(guestTable, eq(reservationTable.guestId, guestTable.id))
        .where(eq(tokenGrantTable.jti, jti))
        .limit(1);

      if (
        !row ||
        row.revokedAt !== null ||
        Date.parse(row.expiresAt) <= Date.now() ||
        !["confirmed", "checked_in"].includes(row.status)
      ) {
        return reply.code(401).send({ error: "invalid_token" });
      }

      const expUnix = computeExpUnixSeconds(row.checkout);
      const jwt = await signReservationJwt(
        {
          sub: row.guestId,
          rid: row.reservationId,
          gh: row.guesthouseId,
          locale: row.locale,
          jti: row.jti,
        },
        expUnix,
      );

      return reply.code(200).send({ jwt, exp: expUnix });
    },
  );
}
