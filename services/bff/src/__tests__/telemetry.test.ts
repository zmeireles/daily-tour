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

vi.mock("../lib/analytics-db.js", () => ({
  insertTourEvent: vi.fn().mockResolvedValue(undefined),
}));

const analyticsDb = await import("../lib/analytics-db.js");
const insertMock = analyticsDb.insertTourEvent as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);
const FIXTURE_JTI = "telemetry-test-jti-abcdef1234567890ab";
const GUEST_ID = "aaaabbbb-0000-4000-8000-000000000002";
const PLAN_ID = "ccccdddd-0000-4000-8000-000000000002";

async function signJwt(payload: Record<string, unknown>, expSeconds: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(FIXTURE_JTI)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(SIGNING_KEY_BYTES);
}

describe("POST /v1/telemetry/tour", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    app = await createApp();
    await app.ready();
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    insertMock.mockReset();
    insertMock.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("happy path — 204 and insertTourEvent called with correct args", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);

    const res = await app.inject({
      method: "POST",
      url: "/v1/telemetry/tour",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      payload: { event_type: "tour.started", plan_id: PLAN_ID },
    });

    expect(res.statusCode).toBe(204);
    expect(insertMock).toHaveBeenCalledOnce();
    const arg = insertMock.mock.calls[0]![0] as {
      eventType: string;
      planId: string;
      guestId: string;
    };
    expect(arg.eventType).toBe("tour.started");
    expect(arg.planId).toBe(PLAN_ID);
    expect(arg.guestId).toBe(GUEST_ID);
  });

  it("unauthenticated — 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/telemetry/tour",
      headers: { "content-type": "application/json" },
      payload: { event_type: "tour.started" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "unauthorized" });
  });
});
