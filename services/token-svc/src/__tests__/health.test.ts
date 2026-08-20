import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Set env BEFORE importing any module that calls loadConfig() at module load.
process.env.TOKEN_SVC_DATABASE_URL =
  process.env.TOKEN_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.JWT_SIGNING_KEY =
  process.env.JWT_SIGNING_KEY ?? "test-signing-key-do-not-use-min-32-chars-long";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8088";
// Required by the config schema; never dialled — these probes don't revoke.
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379/0";

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { resetJwtSecretCache } = await import("../lib/jwt.js");

describe("GET /health", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    resetJwtSecretCache();
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns ok + service name + version", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; service: string; version: string }>();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("token-svc");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
