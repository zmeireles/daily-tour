import "./instrumentation.js"; // MUST be first

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { closePool, runMigrations } from "./db/client.js";
import { closeRedis } from "./lib/redis.js";

async function main(): Promise<void> {
  const config = loadConfig();

  // Idempotent: drizzle migrator tracks state in `drizzle.__drizzle_migrations`.
  // Safe to re-run on every container start.
  await runMigrations();

  const app = await createApp();
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`token-svc listening on http://${config.HOST}:${config.PORT}`);

  const shutdown = async (sig: string): Promise<void> => {
    app.log.info(`token-svc received ${sig}, shutting down`);
    await app.close();
    await closePool();
    await closeRedis();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("token-svc failed to start:", err);
  process.exit(1);
});
