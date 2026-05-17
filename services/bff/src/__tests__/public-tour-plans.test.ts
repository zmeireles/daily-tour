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

  it("returns plan when status=ready (no auth required)", async () => {
    getMock.mockResolvedValueOnce({ id: PLAN_ID, status: "ready", plan_payload: { stops: [] } });

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
});
