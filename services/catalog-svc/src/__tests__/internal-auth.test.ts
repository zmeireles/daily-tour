import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Boots the app with a known token but NO database — every data route reaches
// the auth hook before it would touch Postgres, so an unauthorised request is
// rejected without a DB. That is the whole point: the guard runs first.
process.env.CATALOG_SVC_DATABASE_URL =
  process.env.CATALOG_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8081";
const TOKEN = "test-catalog-internal-token-32-chars-ok";
process.env.CATALOG_SVC_INTERNAL_TOKEN = TOKEN;

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");

describe("internal-auth gate (dt-tests #36)", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  // ── the finding this closes ──────────────────────────────────────────────
  it("REJECTS a data request with no token — 401, and never reaches the DB", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/places" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  it("REJECTS a wrong token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/places",
      headers: { "x-internal-token": "not-the-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  // ── the controls: the gate must not reject everything, or a 401 means nothing ─
  it("lets a correctly-tokenised request THROUGH the gate (past 401)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/places",
      headers: { "x-internal-token": TOKEN },
    });
    // With no reachable DB the handler 500s/503s — the point is it is NOT 401,
    // i.e. the gate let it pass. A 401 here would mean the guard rejects even a
    // valid token, which is the opposite failure.
    expect(res.statusCode).not.toBe(401);
  });

  it("leaves /health open — Docker's healthcheck sends no header", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("ok");
  });

  it("leaves /ready open even for an unauthenticated probe", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    // 200 or 503 depending on DB reachability — the point is it is not 401.
    expect(res.statusCode).not.toBe(401);
  });

  it("still guards a route that carries a query string (path is split off)", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/places?limit=2" });
    expect(res.statusCode).toBe(401);
  });
});
