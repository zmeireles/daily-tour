import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Set env BEFORE importing any module that calls loadConfig() at module load.
process.env.TOKEN_SVC_DATABASE_URL =
  process.env.TOKEN_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.JWT_SIGNING_KEY =
  process.env.JWT_SIGNING_KEY ?? "test-signing-key-do-not-use-min-32-chars-long";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8088";

// Control getPool().query per-test: resolve → DB up (200), reject → DB down (503).
// Only getPool is exercised by /ready; the other exports are stubbed so app
// registration (which imports getDb/runMigrations/closePool) stays intact.
const query = vi.fn();
vi.mock("../db/client.js", () => ({
  getPool: () => ({ query }),
  getDb: () => ({}),
  runMigrations: () => Promise.resolve(),
  closePool: () => Promise.resolve(),
}));

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { resetJwtSecretCache } = await import("../lib/jwt.js");

describe("GET /ready", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    resetJwtSecretCache();
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    query.mockReset();
  });

  it("returns 503 not_ready when the DB is unreachable", async () => {
    query.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    const body = res.json<{ status: string; service: string; reason: string }>();
    expect(body.status).toBe("not_ready");
    expect(body.service).toBe("token-svc");
    expect(body.reason).toBe("db_unreachable");
  });

  it("returns 200 ready when the DB answers SELECT 1", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; service: string; version: string }>();
    expect(body.status).toBe("ready");
    expect(body.service).toBe("token-svc");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });
});
