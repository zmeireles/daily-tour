import Fastify, { type FastifyInstance } from "fastify";
import { createLocalJWKSet } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminGeocodeRoute from "../routes/admin-geocode.js";
import {
  type AuthentikTestKeypair,
  makeAuthentikKeypair,
  signOwnerJwt,
} from "./authentik-keypair.js";
import {
  type TestRedisCtx,
  flushRedis,
  setTestEnv,
  startTestRedis,
  stopTestRedis,
} from "./helpers.js";

// Stub the global fetch so tests never touch the real Geoapify API. The route
// calls the unqualified `fetch`, which resolves to globalThis.fetch at call time.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);
process.env.GEOAPIFY_API_KEY = "test-geoapify-key";

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });
  await app.register(adminGeocodeRoute);
  await app.ready();
  return app;
}

// A mocked fetch success: an ok Response whose json() resolves to `body`.
function okFetch(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}
// A mocked fetch non-2xx: json() is never reached but kept realistic.
function failFetch(status: number) {
  return { ok: false, status, json: () => Promise.resolve({}) };
}

describe("BFF admin-geocode route", () => {
  let app: FastifyInstance;
  let keypair: AuthentikTestKeypair;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    keypair = await makeAuthentikKeypair();
    app = await buildTestApp(keypair);
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    mockFetch.mockReset();
    process.env.GEOAPIFY_API_KEY = "test-geoapify-key";
    resetConfigCache();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  async function ownerJwt(): Promise<string> {
    return await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-uuid-1", aud: "staff" },
    });
  }

  function postGeocode(jwt: string | null, payload: unknown) {
    return app.inject({
      method: "POST",
      url: "/v1/admin/geocode",
      headers: jwt ? { authorization: `Bearer ${jwt}` } : {},
      payload: payload as object,
    });
  }

  function postReverse(jwt: string | null, payload: unknown) {
    return app.inject({
      method: "POST",
      url: "/v1/admin/geocode/reverse",
      headers: jwt ? { authorization: `Bearer ${jwt}` } : {},
      payload: payload as object,
    });
  }

  it("401 when no owner token is present", async () => {
    const res = await postGeocode(null, { query: "Ponta Delgada" });
    expect(res.statusCode).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  describe("400 invalid body", () => {
    it("empty query", async () => {
      const jwt = await ownerJwt();
      const res = await postGeocode(jwt, { query: "" });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "invalid_body" });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("limit out of range", async () => {
      const jwt = await ownerJwt();
      const res = await postGeocode(jwt, { query: "Furnas", limit: 99 });
      expect(res.statusCode).toBe(400);
    });

    it("reverse: latitude out of range", async () => {
      const jwt = await ownerJwt();
      const res = await postReverse(jwt, { lat: 200, lng: 0 });
      expect(res.statusCode).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("503 when GEOAPIFY_API_KEY is unset — guards before any fetch", () => {
    it("forward", async () => {
      delete process.env.GEOAPIFY_API_KEY;
      resetConfigCache();
      const jwt = await ownerJwt();
      const res = await postGeocode(jwt, { query: "Ponta Delgada" });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ error: "geocode_unavailable" });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("reverse", async () => {
      delete process.env.GEOAPIFY_API_KEY;
      resetConfigCache();
      const jwt = await ownerJwt();
      const res = await postReverse(jwt, { lat: 37.75, lng: -25.67 });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ error: "geocode_unavailable" });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  it("200 forward — normalizes formatted→label, lon→lng, drops entries missing coords", async () => {
    const jwt = await ownerJwt();
    mockFetch.mockResolvedValue(
      okFetch({
        results: [
          { formatted: "Rua da Sé, Ponta Delgada, Portugal", lat: 37.74, lon: -25.66, rank: 1 },
          { formatted: "Missing coords, Portugal", lat: null, lon: null },
        ],
      }),
    );

    const res = await postGeocode(jwt, { query: "Ponta Delgada", limit: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      results: [{ label: "Rua da Sé, Ponta Delgada, Portugal", lat: 37.74, lng: -25.66 }],
    });

    // One upstream call, to the autocomplete endpoint, key hidden server-side.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://api.geoapify.com/v1/geocode/autocomplete");
    expect(url).toContain("text=Ponta+Delgada");
    expect(url).toContain("filter=countrycode%3Apt");
    expect(url).toContain("bias=proximity");
    expect(url).toContain("apiKey=test-geoapify-key");
  });

  it("200 reverse — first result's formatted→label, echoes request lat/lng", async () => {
    const jwt = await ownerJwt();
    mockFetch.mockResolvedValue(
      okFetch({
        results: [{ formatted: "Largo, Ponta Delgada, Portugal", lat: 37.7, lon: -25.6 }],
      }),
    );

    const res = await postReverse(jwt, { lat: 37.75, lng: -25.67 });
    expect(res.statusCode).toBe(200);
    // lat/lng are the request pin, NOT the upstream point.
    expect(res.json()).toEqual({
      label: "Largo, Ponta Delgada, Portugal",
      lat: 37.75,
      lng: -25.67,
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://api.geoapify.com/v1/geocode/reverse");
    expect(url).toContain("lat=37.75");
    expect(url).toContain("lon=-25.67");
  });

  it("200 reverse — label:null when upstream returns no results", async () => {
    const jwt = await ownerJwt();
    mockFetch.mockResolvedValue(okFetch({ results: [] }));

    const res = await postReverse(jwt, { lat: 10, lng: 10 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ label: null, lat: 10, lng: 10 });
  });

  it("502 when the upstream returns a non-2xx status", async () => {
    const jwt = await ownerJwt();
    mockFetch.mockResolvedValue(failFetch(500));
    const res = await postGeocode(jwt, { query: "Nowhere" });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "geocode_failed" });
  });

  it("429 when the upstream is rate-limited", async () => {
    const jwt = await ownerJwt();
    mockFetch.mockResolvedValue(failFetch(429));
    const res = await postGeocode(jwt, { query: "RateLimited" });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ error: "geocode_rate_limited" });
  });

  it("caches a successful 200 — a repeat request does not hit the upstream again", async () => {
    const jwt = await ownerJwt();
    mockFetch.mockResolvedValue(
      okFetch({ results: [{ formatted: "Furnas, Portugal", lat: 37.77, lon: -25.31 }] }),
    );

    const first = await postGeocode(jwt, { query: "Furnas", limit: 3 });
    const second = await postGeocode(jwt, { query: "Furnas", limit: 3 });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    // Second call served from cache — fetch fired exactly once.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
