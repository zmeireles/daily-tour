import "./instrumentation.js"; // MUST be first — bootstraps OTel before instrumented imports are loaded.

async function main(): Promise<void> {
  const { createApp } = await import("./server.js");
  const { loadConfig } = await import("./config.js");
  const { closePool, runMigrations } = await import("./db.js");
  const { getS3Client, ensureBucket } = await import("./lib/s3.js");
  const { runTranscodeWorker } = await import("./workers/transcode.js");

  const config = loadConfig();

  // Idempotent: custom migrator tracks state in `media.__drizzle_migrations`.
  await runMigrations();

  // Self-heal: create the media bucket if it does not exist.
  await ensureBucket(getS3Client(), config.MINIO_BUCKET);

  const app = await createApp();
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`media-svc listening on http://${config.HOST}:${config.PORT}`);

  // Start transcode worker in-process. If RabbitMQ is unreachable at boot,
  // the HTTP server stays up and serves requests; transcode is unavailable.
  // Trade-off vs. separate container: simpler compose, no shared DB pool issue,
  // but horizontal scaling transcodes too (prefetch=4 caps per-instance concurrency).
  runTranscodeWorker().catch((err: unknown) => {
    app.log.error({ err }, "transcode worker failed to start; HTTP continues");
  });

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
