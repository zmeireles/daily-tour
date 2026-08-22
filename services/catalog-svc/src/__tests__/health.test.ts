import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.CATALOG_SVC_DATABASE_URL =
  process.env.CATALOG_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8081";
process.env.CATALOG_SVC_INTERNAL_TOKEN =
  process.env.CATALOG_SVC_INTERNAL_TOKEN ?? "test-catalog-internal-token-32-chars-ok";

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");

describe("GET /health", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns ok + service tag + version", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; service: string; version: string }>();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("catalog-svc");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
