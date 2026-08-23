import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../drizzle/migrations");

export interface TestContext {
  container: StartedPostgreSqlContainer;
  pool: pg.Pool;
  databaseUrl: string;
}

export async function startTestPostgres(): Promise<TestContext> {
  const container = await new PostgreSqlContainer("pgvector/pgvector:pg17")
    .withDatabase("dailytour")
    .withUsername("catalog_svc")
    .withPassword("test-password")
    .start();

  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl });

  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  await pool.query("CREATE SCHEMA IF NOT EXISTS catalog;");

  // Inline migrator that mirrors src/db/client.ts (avoids importing the source
  // module which reads CATALOG_SVC_DATABASE_URL at load time).
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
      const sqlText = await readFile(resolve(MIGRATIONS_DIR, file), "utf8");
      const hash = createHash("sha256").update(sqlText, "utf8").digest("hex");
      const existing = await client.query(
        "SELECT 1 FROM catalog.__drizzle_migrations WHERE hash = $1",
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

  // Sanity-check: drizzle().select() can connect.
  drizzle(pool);

  return { container, pool, databaseUrl };
}

export async function stopTestPostgres(ctx: TestContext): Promise<void> {
  await ctx.pool.end();
  await ctx.container.stop();
}

export async function truncateAll(pool: pg.Pool): Promise<void> {
  await pool.query(
    "TRUNCATE catalog.place_candidate, catalog.place_media, catalog.place_action_wish, catalog.place, catalog.owner_profile, catalog.guesthouse, catalog.wish, catalog.action RESTART IDENTITY CASCADE;",
  );
}

// Insert one reference action + wish for FK-satisfying tests (place_action_wish etc).
// A wish is required, not optional garnish: creating a place now demands at least one
// action+wish pair, and place_action_wish.wish_id is NOT NULL.
export async function seedReferenceData(
  pool: pg.Pool,
): Promise<{ actionId: string; wishId: string }> {
  const actionId = "11111111-1111-4111-8111-111111111111";
  const wishId = "22222222-2222-4222-8222-222222222222";
  await pool.query(
    `INSERT INTO catalog.action (id, slug, i18n, sort_order, icon)
     VALUES ($1, 'eat', '{"en":"Eat","pt-PT":"Comer"}'::jsonb, 0, 'utensils')
     ON CONFLICT DO NOTHING`,
    [actionId],
  );
  await pool.query(
    `INSERT INTO catalog.wish (id, action_id, slug, i18n, sort_order)
     VALUES ($1, $2, 'sea-view', '{"en":"Sea view","pt-PT":"Vista para o mar"}'::jsonb, 0)
     ON CONFLICT DO NOTHING`,
    [wishId, actionId],
  );
  return { actionId, wishId };
}

export function setTestEnv(databaseUrl: string): void {
  process.env.CATALOG_SVC_DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "warn";
  process.env.PORT = "8081";
  process.env.CATALOG_SVC_INTERNAL_TOKEN = TEST_INTERNAL_TOKEN;
}

// Shared by every DB-backed suite AND the internal-auth suite, so the token a
// test must send matches the one the app is configured with.
export const TEST_INTERNAL_TOKEN = "test-catalog-internal-token-32-chars-ok";
