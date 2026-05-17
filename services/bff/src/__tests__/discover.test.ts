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
  fetchPlacesByAction: vi.fn(),
}));

const catalogClient = await import("../lib/catalog-client.js");
const fetchMock = catalogClient.fetchPlacesByAction as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);
const FIXTURE_JTI = "discover-test-jti-abcdef1234567890ab";

async function signJwt(payload: Record<string, unknown>, expSeconds: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(FIXTURE_JTI)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(SIGNING_KEY_BYTES);
}

// place-near is at the query origin (0 km); place-far is ~200 km away → outside 20 km filter.
const FIXTURE_PLACES = [
  {
    id: "aabbccdd-0000-4000-8000-000000000001",
    name: { en: "Ocean View Café", "pt-PT": "Café Vista Mar" },
    description: { en: "A café with a view", "pt-PT": "Um café com vista" },
    geom_lat: 37.74,
    geom_lng: -25.66,
    is_hosts_pick: true,
    wishes: ["sea-view", "traditional"],
    hero_image_url: null,
  },
  {
    id: "aabbccdd-0000-4000-8000-000000000002",
    name: { en: "Mountain Bistro", "pt-PT": "Bistrô da Montanha" },
    description: { en: "A mountain bistro", "pt-PT": "Um bistrô" },
    geom_lat: 39.5,
    geom_lng: -8.0,
    is_hosts_pick: false,
    wishes: ["vegetarian"],
    hero_image_url: null,
  },
];

describe("GET /v1/discover", () => {
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
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("happy authed — groups places by wish, geo-filters to km radius", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockResolvedValueOnce(FIXTURE_PLACES);

    const res = await app.inject({
      method: "GET",
      url: "/v1/discover?action=eat&loc=37.74,-25.66&km=20",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      action: string;
      count: number;
      groups: { wish: string; places: { id: string; distance_km: number }[] }[];
    }>();
    expect(body.action).toBe("eat");
    // Only place-near (0 km) is within 20 km; place-far (~200 km) is filtered out.
    expect(body.count).toBe(1);
    expect(body.groups.length).toBe(2); // sea-view + traditional
    for (const group of body.groups) {
      expect(group.places.length).toBe(1);
      expect(group.places[0]!.id).toBe("aabbccdd-0000-4000-8000-000000000001");
      expect(group.places[0]!.distance_km).toBeCloseTo(0, 1);
    }
  });

  it("unauth — 401 (onRoute hook applies authenticate to /v1/discover)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/discover?action=eat",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "unauthorized" });
  });

  it("no loc — returns all places, no distance_km in cards", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockResolvedValueOnce(FIXTURE_PLACES);

    const res = await app.inject({
      method: "GET",
      url: "/v1/discover?action=see",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      action: string;
      count: number;
      groups: { wish: string; places: { distance_km?: number }[] }[];
    }>();
    expect(body.action).toBe("see");
    expect(body.count).toBe(2); // no geo filter → both places returned
    for (const group of body.groups) {
      for (const place of group.places) {
        expect(place.distance_km).toBeUndefined();
      }
    }
  });

  it("catalog-svc 500 — BFF returns 503, no internal details leaked", async () => {
    const { CatalogError } = await import("../lib/catalog-client.js");
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    fetchMock.mockRejectedValueOnce(new CatalogError(500, "internal server error"));

    const res = await app.inject({
      method: "GET",
      url: "/v1/discover?action=eat",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json<{ error: string }>();
    expect(body.error).toBe("catalog_unavailable");
  });
});
