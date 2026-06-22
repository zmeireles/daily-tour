import "./instrumentation.js"; // MUST be first — bootstraps OTel before instrumented imports are loaded.

async function main(): Promise<void> {
  const { createApp } = await import("./app.js");
  const { loadConfig } = await import("./config.js");

  const config = loadConfig();
  const app = await createApp();
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`bff listening on http://${config.HOST}:${config.PORT}`);
}

main().catch((err) => {
  console.error("bff failed to start:", err);
  // eslint-disable-next-line no-restricted-syntax
  process.exit(1);
});
