import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { Redis } from "ioredis";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
    .withUsername("token_svc")
    .withPassword("test-password")
    .start();

  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl });

  // Bootstrap pgcrypto + auth_tokens schema, mirroring infra/postgres/init/.
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  await pool.query("CREATE SCHEMA IF NOT EXISTS auth_tokens;");

  await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });

  return { container, pool, databaseUrl };
}

export async function stopTestPostgres(ctx: TestContext): Promise<void> {
  await ctx.pool.end();
  await ctx.container.stop();
}

export async function truncateAll(pool: pg.Pool): Promise<void> {
  await pool.query(
    "TRUNCATE auth_tokens.token_grant, auth_tokens.reservation, auth_tokens.guest RESTART IDENTITY CASCADE;",
  );
}

export interface SeededFixtures {
  guestId: string;
  reservationId: string;
  guesthouseId: string;
  checkout: string;
  locale: string;
}

export async function seedFixtures(pool: pg.Pool): Promise<SeededFixtures> {
  const guestId = "11111111-1111-4111-8111-111111111111";
  const reservationId = "22222222-2222-4222-8222-222222222222";
  const guesthouseId = "33333333-3333-4333-8333-333333333333";
  const locale = "en";
  // Use a checkout date a year in the future to keep the grace window open
  // across multi-second test runs without sliding the year math.
  const checkout = "2099-12-31";

  await pool.query(
    `INSERT INTO auth_tokens.guest (id, display_name, locale, opt_in_flags)
     VALUES ($1, 'Test Guest', $2, '{"marketing":false,"analytics":false}'::jsonb)
     ON CONFLICT DO NOTHING`,
    [guestId, locale],
  );
  await pool.query(
    `INSERT INTO auth_tokens.reservation
       (id, guesthouse_id, guest_id, checkin, checkout, party_size, locale, status)
     VALUES ($1, $2, $3, '2099-12-25', $4, 2, $5, 'confirmed')
     ON CONFLICT DO NOTHING`,
    [reservationId, guesthouseId, guestId, checkout, locale],
  );

  return { guestId, reservationId, guesthouseId, checkout, locale };
}

// Test env setup must happen BEFORE the modules under test cache the config.
// Vitest's beforeAll runs after imports, so we set env vars here at top-level
// import time of the test file's first import of this helpers module.
// Revocation publishes to Redis, so any test that revokes must pass a real
// container URL. The default only has to PARSE — tests that never revoke never
// open a connection (getRedis() is lazy), and one that does without a container
// fails loudly with a 503 rather than quietly skipping the cache write.
export function setTestEnv(databaseUrl: string, redisUrl = "redis://127.0.0.1:6379/0"): void {
  process.env.TOKEN_SVC_DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = redisUrl;
  process.env.JWT_SIGNING_KEY =
    process.env.JWT_SIGNING_KEY ?? "test-signing-key-do-not-use-min-32-chars-long";
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "warn";
  // app.inject() doesn't bind, but loadConfig() validates PORT > 0.
  process.env.PORT = "8088";
}

// ─── Redis (JTI revocation cache) ────────────────────────────────────────
export interface TestRedisCtx {
  container: StartedRedisContainer;
  client: Redis;
  url: string;
}

export async function startTestRedis(): Promise<TestRedisCtx> {
  const container = await new RedisContainer("redis:7.4-alpine").start();
  const url = container.getConnectionUrl();
  const client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
  return { container, client, url };
}

export async function stopTestRedis(ctx: TestRedisCtx): Promise<void> {
  await ctx.client.quit().catch(() => undefined);
  await ctx.container.stop();
}

export async function flushRedis(client: Redis): Promise<void> {
  await client.flushall();
}
