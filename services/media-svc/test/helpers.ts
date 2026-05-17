import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../drizzle/migrations");

export interface TestCtx {
  container: StartedPostgreSqlContainer;
  pool: pg.Pool;
  databaseUrl: string;
}

export async function startTestPostgres(): Promise<TestCtx> {
  const container = await new PostgreSqlContainer("pgvector/pgvector:pg17")
    .withDatabase("dailytour")
    .withUsername("media_svc")
    .withPassword("test-password")
    .start();

  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl });

  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  await pool.query("CREATE SCHEMA IF NOT EXISTS media;");

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
      const sqlText = await readFile(resolve(MIGRATIONS_DIR, file), "utf8");
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

  return { container, pool, databaseUrl };
}

export async function stopTestPostgres(ctx: TestCtx): Promise<void> {
  await ctx.pool.end();
  await ctx.container.stop();
}

export async function truncateAssets(pool: pg.Pool): Promise<void> {
  await pool.query("TRUNCATE media.asset RESTART IDENTITY;");
}

export function setTestEnv(databaseUrl: string): void {
  process.env.MEDIA_SVC_DATABASE_URL = databaseUrl;
  process.env.MEDIA_SVC_INTERNAL_TOKEN = "test-internal-token-32-chars-pad-here-ok";
  // getSignedUrl() computes the signature locally — no network call to MinIO.
  // Use localhost:1 so accidental real calls fail fast.
  process.env.MINIO_ENDPOINT = "http://localhost:1";
  process.env.MINIO_ACCESS_KEY = "fakeaccesskey";
  process.env.MINIO_SECRET_KEY = "fakesecretkey";
  process.env.MINIO_BUCKET = "test-bucket";
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "warn";
  process.env.PORT = "8087";
}
