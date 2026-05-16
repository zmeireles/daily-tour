import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";

const { Pool } = pg;

export type Db = NodePgDatabase<Record<string, never>>;

let cachedPool: pg.Pool | undefined;
let cachedDb: Db | undefined;

export function getPool(): pg.Pool {
  if (!cachedPool) {
    const config = loadConfig();
    cachedPool = new Pool({ connectionString: config.TOKEN_SVC_DATABASE_URL });
  }
  return cachedPool;
}

export function getDb(): Db {
  cachedDb ??= drizzle(getPool());
  return cachedDb;
}

// Migrations folder ships in the Docker image at /app/drizzle/migrations.
// In dev/test (tsx + vitest), this resolves relative to the source file at
// services/token-svc/src/db/client.ts → services/token-svc/drizzle/migrations.
// In production (bundled to /app/dist/index.js), the same relative path
// → /app/drizzle/migrations (the Dockerfile COPYs the migrations there).
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../drizzle/migrations");

// Custom migrator — drizzle's bundled migrator unconditionally emits
// `CREATE SCHEMA IF NOT EXISTS` for both the data and tracking schemas,
// which requires DB-level CREATE. token_svc only owns the auth_tokens
// schema (least-privilege per docs/exploration/03-architecture.md §4)
// and intentionally doesn't have DB CREATE.
//
// This migrator:
//   1. Ensures auth_tokens.__drizzle_migrations exists (TABLE-level perm,
//      which token_svc has on its own schema).
//   2. Reads each SQL file from drizzle/migrations/ in lexical order.
//   3. Computes a hash of the file contents; skips already-applied ones.
//   4. Applies new migrations inside a transaction.
//
// The hash format is compatible with drizzle-kit's own tracking so a future
// switch to drizzle-orm's migrator (once it supports a "don't create schemas"
// flag) is a drop-in replacement.
export async function runMigrations(_db: Db = getDb()): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_tokens.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const sqlText = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      const hash = createHash("sha256").update(sqlText, "utf8").digest("hex");

      const existing = await client.query(
        "SELECT 1 FROM auth_tokens.__drizzle_migrations WHERE hash = $1",
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
          "INSERT INTO auth_tokens.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
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
