import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

export type Db = NodePgDatabase<Record<string, never>>;

let cachedPool: pg.Pool | undefined;
let cachedDb: Db | undefined;

export function getPool(): pg.Pool {
  if (!cachedPool) {
    const url =
      process.env.CATALOG_SVC_DATABASE_URL ??
      "postgres://catalog_svc:change-me-please-catalog@localhost:27432/dailytour";
    cachedPool = new Pool({ connectionString: url });
  }
  return cachedPool;
}

export function getDb(): Db {
  cachedDb ??= drizzle(getPool());
  return cachedDb;
}

// Migrations folder ships in the Docker image at /app/drizzle/migrations.
// In dev/test (tsx), this resolves relative to the source file at
// services/catalog-svc/src/db/client.ts → services/catalog-svc/drizzle/migrations.
// In production (bundled to /app/dist/index.js), the same relative path
// → /app/drizzle/migrations (the Dockerfile COPYs the migrations there).
const __dirname = dirname(fileURLToPath(import.meta.url));
// Dev (src/db/client.ts) → up two levels; prod (bundled dist/index.js) → up one.
// Try the prod layout first since it's the runtime path; fall back to dev.
const MIGRATIONS_DIR = (() => {
  const prod = resolve(__dirname, "../drizzle/migrations");
  const dev = resolve(__dirname, "../../drizzle/migrations");
  return existsSync(prod) ? prod : dev;
})();

// Custom migrator — drizzle's bundled migrator unconditionally emits
// `CREATE SCHEMA IF NOT EXISTS` for both the data and tracking schemas,
// which requires DB-level CREATE. catalog_svc only owns the catalog
// schema (least-privilege per docs/exploration/03-architecture.md §4)
// and intentionally doesn't have DB CREATE.
//
// This migrator:
//   1. Ensures catalog.__drizzle_migrations exists (TABLE-level perm,
//      which catalog_svc has on its own schema).
//   2. Reads each SQL file from drizzle/migrations/ in lexical order.
//   3. Computes a hash of the file contents; skips already-applied ones.
//   4. Applies new migrations inside a transaction.
export async function runMigrations(_db: Db = getDb()): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS catalog.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const rawSql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      // Hash the raw file so migrations stay stable across cleanup tweaks.
      const hash = createHash("sha256").update(rawSql, "utf8").digest("hex");
      // Skip `CREATE SCHEMA IF NOT EXISTS "<name>";` lines drizzle-kit auto-
      // emits for every pgSchema target. Schemas already exist (created by
      // infra/postgres/init/01-schemas.sql); catalog_svc lacks DB CREATE
      // (least-privilege per docs/exploration/03-architecture.md §4).
      // Test helpers that lack init scripts must create schemas themselves.
      const sqlText = rawSql.replace(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+"?\w+"?\s*;\s*/gi, "");

      const existing = await client.query(
        "SELECT 1 FROM catalog.__drizzle_migrations WHERE hash = $1",
        [hash],
      );
      if (existing.rowCount && existing.rowCount > 0) continue;

      await client.query("BEGIN");
      try {
        // drizzle-kit splits multi-statement files with `--> statement-breakpoint`.
        const statements = sqlText
          .split(/-->\s*statement-breakpoint/g)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.query(
          "INSERT INTO catalog.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [hash, Date.now()],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = undefined;
    cachedDb = undefined;
  }
}
