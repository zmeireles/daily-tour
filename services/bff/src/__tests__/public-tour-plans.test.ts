import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type TestRedisCtx,
  flushRedis,
  setTestEnv,
  startTestRedis,
  stopTestRedis,
} from "./helpers.js";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);

vi.mock("../lib/planner-client.js", () => ({
  PlannerError: class PlannerError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "PlannerError";
    }
  },
  createTourPlan: vi.fn(),
  getTourPlan: vi.fn(),
}));

const plannerClient = await import("../lib/planner-client.js");
const getMock = plannerClient.getTourPlan as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const PLAN_ID = "ddddeeee-0000-4000-8000-000000000001";

describe("GET /v1/public/tour-plans/:planId", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    process.env.PLANNER_SVC_URL = "http://localhost:1";
    app = await createApp();
    await app.ready();
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    getMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  // dt-tests #40 changed the contract: `ready` alone no longer grants access.
  // This test gained `shared_at` deliberately — without it the case now 404s,
  // which is the whole point of the card, not a regression.
  it("returns plan when status=ready AND the guest shared it (no auth required)", async () => {
    getMock.mockResolvedValueOnce({
      id: PLAN_ID,
      status: "ready",
      plan_payload: { stops: [] },
      shared_at: "2026-08-24T09:00:00.000Z",
    });

    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tour-plans/${PLAN_ID}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; status: string; plan_payload: unknown }>();
    expect(body.id).toBe(PLAN_ID);
    expect(body.status).toBe("ready");
    expect(body.plan_payload).toEqual({ stops: [] });
  });

  it("returns 404 when plan status is not ready", async () => {
    getMock.mockResolvedValueOnce({ id: PLAN_ID, status: "queued", plan_payload: null });

    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tour-plans/${PLAN_ID}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "not_found" });
  });

  // ── dt-tests #40 — the two cases that discriminate ────────────────────────
  // Both FAIL against the pre-#40 code, which returned 200 for any ready plan.
  // A test asserting only "a shared plan loads" would pass either way and prove
  // nothing, because the old route served everything.

  it("returns 404 for a ready plan the guest never shared", async () => {
    getMock.mockResolvedValueOnce({
      id: PLAN_ID,
      status: "ready",
      plan_payload: { stops: [] },
      shared_at: null,
    });

    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tour-plans/${PLAN_ID}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "not_found" });
  });

  it("returns 404 once the guest revokes a previously shared plan", async () => {
    // Revocation clears shared_at, so the link that worked a moment ago stops
    // working — the half of the feature a guest reaches for when a link escapes.
    getMock.mockResolvedValueOnce({
      id: PLAN_ID,
      status: "ready",
      plan_payload: { stops: [] },
      shared_at: null,
    });

    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tour-plans/${PLAN_ID}`,
    });

    expect(res.statusCode).toBe(404);
  });

  it("treats a missing shared_at field as private, not as shared", async () => {
    // Fail-closed check: planner-svc omitting the field entirely (an older
    // build, a partial response) must NOT be read as permission to publish.
    getMock.mockResolvedValueOnce({ id: PLAN_ID, status: "ready", plan_payload: { stops: [] } });

    const res = await app.inject({
      method: "GET",
      url: `/v1/public/tour-plans/${PLAN_ID}`,
    });

    expect(res.statusCode).toBe(404);
  });
});
