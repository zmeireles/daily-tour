import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Set env BEFORE importing any module that calls loadConfig() at module load.
process.env.MEDIA_SVC_DATABASE_URL =
  process.env.MEDIA_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "test-access-key";
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "test-secret-key";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8087";
const TOKEN = "test-media-internal-token-32-chars-ok";
process.env.MEDIA_SVC_INTERNAL_TOKEN = TOKEN;

vi.mock("../db.js", () => ({
  getPool: () => ({ query: () => Promise.resolve() }),
  getDb: () => ({}),
  runMigrations: () => Promise.resolve(),
  closePool: () => Promise.resolve(),
}));

vi.mock("../lib/mq.js", () => ({
  isBrokerConnected: () => false,
  publishMediaUploaded: () => Promise.resolve(),
  closeMqPublisher: () => Promise.resolve(),
}));

const { createApp } = await import("../server.js");
const { resetConfigCache } = await import("../config.js");

describe("internal-auth gate (media-svc is deny-by-default)", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  // ── the finding this closes ──────────────────────────────────────────────
  // Measured on qual 2026-08-23 from dt_notif_svc (not the BFF, on dt_internal):
  //   GET /v1/assets/<id> with no header -> 302 + presigned MinIO GET URL.
  // The route carried a comment calling the presigned URL "the access control
  // mechanism"; it bounds a leak, it does not decide who may ask for one.
  it("REJECTS GET /v1/assets/:id with no token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/assets/c65a24b1-730d-4be4-84cf-2a7b8aa843c4",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  it("REJECTS GET /v1/assets/:id with a wrong token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/assets/c65a24b1-730d-4be4-84cf-2a7b8aa843c4",
      headers: { "x-internal-token": "not-the-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("REJECTS the upload routes with no token", async () => {
    for (const url of ["/v1/uploads/sign", "/v1/uploads/complete"]) {
      const res = await app.inject({ method: "POST", url, payload: {} });
      expect(res.statusCode, url).toBe(401);
    }
  });

  // ── the controls: a gate that rejects everything proves nothing ───────────
  it("lets a correctly-tokenised request THROUGH the gate (past 401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: { "x-internal-token": TOKEN },
      payload: { mime_type: "image/png", size_bytes: 10 },
    });
    // 400 (missing x-owner-id) is the handler talking — the point is NOT 401,
    // i.e. the gate let a valid token pass. A 401 here would be the opposite
    // failure: a guard that rejects even its legitimate caller.
    expect(res.statusCode).not.toBe(401);
  });

  it("leaves /health open — Docker's healthcheck sends no header", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("ok");
  });

  it("leaves /ready open even for an unauthenticated probe", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).not.toBe(401);
  });

  it("still guards a route that carries a query string (path is split off)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/assets/abc?download=1" });
    expect(res.statusCode).toBe(401);
  });

  // ── the test that prevents the NEXT occurrence ────────────────────────────
  // The original defect was not a wrong route, it was a wrong DEFAULT: auth was
  // opt-in per route, so a new route was unauthenticated by omission and no
  // test failed. This asserts the default itself. Registering a route that
  // deliberately declares NO preHandler is what the careless future commit
  // looks like; under the service-wide hook it is still 401.
  it("protects a NEWLY ADDED route that declares no preHandler at all", async () => {
    resetConfigCache();
    const fresh = await createApp();
    fresh.get("/v1/some-future-route", () => ({ secret: "leaked" }));
    await fresh.ready();

    const denied = await fresh.inject({ method: "GET", url: "/v1/some-future-route" });
    expect(denied.statusCode).toBe(401);

    // positive control: the same route IS reachable with the token, so the 401
    // above is the gate and not a routing mistake.
    const allowed = await fresh.inject({
      method: "GET",
      url: "/v1/some-future-route",
      headers: { "x-internal-token": TOKEN },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toEqual({ secret: "leaked" });

    await fresh.close();
  });
});
