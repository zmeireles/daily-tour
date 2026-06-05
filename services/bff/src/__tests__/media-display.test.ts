import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import authPlugin from "../plugins/auth.js";
import mediaDisplayRoute from "../routes/media-display.js";
import type { MediaSvc } from "../plugins/media-client.js";
import {
  type TestRedisCtx,
  flushRedis,
  setTestEnv,
  startTestRedis,
  stopTestRedis,
} from "./helpers.js";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function buildAsset() {
  return {
    ok: true,
    status: 200,
    contentType: "image/jpeg",
    body: new TextEncoder().encode("IMGBYTES").buffer,
  };
}

async function buildTestApp(): Promise<{ app: FastifyInstance; mediaSvc: MediaSvc }> {
  const app = Fastify({ logger: false });
  // authPlugin installs the onRoute auth-dispatch hook; the route under test
  // opts out via config.auth: "public", so this proves it is reachable
  // unauthenticated (no Bearer token).
  await app.register(authPlugin);

  const mediaSvc: MediaSvc = {
    signUpload: vi.fn(),
    completeUpload: vi.fn(),
    fetchAsset: vi.fn().mockResolvedValue(buildAsset()),
    uploadAsset: vi.fn(),
  };
  app.decorate("mediaSvc", mediaSvc);

  await app.register(mediaDisplayRoute);
  await app.ready();
  return { app, mediaSvc };
}

describe("BFF media-display route (GET /v1/media/:id)", () => {
  let app: FastifyInstance;
  let mediaSvc: MediaSvc;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    ({ app, mediaSvc } = await buildTestApp());
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    vi.clearAllMocks();
    vi.mocked(mediaSvc.fetchAsset).mockResolvedValue(buildAsset());
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("public (no auth header) → 200 streams bytes with the upstream content-type", async () => {
    const res = await app.inject({ method: "GET", url: `/v1/media/${VALID_ID}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.headers["cache-control"]).toContain("max-age=300");
    expect(res.body).toBe("IMGBYTES");
    expect(vi.mocked(mediaSvc.fetchAsset)).toHaveBeenCalledWith(VALID_ID);
  });

  it("invalid (non-uuid) id → 400, never touches media-svc", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/media/not-a-uuid" });
    expect(res.statusCode).toBe(400);
    expect(vi.mocked(mediaSvc.fetchAsset)).not.toHaveBeenCalled();
  });

  it("asset missing (media-svc 404) → 404", async () => {
    vi.mocked(mediaSvc.fetchAsset).mockResolvedValue({
      ok: false,
      status: 404,
      contentType: null,
      body: null,
    });
    const res = await app.inject({ method: "GET", url: `/v1/media/${VALID_ID}` });
    expect(res.statusCode).toBe(404);
  });

  it("media-svc upstream failure (non-404) → 502", async () => {
    vi.mocked(mediaSvc.fetchAsset).mockResolvedValue({
      ok: false,
      status: 500,
      contentType: null,
      body: null,
    });
    const res = await app.inject({ method: "GET", url: `/v1/media/${VALID_ID}` });
    expect(res.statusCode).toBe(502);
  });
});
