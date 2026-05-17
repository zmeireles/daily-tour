import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminMediaRoute from "../routes/admin-media.js";
import type { MediaSvc } from "../plugins/media-client.js";
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
import { createLocalJWKSet } from "jose";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });

  const mockMediaSvc: MediaSvc = {
    signUpload: vi.fn().mockResolvedValue({ put_url: "https://minio/put", asset_id: "asset-uuid-1" }),
    completeUpload: vi.fn().mockResolvedValue(undefined),
  };
  app.decorate("mediaSvc", mockMediaSvc);

  await app.register(adminMediaRoute);
  await app.ready();
  return app;
}

describe("BFF admin-media routes", () => {
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
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("POST /v1/admin/media/sign — no auth → 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/media/sign",
      payload: { mime_type: "image/jpeg", size_bytes: 1024 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /v1/admin/media/sign — invalid body → 400", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/media/sign",
      headers: { authorization: `Bearer ${jwt}` },
      payload: { mime_type: "image/jpeg" }, // missing size_bytes
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "validation_failed" });
  });

  it("POST /v1/admin/media/sign — valid owner JWT → calls mediaSvc.signUpload, returns put_url", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/media/sign",
      headers: { authorization: `Bearer ${jwt}` },
      payload: { mime_type: "image/jpeg", size_bytes: 2048 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { put_url: string; asset_id: string };
    expect(body.put_url).toBe("https://minio/put");
    expect(body.asset_id).toBe("asset-uuid-1");
    expect((app.mediaSvc.signUpload as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      "owner-1",
      "image/jpeg",
      2048,
    );
  });

  it("POST /v1/admin/media/complete — valid owner JWT → calls mediaSvc.completeUpload, returns 204", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", aud: "staff" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/media/complete",
      headers: { authorization: `Bearer ${jwt}` },
      payload: { asset_id: "00000000-0000-0000-0000-000000000001" },
    });
    expect(res.statusCode).toBe(204);
    expect((app.mediaSvc.completeUpload as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
    );
  });
});
