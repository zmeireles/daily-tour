import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Set env BEFORE importing app.js — config validates on load.
process.env.JWT_SIGNING_KEY = "test-signing-key-do-not-use-min-32-chars-long";
process.env.REDIS_URL = "redis://localhost:1/0";
process.env.TOKEN_SVC_URL = "http://localhost:1";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8080";

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

  it("returns 200 with ok status, bff service tag, and version", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string; service: string; version: string }>()).toEqual({
      status: "ok",
      service: "bff",
      version: "0.0.0",
    });
  });
});
