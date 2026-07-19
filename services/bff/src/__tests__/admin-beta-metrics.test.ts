import Fastify, { type FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet } from "jose";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminBetaMetricsRoute from "../routes/admin-beta-metrics.js";
import {
  type AuthentikTestKeypair,
  makeAuthentikKeypair,
  signOwnerJwt,
} from "./authentik-keypair.js";
import { type TestRedisCtx, setTestEnv, startTestRedis, stopTestRedis } from "./helpers.js";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");
const { getBetaMetrics, setAnalyticsPoolForTest } = await import("../lib/analytics-db.js");

// The views KPI is the only one now backed by analytics.tour_event: the grouped
// scan returns { period, cnt } rows (no event_type — the query filters to
// tour.started internally).
type ViewRow = { period: "current" | "previous"; cnt: string };

// A pg.Pool stand-in whose single .query resolves the given view rows —
// no real database is touched.
function fakePool(rows: ViewRow[]): { pool: Pool; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValue({ rows });
  return { pool: { query } as unknown as Pool, query };
}

// Reservations now come from token-svc over HTTP; stub global fetch. `created_at`
// timestamps are relative to real time so the current/previous window bucketing
// exercises for real.
const fetchMock = vi.fn();
function reservationsOk(items: { created_at: string; status?: string }[]) {
  return { ok: true, json: () => Promise.resolve({ data: items }) };
}
function messagesOk(current: number, previous: number) {
  return { ok: true, json: () => Promise.resolve({ current, previous }) };
}
function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

// Reservations (token-svc) and messages (chat-hub) both go over fetch now —
// route by URL so each can be stubbed / failed independently.
function routeFetch(opts: {
  reservations?: unknown;
  messages?: unknown;
  reservationsReject?: boolean;
  messagesReject?: boolean;
}): void {
  fetchMock.mockImplementation((url: unknown) => {
    if (String(url).includes("/v1/messages/count")) {
      return opts.messagesReject
        ? Promise.reject(new Error("chat-hub down"))
        : Promise.resolve(opts.messages ?? messagesOk(0, 0));
    }
    return opts.reservationsReject
      ? Promise.reject(new Error("token-svc down"))
      : Promise.resolve(opts.reservations ?? reservationsOk([]));
  });
}

