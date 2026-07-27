import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet } from "jose";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminPlacesRoute from "../routes/admin-places.js";
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

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);
process.env.CATALOG_SVC_URL = "http://catalog.test";

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });
  await app.register(adminPlacesRoute);
  await app.ready();
  return app;
}

const MOCK_PLACE = {
  id: "00000000-0000-0000-0000-000000000001",
  name: { en: "Sete Cidades" },
  description: { en: "Twin lakes." },
  address: "São Miguel",
  status: "published",
  geom_lat: 37.75,
  geom_lng: -25.67,
  is_hosts_pick: false,
  source_kind: "manual",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("BFF admin-places routes", () => {
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
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("GET /v1/admin/places — no auth → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/places" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /v1/admin/places — valid owner JWT → proxies to catalog-svc, returns 200", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    const catalogResponse = { data: [MOCK_PLACE], nextCursor: null };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(catalogResponse),
      }),
    );

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/places",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(catalogResponse);
  });

  it("POST /v1/admin/places — valid owner JWT → proxies create to catalog-svc, returns 201", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(MOCK_PLACE),
      }),
    );

    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/places",
      headers: { authorization: `Bearer ${jwt}` },
      payload: {
        name: { en: "Sete Cidades" },
        description: { en: "Twin lakes." },
        address: "São Miguel",
        geom_lat: 37.75,
        geom_lng: -25.67,
        status: "draft",
        guesthouse_scope: { all: true },
        source_kind: "manual",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: MOCK_PLACE.id });
  });

  it("GET /v1/admin/actions — no auth → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/actions" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /v1/admin/actions — valid owner JWT → proxies the taxonomy from catalog-svc", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    const taxonomy = {
      data: [
        {
          slug: "eat",
          icon: "utensils",
          label_i18n: { en: "Eat", "pt-PT": "Comer" },
          wishes: [{ slug: "sea-view", label_i18n: { en: "Sea view" } }],
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(taxonomy),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/actions",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject(taxonomy);
    expect(fetchMock).toHaveBeenCalledWith("http://catalog.test/v1/actions");
  });

  it("GET /v1/admin/actions — catalog-svc down → 502 rather than an empty picker", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/actions",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "catalog_unavailable" });
  });

  it("DELETE /v1/admin/places/:id — valid owner JWT → proxies archive to catalog-svc, returns 204", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(null),
      }),
    );

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/admin/places/${MOCK_PLACE.id}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(204);
  });
});
