import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Set env BEFORE importing any module that calls loadConfig() at module load.
process.env.MEDIA_SVC_DATABASE_URL =
  process.env.MEDIA_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "test-access-key";
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "test-secret-key";
process.env.MEDIA_SVC_INTERNAL_TOKEN =
  process.env.MEDIA_SVC_INTERNAL_TOKEN ?? "test-internal-token-min-32-chars-long-xx";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8087";

// Control getPool().query per-test: resolve → DB up (200), reject → DB down (503).
const query = vi.fn();
vi.mock("../db.js", () => ({
  getPool: () => ({ query }),
  getDb: () => ({}),
  runMigrations: () => Promise.resolve(),
  closePool: () => Promise.resolve(),
}));

// Control broker liveness reporting independently of the DB.
const brokerConnected = vi.fn(() => false);
vi.mock("../lib/mq.js", () => ({
  isBrokerConnected: () => brokerConnected(),
  publishMediaUploaded: () => Promise.resolve(),
  closeMqPublisher: () => Promise.resolve(),
}));

const { createApp } = await import("../server.js");
const { resetConfigCache } = await import("../config.js");

describe("GET /ready", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    query.mockReset();
    brokerConnected.mockReset();
    brokerConnected.mockReturnValue(false);
  });

  it("returns 503 not_ready when the DB is unreachable", async () => {
    query.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    const body = res.json<{ status: string; service: string; reason: string }>();
    expect(body.status).toBe("not_ready");
    expect(body.service).toBe("media-svc");
    expect(body.reason).toBe("db_unreachable");
  });

  it("returns 200 ready when the DB answers, reporting broker down", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    brokerConnected.mockReturnValue(false);
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      status: string;
      service: string;
      version: string;
      broker: string;
    }>();
    expect(body.status).toBe("ready");
    expect(body.service).toBe("media-svc");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.broker).toBe("down");
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  it("stays 200 ready and reports broker up when the connection is open", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    brokerConnected.mockReturnValue(true);
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; broker: string }>();
    expect(body.status).toBe("ready");
    expect(body.broker).toBe("up");
  });
});
