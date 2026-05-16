/* eslint-disable no-console, no-restricted-syntax */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { guestTable, reservationTable } from "../db/schema.js";

const DEV_DB_URL =
  process.env.TOKEN_SVC_DATABASE_URL ??
  "postgres://token_svc:change-me-please-token@localhost:5432/dailytour";

const GUESTHOUSE_TEST_UUID = "bbb00001-0000-4000-b000-000000000001";

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: DEV_DB_URL });
  const db = drizzle(pool);

  console.log("[seed] inserting 2 guests");
  await db
    .insert(guestTable)
    .values([
      {
        id: "aaa00001-0000-4000-a000-000000000001",
        displayName: "Test Guest EN",
        locale: "en",
        optInFlags: { marketing: false, analytics: false },
      },
      {
        id: "aaa00001-0000-4000-a000-000000000002",
        displayName: "Test Guest PT",
        locale: "pt-PT",
        optInFlags: { marketing: true, analytics: false },
      },
    ])
    .onConflictDoNothing();

  console.log("[seed] inserting 2 reservations");
  await db
    .insert(reservationTable)
    .values([
      {
        guesthouseId: GUESTHOUSE_TEST_UUID,
        guestId: "aaa00001-0000-4000-a000-000000000001",
        checkin: "2026-06-01",
        checkout: "2026-06-05",
        partySize: 2,
        locale: "en",
        status: "confirmed",
      },
      {
        guesthouseId: GUESTHOUSE_TEST_UUID,
        guestId: "aaa00001-0000-4000-a000-000000000002",
        checkin: "2026-07-10",
        checkout: "2026-07-15",
        partySize: 4,
        locale: "pt-PT",
        status: "confirmed",
      },
    ])
    .onConflictDoNothing();

  await pool.end();
  console.log("[seed] done");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
