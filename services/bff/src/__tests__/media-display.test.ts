import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import authPlugin from "../plugins/auth.js";
import mediaDisplayRoute, { pickVariant } from "../routes/media-display.js";
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
    // dt-tests #37 added the variant argument; no width requested → undefined.
    expect(vi.mocked(mediaSvc.fetchAsset)).toHaveBeenCalledWith(VALID_ID, undefined);
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

  it("asks media-svc for the negotiated variant", async () => {
    await app.inject({
      method: "GET",
      url: `/v1/media/${VALID_ID}?w=600`,
      headers: { accept: "image/avif,image/webp,*/*" },
    });
    expect(mediaSvc.fetchAsset).toHaveBeenCalledWith(VALID_ID, "600w_avif");
  });

  it("asks for no variant when the request carries no width", async () => {
    // Control: the call above proves the second argument IS passed when a
    // variant is chosen, so undefined here is a real difference.
    await app.inject({ method: "GET", url: `/v1/media/${VALID_ID}` });
    expect(mediaSvc.fetchAsset).toHaveBeenCalledWith(VALID_ID, undefined);
  });

  it("sets Vary: accept so a shared cache cannot cross-serve formats", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/media/${VALID_ID}?w=200`,
      headers: { accept: "image/avif,*/*" },
    });
    expect(res.headers.vary).toBe("accept");
  });

  it("ignores a junk width rather than erroring", async () => {
    const res = await app.inject({ method: "GET", url: `/v1/media/${VALID_ID}?w=notanumber` });
    expect(res.statusCode).toBe(200);
    expect(mediaSvc.fetchAsset).toHaveBeenCalledWith(VALID_ID, undefined);
  });
});

// ── dt-tests #37 — the derivatives finally get consumed ─────────────────────
// Every uploaded image is transcoded into 6 derivatives (200/600/1200 ×
// avif/webp) and, until now, nothing served one: 86% of the object store was
// dead weight. These tests fail against that code, which ignored `?w=` and
// Accept entirely and always streamed the original.

describe("pickVariant — width + format negotiation", () => {
  const AVIF = "image/avif,image/webp,image/*,*/*;q=0.8";
  const WEBP = "image/webp,image/*,*/*;q=0.8";
  const LEGACY = "image/*,*/*;q=0.8";

  it("prefers avif when the browser offers it", () => {
    expect(pickVariant(600, AVIF)).toBe("600w_avif");
  });

  it("falls back to webp when avif is not offered", () => {
    expect(pickVariant(600, WEBP)).toBe("600w_webp");
  });

  it("serves the original when the browser offers neither", () => {
    // Serving AVIF to a client that never asked for it renders nothing at all,
    // which is worse than serving a larger JPEG.
    expect(pickVariant(600, LEGACY)).toBeUndefined();
  });

  it("rounds UP to the smallest stored width that covers the request", () => {
    // Never upscale: a 300px slot must get the 600w derivative, not the 200w.
    expect(pickVariant(201, AVIF)).toBe("600w_avif");
    expect(pickVariant(200, AVIF)).toBe("200w_avif");
    expect(pickVariant(1200, AVIF)).toBe("1200w_avif");
  });

  it("serves the original beyond the largest derivative", () => {
    // 1201px has no covering derivative; the original is the highest fidelity
    // available, and inventing a "2000w_avif" would name a key that cannot exist.
    expect(pickVariant(1201, AVIF)).toBeUndefined();
  });

  it("serves the original when no width is requested", () => {
    expect(pickVariant(undefined, AVIF)).toBeUndefined();
  });
});
