import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet } from "jose";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminGuesthousesRoute from "../routes/admin-guesthouses.js";
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
  await app.register(adminGuesthousesRoute);
  await app.ready();
  return app;
}

const MOCK_GH = {
  id: "00000000-0000-0000-0000-000000000001",
  owner_id: "owner-uuid-1",
  name: { en: "Casa das Furnas" },
  slug: "casa-das-furnas",
  address: "Furnas, São Miguel",
  geom_lat: 37.77,
  geom_lng: -25.32,
  media: [],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("BFF admin-guesthouses routes", () => {
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

  it("GET /v1/admin/guesthouses — no auth → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/guesthouses" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /v1/admin/guesthouses — valid owner JWT → proxies to catalog-svc, returns 200", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-uuid-1", aud: "staff" },
    });
    const catalogResponse = { data: [MOCK_GH], nextCursor: null };
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
      url: "/v1/admin/guesthouses",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(catalogResponse);
  });

  it("POST /v1/admin/guesthouses — valid owner JWT → injects owner_id and proxies create", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-uuid-1", aud: "staff" },
    });
    const capturedBody: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: unknown, init: unknown) => {
        capturedBody.push(JSON.parse((init as { body: string }).body) as unknown);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(MOCK_GH),
        });
      }),
    );

    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/guesthouses",
      headers: { authorization: `Bearer ${jwt}` },
      payload: {
        name: { en: "Casa das Furnas" },
        slug: "casa-das-furnas",
        address: "Furnas, São Miguel",
        geom_lat: 37.77,
        geom_lng: -25.32,
      },
    });
    expect(res.statusCode).toBe(201);
    expect((capturedBody[0] as Record<string, unknown>)["owner_id"]).toBe("owner-uuid-1");
  });
});
