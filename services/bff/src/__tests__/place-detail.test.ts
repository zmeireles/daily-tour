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

// Mock catalog-client at the test boundary — BFF behaviour under test, not catalog-svc.
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
  fetchPlacesByAction: vi.fn(),
}));

vi.mock("../lib/ipma-client.js", () => ({
  isWeatherOkToday: vi.fn(),
}));

const catalogClient = await import("../lib/catalog-client.js");
const fetchMock = catalogClient.fetchPlaceHydrated as ReturnType<typeof vi.fn>;
const ipmaClient = await import("../lib/ipma-client.js");
const ipmaMock = ipmaClient.isWeatherOkToday as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);
const FIXTURE_JTI = "place-detail-test-jti-abcdef1234567890ab";

async function signJwt(payload: Record<string, unknown>, expSeconds: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(FIXTURE_JTI)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(SIGNING_KEY_BYTES);
}

const FIXTURE_PLACE_ID = "aabbccdd-0000-4000-8000-000000000099";

const FIXTURE_HYDRATED = {
  id: FIXTURE_PLACE_ID,
  guesthouse_scope: { all: true as const },
  name: { en: "Ocean View Café", "pt-PT": "Café Vista Mar" },
  description: { en: "A café with a view", "pt-PT": "Um café com vista" },
  geom_lat: 37.74,
  geom_lng: -25.66,
  address: "Ponta Delgada, Açores",
  contacts: {},
  hours: [],
  season: "summer" as const,
  status: "published",
  is_hosts_pick: true,
  source_kind: "manual",
  source_ref: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  media: [
    {
      id: "medaaaa-0000-4000-8000-000000000001",
      kind: "image",
      url: "https://example.com/img.jpg",
      alt: { en: "A café" },
      sort_order: 0,
    },
  ],
  actions: [{ slug: "eat", label_i18n: { en: "Eat", "pt-PT": "Comer" } }],
  wishes: [{ slug: "sea-view", action_slug: "eat", label_i18n: { en: "Sea view" } }],
};

describe("GET /v1/places/:id", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    app = await createApp();
    await app.ready();
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    fetchMock.mockReset();
    ipmaMock.mockReset();
    ipmaMock.mockResolvedValue(true);
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("happy authed — returns hydrated place with weather_ok_today from IPMA", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockResolvedValueOnce(FIXTURE_HYDRATED);

    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${FIXTURE_PLACE_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<typeof FIXTURE_HYDRATED & { weather_ok_today: boolean }>();
    expect(body.id).toBe(FIXTURE_PLACE_ID);
    // season passes through the BFF (catalog-svc /hydrated → ...place spread)
    expect(body.season).toBe("summer");
    expect(body.media).toHaveLength(1);
    expect(body.media[0]!.kind).toBe("image");
    expect(body.actions).toHaveLength(1);
    expect(body.actions[0]!.slug).toBe("eat");
    expect(body.wishes).toHaveLength(1);
    expect(body.wishes[0]!.action_slug).toBe("eat");
    expect(body.weather_ok_today).toBe(true);
  });

  it("unauth — 401 (onRoute hook applies authenticate to /v1/places/:id)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${FIXTURE_PLACE_ID}`,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "unauthorized" });
  });

  it("not found — catalog 404 → BFF 404", async () => {
    const { CatalogError } = await import("../lib/catalog-client.js");
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockRejectedValueOnce(new CatalogError(404, "not found"));

    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${FIXTURE_PLACE_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "place_not_found" });
  });

  it("catalog-svc 500 — BFF returns 503, no internal details leaked", async () => {
    const { CatalogError } = await import("../lib/catalog-client.js");
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockRejectedValueOnce(new CatalogError(500, "internal server error"));

    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${FIXTURE_PLACE_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json<{ error: string }>().error).toBe("catalog_unavailable");
  });

  it("dry day (precipitaProb < 60) — weather_ok_today is true", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockResolvedValueOnce(FIXTURE_HYDRATED);
    ipmaMock.mockResolvedValueOnce(true);

    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${FIXTURE_PLACE_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ weather_ok_today: boolean }>().weather_ok_today).toBe(true);
  });

  it("rainy day (precipitaProb >= 60) — weather_ok_today is false for outdoor place", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockResolvedValueOnce(FIXTURE_HYDRATED);
    ipmaMock.mockResolvedValueOnce(false);

    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${FIXTURE_PLACE_ID}`,
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ weather_ok_today: boolean }>().weather_ok_today).toBe(false);
  });
});