describe("getBetaMetrics (analytics-db)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // Default: token-svc returns no reservations (available, value 0).
    fetchMock.mockResolvedValue(reservationsOk([]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    setAnalyticsPoolForTest(undefined);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("computes value + previous + deltaPct for views + reservations + conversion", async () => {
    const { pool, query } = fakePool([
      { period: "current", cnt: "100" },
      { period: "previous", cnt: "80" },
    ]);
    setAnalyticsPoolForTest(pool);
    // rangeDays 7 → current window [now-7d, now]; previous [now-14d, now-7d).
    fetchMock.mockResolvedValue(
      reservationsOk([
        { created_at: daysAgoISO(1) }, // current
        { created_at: daysAgoISO(3) }, // current
        { created_at: daysAgoISO(6) }, // current
        { created_at: daysAgoISO(9) }, // previous
        { created_at: daysAgoISO(12) }, // previous
        { created_at: daysAgoISO(30) }, // older — excluded
      ]),
    );

    const metrics = await getBetaMetrics({ rangeDays: 7 });

    expect(metrics.range_days).toBe(7);
    // Range is threaded to the views query as the first bind param.
    expect(query.mock.calls[0][1][0]).toBe(7);

    expect(metrics.views).toEqual({ value: 100, previous: 80, deltaPct: 25, available: true });
    expect(metrics.reservations).toEqual({ value: 3, previous: 2, deltaPct: 50, available: true });
    // conversion = reservations / views, as a [0,1] ratio: 3/100 vs 2/80.
    expect(metrics.conversion).toEqual({
      value: 0.03,
      previous: 0.025,
      deltaPct: 20,
      available: true,
    });
  });

  it("reports the messages KPI from chat-hub counts (value + previous + deltaPct)", async () => {
    const { pool } = fakePool([]);
    setAnalyticsPoolForTest(pool);
    routeFetch({ messages: messagesOk(12, 8) });

    const metrics = await getBetaMetrics({ rangeDays: 30 });

    expect(metrics.messages).toEqual({ value: 12, previous: 8, deltaPct: 50, available: true });
  });

  it("marks messages unavailable when chat-hub is down — views/reservations intact", async () => {
    const { pool } = fakePool([
      { period: "current", cnt: "10" },
      { period: "previous", cnt: "10" },
    ]);
    setAnalyticsPoolForTest(pool);
    routeFetch({
      reservations: reservationsOk([{ created_at: daysAgoISO(1) }]),
      messagesReject: true,
    });

    const metrics = await getBetaMetrics({ rangeDays: 7 });

    // A chat-hub outage marks only messages unavailable — never blanks the rest.
    expect(metrics.messages.available).toBe(false);
    expect(metrics.views.available).toBe(true);
    expect(metrics.reservations).toMatchObject({ value: 1, available: true });
  });

  it("marks messages unavailable on a malformed chat-hub body (not a fabricated 0)", async () => {
    const { pool } = fakePool([]);
    setAnalyticsPoolForTest(pool);
    routeFetch({ messages: { ok: true, json: () => Promise.resolve({}) } });

    const metrics = await getBetaMetrics({ rangeDays: 30 });

    expect(metrics.messages.available).toBe(false);
  });

  it("marks messages unavailable on a null-valued chat-hub body (Number(null)===0 guard)", async () => {
    const { pool } = fakePool([]);
    setAnalyticsPoolForTest(pool);
    routeFetch({
      messages: { ok: true, json: () => Promise.resolve({ current: null, previous: null }) },
    });

    const metrics = await getBetaMetrics({ rangeDays: 30 });

    // null would coerce to a finite 0 under Number(); the typeof guard rejects it
    // so the tile shows "sem dados", not a fabricated 0.
    expect(metrics.messages.available).toBe(false);
  });

  it("excludes cancelled reservations from the count", async () => {
    const { pool } = fakePool([{ period: "current", cnt: "100" }]);
    setAnalyticsPoolForTest(pool);
    routeFetch({
      reservations: reservationsOk([
        { created_at: daysAgoISO(1), status: "confirmed" },
        { created_at: daysAgoISO(2), status: "cancelled" }, // excluded
        { created_at: daysAgoISO(3), status: "checked_in" },
      ]),
    });

    const metrics = await getBetaMetrics({ rangeDays: 7 });

    // 2 counted (confirmed + checked_in); the cancelled row is dropped.
    expect(metrics.reservations.value).toBe(2);
  });

  it("returns deltaPct null when the previous period is 0 (no divide-by-zero)", async () => {
    const { pool } = fakePool([{ period: "current", cnt: "8" }]);
    setAnalyticsPoolForTest(pool);

    const metrics = await getBetaMetrics({ rangeDays: 30 });

    expect(metrics.views).toEqual({ value: 8, previous: 0, deltaPct: null, available: true });
  });

  it("marks conversion unavailable when there are no views (no fabricated 0% beside real reservations)", async () => {
    const { pool } = fakePool([]); // no views
    setAnalyticsPoolForTest(pool);
    fetchMock.mockResolvedValue(reservationsOk([{ created_at: daysAgoISO(1) }]));

    const metrics = await getBetaMetrics({ rangeDays: 30 });

    // 1 reservation, 0 views → conversion is undefined, shown as "sem dados",
    // never "0%".
    expect(metrics.conversion.available).toBe(false);
    expect(metrics.views.value).toBe(0);
    expect(metrics.reservations.value).toBe(1);
  });

  it("degrades gracefully when token-svc is down — reservations/conversion unavailable, views intact", async () => {
    const { pool } = fakePool([
      { period: "current", cnt: "42" },
      { period: "previous", cnt: "40" },
    ]);
    setAnalyticsPoolForTest(pool);
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const metrics = await getBetaMetrics({ rangeDays: 7 });

    // A single downstream failure must NOT blank the whole dashboard.
    expect(metrics.views).toEqual({ value: 42, previous: 40, deltaPct: 5, available: true });
    expect(metrics.reservations.available).toBe(false);
    expect(metrics.conversion.available).toBe(false);
  });

  it("token-svc non-2xx → reservations unavailable", async () => {
    const { pool } = fakePool([]);
    setAnalyticsPoolForTest(pool);
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: () => Promise.resolve({}) });

    const metrics = await getBetaMetrics({ rangeDays: 30 });

    expect(metrics.reservations.available).toBe(false);
  });

  it("defaults to a 30-day range; empty data → honest available zeros", async () => {
    const { pool } = fakePool([]);
    setAnalyticsPoolForTest(pool);

    const metrics = await getBetaMetrics();

    expect(metrics.range_days).toBe(30);
    // Views + reservations succeeded with no rows → real, available zeros.
    expect(metrics.views).toEqual({ value: 0, previous: 0, deltaPct: null, available: true });
    expect(metrics.reservations).toEqual({
      value: 0,
      previous: 0,
      deltaPct: null,
      available: true,
    });
  });
});

async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });
  await app.register(adminBetaMetricsRoute);
  await app.ready();
  return app;
}

describe("BFF admin-beta-metrics route", () => {
  let app: FastifyInstance;
  let keypair: AuthentikTestKeypair;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    keypair = await makeAuthentikKeypair();
    app = await buildTestApp(keypair);
  });

  beforeEach(() => {
    // Every request resolves through a fake pool + stubbed token-svc — no real
    // DB, no real HTTP.
    setAnalyticsPoolForTest(fakePool([]).pool);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(reservationsOk([]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    setAnalyticsPoolForTest(undefined);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  async function ownerJwt(): Promise<string> {
    return signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
  }

  it("GET /v1/admin/beta-metrics — no auth → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/beta-metrics" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects an unknown range with 400", async () => {
    const jwt = await ownerJwt();
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/beta-metrics?range=1y",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "validation_failed" });
  });

  it("honors the range param → 200 with matching range_days", async () => {
    const { pool, query } = fakePool([]);
    setAnalyticsPoolForTest(pool);
    const jwt = await ownerJwt();

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/beta-metrics?range=7d",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ range_days: 7 });
    // 7d → 7 days threaded to the DB query.
    expect(query.mock.calls[0][1][0]).toBe(7);
  });

  it("defaults to a 30-day range when none is supplied", async () => {
    const jwt = await ownerJwt();
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/beta-metrics",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ range_days: 30 });
  });
});
