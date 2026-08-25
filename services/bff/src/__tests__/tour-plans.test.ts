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
  getPublicTourPlan: vi.fn(),
  setTourPlanShared: vi.fn(),
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
  fetchPlaceHydrated: vi.fn(),
}));

const plannerClient = await import("../lib/planner-client.js");
const createMock = plannerClient.createTourPlan as ReturnType<typeof vi.fn>;
const getMock = plannerClient.getTourPlan as ReturnType<typeof vi.fn>;
const shareMock = plannerClient.setTourPlanShared as ReturnType<typeof vi.fn>;
const catalogClient = await import("../lib/catalog-client.js");
const fetchPlaceMock = catalogClient.fetchPlaceHydrated as ReturnType<typeof vi.fn>;
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
    shareMock.mockReset();
    fetchPlaceMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("POST happy path — 201 with plan id + status=queued", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt(
      { sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "pt-PT" },
      futureExp,
    );
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
      reservationId?: string;
      locale?: string;
      requestPayload: { wishes: string[]; duration_hours: number; vehicle: string };
    };
    expect(callArg.guestId).toBe(GUEST_ID);
    // The JWT `rid` claim is forwarded as the real reservation_id (#147).
    expect(callArg.reservationId).toBe("res-1");
    // The JWT `locale` claim is forwarded so the planner writes localized rationales.
    expect(callArg.locale).toBe("pt-PT");
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

  it("GET ready plan — plan_payload.stops is populated and enriched from catalog", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    const placeId = "c0000001-0000-4000-a000-000000000017";
    getMock.mockResolvedValueOnce({
      id: PLAN_ID,
      status: "ready",
      plan_payload: {
        steps: [
          {
            slot: "lunch",
            place_id: placeId,
            start: "2026-05-31T12:30:00Z",
            end: "2026-05-31T13:30:00Z",
            rationale: "Time to eat.",
            travel_to_minutes: 5,
            locked: false,
          },
        ],
      },
    });
    fetchPlaceMock.mockResolvedValueOnce({
      id: placeId,
      name: { en: "Tasca da Praça" },
      media: [{ kind: "image", url: "https://cdn.example.com/tasca.jpg" }],
      geom_lat: 37.74,
      geom_lng: -25.68,
    });

    const res = await app.inject({
      method: "GET",
      url: `/v1/tour-plans/${PLAN_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      plan_payload: { steps: unknown[]; stops: Record<string, unknown>[] };
    }>();
    expect(body.plan_payload.steps).toHaveLength(1);
    expect(body.plan_payload.stops).toEqual([
      {
        id: placeId,
        time: "12:30",
        kind: "meal",
        name: "Tasca da Praça",
        description: "Time to eat.",
        hero_image_url: "https://cdn.example.com/tasca.jpg",
        geom_lat: 37.74,
        geom_lng: -25.68,
        duration_min: 60,
        travel_to_minutes: 5,
      },
    ]);
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

  // dt-tests #42 — the authed read was scoped by nothing: any valid token read
  // any plan by id. The two tests below are the ones that discriminate; "a guest
  // reads their own plan" above passed before the fix too, so it is a control.
  it("GET forwards the caller's JWT sub as the owner of the read", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    getMock.mockResolvedValueOnce({ id: PLAN_ID, status: "queued", plan_payload: null });

    await app.inject({
      method: "GET",
      url: `/v1/tour-plans/${PLAN_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(getMock).toHaveBeenCalledOnce();
    // Positional, because that is what planner-client's signature demands — a
    // caller that omits it does not compile.
    expect(getMock.mock.calls[0]).toEqual([PLAN_ID, GUEST_ID]);
  });

  it("GET another guest's plan — 404, not the plan", async () => {
    const OTHER_GUEST = "aaaabbbb-0000-4000-8000-00000000dead";
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt(
      { sub: OTHER_GUEST, rid: "res-9", gh: "gh-1", locale: "en" },
      futureExp,
    );
    // The fake answers like the planner-svc this card replaced: with NO scope
    // it serves the row to anyone. That asymmetry is deliberate and is what
    // makes this test discriminate — a BFF that drops the guest id gets a 200
    // here and turns it red. Measured: returning null for an absent scope
    // instead makes the test pass with the fix reverted, which is how the
    // first draft of it was inert.
    getMock.mockImplementation((planId: string, guestId?: string) => {
      if (planId !== PLAN_ID) return Promise.resolve(null);
      const servesEveryone = guestId === undefined;
      return Promise.resolve(
        servesEveryone || guestId === GUEST_ID
          ? { id: PLAN_ID, status: "queued", plan_payload: null }
          : null,
      );
    });

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

  // ── dt-tests #40 — the BFF share seam ─────────────────────────────────────
  // Added after a review gate proved this glue had ZERO discrimination: fully
  // SWAPPING the method mapping (POST→revoke, DELETE→share) left all 184 BFF
  // tests green. On a privacy boundary that is the worst kind of silent
  // failure — "Stop sharing" would GRANT public access. The client tests pin
  // the client's end of the contract and the planner tests pin the SQL;
  // nothing pinned the middle. These do.
  async function authed(method: "POST" | "DELETE", jwt: string) {
    return app.inject({
      method,
      url: `/v1/tour-plans/${PLAN_ID}/share`,
      headers: { authorization: `Bearer ${jwt}` },
    });
  }

  async function guestJwt(): Promise<string> {
    return signJwt(
      { sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "pt-PT" },
      Math.floor(Date.now() / 1000) + 3600,
    );
  }

  it("POST grants — passes shared=true and the JWT sub, never a body value", async () => {
    shareMock.mockResolvedValueOnce({
      id: PLAN_ID,
      status: "ready",
      shared_at: "2026-08-24T09:00:00.000Z",
    });

    const res = await authed("POST", await guestJwt());

    expect(res.statusCode).toBe(200);
    expect(shareMock).toHaveBeenCalledWith(PLAN_ID, GUEST_ID, true);
    expect(res.json<{ shared_at: string | null }>().shared_at).toBe("2026-08-24T09:00:00.000Z");
  });

  it("DELETE revokes — passes shared=false", async () => {
    // The paired half of the mutation that went undetected: if these two ever
    // swap, this assertion and the one above both fail.
    shareMock.mockResolvedValueOnce({ id: PLAN_ID, status: "ready", shared_at: null });

    const res = await authed("DELETE", await guestJwt());

    expect(res.statusCode).toBe(200);
    expect(shareMock).toHaveBeenCalledWith(PLAN_ID, GUEST_ID, false);
    expect(res.json<{ shared_at: string | null }>().shared_at).toBeNull();
  });

  it("ignores a guest_id in the request body — identity comes only from the JWT", async () => {
    // The PR claims the guest id is "never accepted from the body". That claim
    // had no test: a mutation forwarding `body.guest_id` when present passed
    // the whole suite. Without this, one guest could revoke another's share by
    // posting their id.
    shareMock.mockResolvedValueOnce({ id: PLAN_ID, status: "ready", shared_at: null });

    const res = await app.inject({
      method: "POST",
      url: `/v1/tour-plans/${PLAN_ID}/share`,
      headers: { authorization: `Bearer ${await guestJwt()}` },
      payload: { guest_id: "99999999-9999-4999-8999-999999999999" },
    });

    expect(res.statusCode).toBe(200);
    expect(shareMock).toHaveBeenCalledWith(PLAN_ID, GUEST_ID, true);
  });

  it("404 when planner-svc reports no such plan (or not this guest's)", async () => {
    shareMock.mockResolvedValueOnce(null);

    const res = await authed("POST", await guestJwt());

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "not_found" });
  });

  it("503 when planner-svc is unreachable", async () => {
    shareMock.mockRejectedValueOnce(new plannerClient.PlannerError(500, "planner-svc 500"));

    const res = await authed("POST", await guestJwt());

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "planner_unavailable" });
  });

  it("rejects an unauthenticated caller and never reaches planner-svc", async () => {
    // The route carries no `config.auth`, so it inherits the secure-by-default
    // guest gate. Asserting the mock stayed untouched proves the request was
    // stopped BEFORE any state could change, not merely that the status was 401.
    const res = await app.inject({
      method: "POST",
      url: `/v1/tour-plans/${PLAN_ID}/share`,
    });

    expect(res.statusCode).toBe(401);
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("400 on a malformed plan id, without calling planner-svc", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/tour-plans/not-a-uuid/share",
      headers: { authorization: `Bearer ${await guestJwt()}` },
    });

    expect(res.statusCode).toBe(400);
    expect(shareMock).not.toHaveBeenCalled();
  });
});
