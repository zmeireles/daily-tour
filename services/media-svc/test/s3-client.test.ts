import { beforeAll, describe, expect, it } from "vitest";

// Local-only: presigning is a pure computation, no object store is contacted.
process.env.MEDIA_SVC_DATABASE_URL = "postgres://x:y@127.0.0.1:1/none";
process.env.MEDIA_SVC_INTERNAL_TOKEN = "test-internal-token-32-chars-pad-here-ok";
process.env.MINIO_ENDPOINT = "http://minio:3900";
process.env.MINIO_ACCESS_KEY = "fakeaccesskey";
process.env.MINIO_SECRET_KEY = "fakesecretkey";
process.env.NODE_ENV = "test";

const { getS3Client, getPresignedPutUrl } = await import("../src/lib/s3.js");

// Garage rejects the CRC32 checksum the AWS SDK v3 adds by default
// (WHEN_SUPPORTED) with 400 InvalidDigest. Removing the two options from
// getS3Client() must fail this file.
describe("S3 client is Garage-compatible", () => {
  let client: ReturnType<typeof getS3Client>;

  beforeAll(() => {
    client = getS3Client();
  });

  it("only calculates request checksums when the operation requires it", async () => {
    expect(await client.config.requestChecksumCalculation()).toBe("WHEN_REQUIRED");
  });

  it("only validates response checksums when the operation requires it", async () => {
    expect(await client.config.responseChecksumValidation()).toBe("WHEN_REQUIRED");
  });

  it("presigned PUT URLs carry no checksum parameters", async () => {
    const url = new URL(await getPresignedPutUrl(client, "b", "k.png", "image/png"));
    const names = [...url.searchParams.keys()].map((n) => n.toLowerCase());
    expect(names.filter((n) => n.includes("checksum"))).toEqual([]);
    expect(url.host).toBe("minio:3900");
  });
});
