import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet } from "jose";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminProfileRoute from "../routes/admin-profile.js";
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
  await app.register(adminProfileRoute);
  await app.ready();
  return app;
}

const MOCK_PROFILE = {
  owner_id: "owner-uuid-1",
  bio: { en: "Welcome!" },
  photo: null,
  phone: "+351 912 000 001",
  call_enabled: true,
  dm_channels: { in_app: true, telegram: false, whatsapp_link: false, whatsapp_cloud: false },
  email: "owner@example.com",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("BFF admin-profile routes", () => {
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

  it("GET /v1/admin/profile — no auth → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/profile" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /v1/admin/profile — valid owner JWT → proxies to catalog-svc, returns 200", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-uuid-1", aud: "staff" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_PROFILE),
      }),
    );

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/profile",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ owner_id: "owner-uuid-1" });
  });

  it("PUT /v1/admin/profile — valid owner JWT → proxies upsert to catalog-svc, injects owner_id", async () => {
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
          status: 200,
          json: () => Promise.resolve(MOCK_PROFILE),
        });
      }),
    );

    const res = await app.inject({
      method: "PUT",
      url: "/v1/admin/profile",
      headers: { authorization: `Bearer ${jwt}` },
      payload: { bio: { en: "Hello!" }, call_enabled: false },
    });
    expect(res.statusCode).toBe(200);
    expect((capturedBody[0] as Record<string, unknown>)["owner_id"]).toBe("owner-uuid-1");
  });
});
