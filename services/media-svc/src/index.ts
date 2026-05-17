import "./instrumentation.js"; // MUST be first

import { createApp } from "./server.js";
import { loadConfig } from "./config.js";
import { closePool, runMigrations } from "./db.js";
import { getS3Client, ensureBucket } from "./lib/s3.js";

async function main(): Promise<void> {
  const config = loadConfig();

  // Idempotent: custom migrator tracks state in `media.__drizzle_migrations`.
  await runMigrations();

  // Self-heal: create the media bucket if it does not exist.
  await ensureBucket(getS3Client(), config.MINIO_BUCKET);

  const app = await createApp();
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`media-svc listening on http://${config.HOST}:${config.PORT}`);

  const shutdown = async (sig: string): Promise<void> => {
    app.log.info(`media-svc received ${sig}, shutting down`);
    await app.close();
    await closePool();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("media-svc failed to start:", err);
  process.exit(1);
});
