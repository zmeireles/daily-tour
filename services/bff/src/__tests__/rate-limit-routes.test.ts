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

// Mock the downstream LLM/cost clients so the limiter tests never reach
// planner-svc / search-svc / catalog-svc. The first N requests under the cap
// resolve instantly; we only care about which request earns a 429.
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

vi.mock("../lib/catalog-client.js", () => ({
  CatalogError: class CatalogError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "CatalogError";
    }
  },
  fetchPlacesByAction: vi.fn(),
  fetchHiddenPlaceIds: vi.fn(),
  fetchPlaceHydrated: vi.fn(),
}));

const plannerClient = await import("../lib/planner-client.js");
const createMock = plannerClient.createTourPlan as ReturnType<typeof vi.fn>;
const catalogClient = await import("../lib/catalog-client.js");
const fetchByActionMock = catalogClient.fetchPlacesByAction as ReturnType<typeof vi.fn>;
const hiddenMock = catalogClient.fetchHiddenPlaceIds as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);

// The @fastify/rate-limit LocalStore is an in-memory LRU that is NOT reset
// between tests (flushRedis only clears the auth JTI cache). So each test mints
// a UNIQUE guest `sub` to get a fresh, isolated rate-limit bucket.
let guestCounter = 0;
function nextGuestId(): string {
  guestCounter += 1;
  return `aaaaaaaa-0000-4000-8000-${String(guestCounter).padStart(12, "0")}`;
}

async function signGuest(sub: string): Promise<string> {
  return await new SignJWT({ sub, rid: "res-1", gh: "gh-1", locale: "en" })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(`rl-${sub}`)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(SIGNING_KEY_BYTES);
}

const VALID_BODY = { wishes: ["eat", "see"], duration_hours: 3, vehicle: "car" };

describe("per-guest rate-limits (T-3.C.3)", () => {
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
    createMock.mockResolvedValue({ id: "plan-1", status: "queued", plan_payload: null });
    fetchByActionMock.mockReset();
    fetchByActionMock.mockResolvedValue([]);
    hiddenMock.mockReset();
    hiddenMock.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  function postPlan(jwt: string, payload: unknown = VALID_BODY) {
    return app.inject({
      method: "POST",
      url: "/v1/tour-plans",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      payload: payload as object,
    });
  }

  it("POST /v1/tour-plans — 6th request from the SAME guest is 429 (cap 5/min)", async () => {
    const jwt = await signGuest(nextGuestId());
    for (let i = 0; i < 5; i++) {
      const res = await postPlan(jwt);
      expect(res.statusCode).toBe(201);
    }
    const sixth = await postPlan(jwt);
    expect(sixth.statusCode).toBe(429);
    // retry-after / x-ratelimit-* headers signal the throttle to clients.
    expect(sixth.headers["retry-after"] ?? sixth.headers["x-ratelimit-reset"]).toBeDefined();
    expect(sixth.headers["x-ratelimit-limit"]).toBeDefined();
  });

  it("per-guest keying — guest A at the limit does NOT throttle guest B", async () => {
    const jwtA = await signGuest(nextGuestId());
    const jwtB = await signGuest(nextGuestId());

    // Exhaust guest A's budget.
    for (let i = 0; i < 5; i++) {
      expect((await postPlan(jwtA)).statusCode).toBe(201);
    }
    expect((await postPlan(jwtA)).statusCode).toBe(429);

    // Guest B still has a full, independent budget → not 429. Proves the
    // keyGenerator buckets per `sub`, not per shared req.ip.
    const resB = await postPlan(jwtB);
    expect(resB.statusCode).toBe(201);
  });

  it("POST /v1/tour-plans — body > 16 KB returns 413 (bodyLimit)", async () => {
    const jwt = await signGuest(nextGuestId());
    // 17 KB of free_text overshoots the 16384-byte bodyLimit. The limit is on
    // the raw request body, so this 413s before zod/handler ever runs.
    const oversized = { ...VALID_BODY, free_text: "x".repeat(17 * 1024) };
    const res = await postPlan(jwt, oversized);
    expect(res.statusCode).toBe(413);
  });

  it("POST /v1/tour-plans — a wishes element > 120 chars is a 400 validation error", async () => {
    const jwt = await signGuest(nextGuestId());
    const res = await postPlan(jwt, { ...VALID_BODY, wishes: ["x".repeat(121)] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "validation_failed" });
  });

  it("GET /v1/discover — per-guest limit fires at 30/min (31st is 429)", async () => {
    const jwt = await signGuest(nextGuestId());
    for (let i = 0; i < 30; i++) {
      const res = await app.inject({
        method: "GET",
        url: "/v1/discover?action=eat",
        headers: { authorization: `Bearer ${jwt}` },
      });
      expect(res.statusCode).toBe(200);
    }
    const over = await app.inject({
      method: "GET",
      url: "/v1/discover?action=eat",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(over.statusCode).toBe(429);
  });
});
