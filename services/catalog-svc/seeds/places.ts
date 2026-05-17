/* eslint-disable no-console, no-restricted-syntax */
// Loads the 28 São Miguel day-1 places by executing seeds/places-sao-miguel.sql.
// Idempotency lives in the SQL's ON CONFLICT DO NOTHING clauses; this loader
// just opens a pg connection, reads the file, and executes it as one statement.
// Prereq: `pnpm seed` (dev.ts) must run first to populate catalog.action +
// catalog.wish — the place_action_wish rows reference those FKs.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const DEV_DB_URL =
  process.env["CATALOG_SVC_DATABASE_URL"] ??
  "postgres://catalog_svc:change-me-please-catalog@localhost:27432/dailytour";

const HERE = dirname(fileURLToPath(import.meta.url));
const SQL_FILE = join(HERE, "places-sao-miguel.sql");

async function main(): Promise<void> {
  console.log(`[seed:places] reading ${SQL_FILE}`);
  const sql = await readFile(SQL_FILE, "utf8");

  const pool = new Pool({ connectionString: DEV_DB_URL });
  try {
    console.log(`[seed:places] applying SQL to ${DEV_DB_URL.replace(/:[^:@]+@/, ":***@")}`);
    await pool.query(sql);
    const { rows } = await pool.query<{ places: string; tags: string; media: string }>(
      `SELECT
        (SELECT COUNT(*)::text FROM catalog.place) AS places,
        (SELECT COUNT(*)::text FROM catalog.place_action_wish) AS tags,
        (SELECT COUNT(*)::text FROM catalog.place_media) AS media`,
    );
    const row = rows[0];
    console.log(
      `[seed:places] done — place=${row?.places} place_action_wish=${row?.tags} place_media=${row?.media}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error("[seed:places] failed:", err);
  process.exit(1);
});
