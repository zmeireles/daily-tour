import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  type TestCtx,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
  truncateAssets,
} from "./helpers.js";

// vi.hoisted so the mock factory below can reference mockSend before hoisting.
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("../src/lib/s3.js", () => ({
  getS3Client: () => ({ send: mockSend }),
}));

// Generate a minimal 64×64 PNG to return from mocked S3 GET responses.
const testPngBuffer = await sharp({
  create: { width: 64, height: 64, channels: 3, background: { r: 100, g: 150, b: 200 } },
})
  .png()
  .toBuffer();

function makeGetResponse() {
  return {
    Body: {
      transformToByteArray: () => Promise.resolve(new Uint8Array(testPngBuffer)),
    },
  };
}

// Boot testcontainers Postgres and set env before importing any DB/config modules.
const ctx: TestCtx = await startTestPostgres();
setTestEnv(ctx.databaseUrl);

const { processAsset } = await import("../src/workers/transcode.js");
const { getDb } = await import("../src/db.js");
const { closePool } = await import("../src/db.js");
const { resetConfigCache } = await import("../src/config.js");
const { assetTable } = await import("../src/schema.js");

const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";

async function insertUploadedAsset(id = ASSET_ID) {
  await getDb()
    .insert(assetTable)
    .values({
      id,
      ownerId: OWNER_ID,
      bucketKey: `${OWNER_ID}/${id}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      uploadedAt: new Date().toISOString(),
    });
}

describe("processAsset", () => {
  beforeAll(() => {
    resetConfigCache();
  });

  beforeEach(async () => {
    await truncateAssets(ctx.pool);
    mockSend.mockReset();
    // Default: GET returns the test PNG; PUT returns success.
    mockSend.mockImplementation((cmd: unknown) => {
      if (cmd instanceof GetObjectCommand) return Promise.resolve(makeGetResponse());
      return Promise.resolve({});
    });
  });

  afterAll(async () => {
    await closePool();
    await stopTestPostgres(ctx);
  });

  it("happy path: generates 6 variants (3 sizes × 2 formats) and persists them", async () => {
    await insertUploadedAsset();

    await processAsset(ASSET_ID);

    const [row] = await getDb()
      .select({ variants: assetTable.variants })
      .from(assetTable)
      .where(eq(assetTable.id, ASSET_ID));

    // 3 sizes × 2 formats = 6 variant keys
    const variants = row?.variants as Record<string, string>;
    expect(Object.keys(variants)).toHaveLength(6);
    expect(variants["200w_avif"]).toBe(`derived/${ASSET_ID}/200w.avif`);
    expect(variants["200w_webp"]).toBe(`derived/${ASSET_ID}/200w.webp`);
    expect(variants["600w_avif"]).toBe(`derived/${ASSET_ID}/600w.avif`);
    expect(variants["600w_webp"]).toBe(`derived/${ASSET_ID}/600w.webp`);
    expect(variants["1200w_avif"]).toBe(`derived/${ASSET_ID}/1200w.avif`);
    expect(variants["1200w_webp"]).toBe(`derived/${ASSET_ID}/1200w.webp`);

    // 1 GET + 6 PUTs
    expect(mockSend).toHaveBeenCalledTimes(7);
  });

  it("idempotent: reprocessing the same asset overwrites variants without duplicates", async () => {
    await insertUploadedAsset();

    await processAsset(ASSET_ID);
    await processAsset(ASSET_ID);

    const [row] = await getDb()
      .select({ variants: assetTable.variants })
      .from(assetTable)
      .where(eq(assetTable.id, ASSET_ID));

    const variants = row?.variants as Record<string, string>;
    expect(Object.keys(variants)).toHaveLength(6);
  });

  it("bad asset_id: returns without error when asset is not found", async () => {
    // No asset inserted — processAsset should return early without throwing.
    // In the worker, an unknown/missing asset causes a nack; here we verify it
    // does not throw so the consumer can safely nack without crashing.
    await expect(processAsset("ffffffff-ffff-4fff-8fff-ffffffffffff")).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
