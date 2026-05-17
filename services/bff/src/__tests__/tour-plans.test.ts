import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  TEST_JWT_KEY,
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
const createMock = plannerClient.createTourPlan as ReturnType<typeof vi.fn>;
const getMock = plannerClient.getTourPlan as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);
const FIXTURE_JTI = "tour-plans-test-jti-abcdef1234567890ab";
const GUEST_ID = "aaaabbbb-0000-4000-8000-000000000001";
const PLAN_ID = "ccccdddd-0000-4000-8000-000000000001";

async function signJwt(payload: Record<string, unknown>, expSeconds: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(FIXTURE_JTI)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(SIGNING_KEY_BYTES);
}

describe("POST /v1/tour-plans + GET /v1/tour-plans/:planId", () => {
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
    createMock.mockReset();
    getMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("POST happy path — 201 with plan id + status=queued", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    createMock.mockResolvedValueOnce({ id: PLAN_ID, status: "queued", plan_payload: null });

    const res = await app.inject({
      method: "POST",
      url: "/v1/tour-plans",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      payload: {
        wishes: ["eat", "see"],
        duration_hours: 3,
        vehicle: "car",
        free_text: "I want to try local food",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; status: string }>();
    expect(body.id).toBe(PLAN_ID);
    expect(body.status).toBe("queued");
    expect(createMock).toHaveBeenCalledOnce();
    const callArg = createMock.mock.calls[0]![0] as {
      guestId: string;
      requestPayload: { wishes: string[]; duration_hours: number; vehicle: string };
    };
    expect(callArg.guestId).toBe(GUEST_ID);
    expect(callArg.requestPayload.wishes).toEqual(["eat", "see"]);
    expect(callArg.requestPayload.vehicle).toBe("car");
  });

  it("POST unauthenticated — 401 (auth plugin applies to /v1/tour-plans)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/tour-plans",
      headers: { "content-type": "application/json" },
      payload: { wishes: ["eat"], duration_hours: 2, vehicle: "car" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "unauthorized" });
  });

  it("POST planner-svc error — BFF returns 503", async () => {
    const { PlannerError } = await import("../lib/planner-client.js");
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    createMock.mockRejectedValueOnce(new PlannerError(503, "service unavailable"));

    const res = await app.inject({
      method: "POST",
      url: "/v1/tour-plans",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      payload: { wishes: ["eat"], duration_hours: 2, vehicle: "car" },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "planner_unavailable" });
  });

  it("GET happy path — returns plan with status", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    getMock.mockResolvedValueOnce({ id: PLAN_ID, status: "ready", plan_payload: { stops: [] } });

    const res = await app.inject({
      method: "GET",
      url: `/v1/tour-plans/${PLAN_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; status: string }>();
    expect(body.id).toBe(PLAN_ID);
    expect(body.status).toBe("ready");
  });

  it("GET not found — 404", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    getMock.mockResolvedValueOnce(null);

    const res = await app.inject({
      method: "GET",
      url: `/v1/tour-plans/${PLAN_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "not_found" });
  });

  it("GET planner-svc error — BFF returns 503", async () => {
    const { PlannerError } = await import("../lib/planner-client.js");
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    getMock.mockRejectedValueOnce(new PlannerError(500, "internal error"));

    const res = await app.inject({
      method: "GET",
      url: `/v1/tour-plans/${PLAN_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "planner_unavailable" });
  });
});
