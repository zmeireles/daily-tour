import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Set env BEFORE importing any module that calls loadConfig() at module load.
process.env.MEDIA_SVC_DATABASE_URL =
  process.env.MEDIA_SVC_DATABASE_URL ?? "postgres://x:y@127.0.0.1:1/none";
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "test-access-key";
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "test-secret-key";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8087";
const TOKEN = "test-media-internal-token-32-chars-ok";
process.env.MEDIA_SVC_INTERNAL_TOKEN = TOKEN;

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_KEY = "media/original.jpg";

const asset = {
  id: ASSET_ID,
  bucketKey: ORIGINAL_KEY,
  variants: {
    "200w_avif": "derived/abc/200w.avif",
    "600w_webp": "derived/abc/600w.webp",
  } as Record<string, string>,
};

vi.mock("../db.js", () => ({
  getPool: () => ({ query: () => Promise.resolve() }),
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([asset]) }),
      }),
    }),
  }),
  runMigrations: () => Promise.resolve(),
  closePool: () => Promise.resolve(),
}));

vi.mock("../lib/mq.js", () => ({
  isBrokerConnected: () => false,
  publishMediaUploaded: () => Promise.resolve(),
  closeMqPublisher: () => Promise.resolve(),
}));

// Capture which bucket key gets presigned — that is the whole behaviour here.
const presignedKeys: string[] = [];
vi.mock("../lib/s3.js", () => ({
  getS3Client: () => ({}),
  getPresignedGetUrl: (_c: unknown, _b: string, key: string) => {
    presignedKeys.push(key);
    return Promise.resolve(`https://minio.internal/${key}?signed=1`);
  },
}));

const { createApp } = await import("../server.js");
const { resetConfigCache } = await import("../config.js");

// dt-tests #37 — media-svc can now serve a transcoded derivative. Every test
// here fails against the previous route, which always presigned asset.bucketKey.
describe("GET /v1/assets/:id — variant selection", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function get(url: string) {
    presignedKeys.length = 0;
    return app.inject({ method: "GET", url, headers: { "x-internal-token": TOKEN } });
  }

  it("presigns the original when no variant is named", async () => {
    const res = await get(`/v1/assets/${ASSET_ID}`);
    expect(res.statusCode).toBe(302);
    expect(presignedKeys).toEqual([ORIGINAL_KEY]);
  });

  it("presigns the named derivative from the asset's own map", async () => {
    const res = await get(`/v1/assets/${ASSET_ID}?variant=200w_avif`);
    expect(res.statusCode).toBe(302);
    expect(presignedKeys).toEqual(["derived/abc/200w.avif"]);
  });

  // 🔒 The security property. A presigned URL for a caller-chosen key would
  // hand out read access to ANY object in the bucket, so the caller names a
  // variant and the key is looked up — never taken from the request.
  it("never presigns a caller-supplied bucket key", async () => {
    for (const attack of [
      "../../secrets/dump.sql",
      "media/someone-elses-original.jpg",
      "derived/abc/200w.avif", // a real key, but supplied as the selector
    ]) {
      const res = await get(`/v1/assets/${ASSET_ID}?variant=${encodeURIComponent(attack)}`);
      expect(res.statusCode).toBe(302);
      // Falls back to this asset's own original — the attacker's string is
      // never used as a key.
      expect(presignedKeys).toEqual([ORIGINAL_KEY]);
    }
  });

  it("falls back to the original for a variant this asset does not have", async () => {
    // An asset uploaded before the transcode worker ran has no derivatives; a
    // missing size should degrade to a larger image, not to a broken one.
    const res = await get(`/v1/assets/${ASSET_ID}?variant=1200w_avif`);
    expect(res.statusCode).toBe(302);
    expect(presignedKeys).toEqual([ORIGINAL_KEY]);
  });
});
