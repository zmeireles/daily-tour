import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { dirname, resolve } from "node:path";
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

export async function runMigrations(db: Db = getDb()): Promise<void> {
  // drizzle's migrator is idempotent — it tracks state in `drizzle.__drizzle_migrations`.
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

export async function closePool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = undefined;
    cachedDb = undefined;
  }
}
