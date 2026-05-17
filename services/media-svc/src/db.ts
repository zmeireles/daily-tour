import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
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
      process.env.MEDIA_SVC_DATABASE_URL ??
      "postgres://media_svc:change-me-please-media@localhost:27432/dailytour";
    cachedPool = new Pool({ connectionString: url });
  }
  return cachedPool;
}

export function getDb(): Db {
  cachedDb ??= drizzle(getPool());
  return cachedDb;
}

// Migrations folder ships in the Docker image at /app/drizzle/migrations.
// In dev/test (tsx), this resolves relative to src/db.ts → drizzle/migrations.
// In production (bundled to /app/dist/index.js), the same relative path
// → /app/drizzle/migrations (Dockerfile COPYs the migrations there).
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../drizzle/migrations");

// Custom migrator — drizzle's bundled migrator emits CREATE SCHEMA unconditionally,
// which requires DB-level CREATE. media_svc only owns the media schema.
// This migrator:
//   1. Ensures media.__drizzle_migrations exists.
//   2. Reads each SQL file from drizzle/migrations/ in lexical order.
//   3. Computes a hash; skips already-applied migrations.
//   4. Applies new migrations in a transaction.
export async function runMigrations(_db: Db = getDb()): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS media.__drizzle_migrations (
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
        "SELECT 1 FROM media.__drizzle_migrations WHERE hash = $1",
        [hash],
      );
      if (existing.rowCount && existing.rowCount > 0) continue;

      await client.query("BEGIN");
      try {
        const statements = sqlText
          .split(/-->\s*statement-breakpoint/g)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.query(
          "INSERT INTO media.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
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
