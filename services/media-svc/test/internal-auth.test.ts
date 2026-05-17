import { afterAll, beforeAll, describe, expect, it } from "vitest";

// No testcontainers needed — auth failures are rejected before any DB or S3 call.
// getSignedUrl() is a local operation; getPool() is lazy and never called here.
process.env.MEDIA_SVC_DATABASE_URL = "postgres://x:y@127.0.0.1:1/none";
process.env.MEDIA_SVC_INTERNAL_TOKEN = "test-internal-token-32-chars-pad-here-ok";
process.env.MINIO_ENDPOINT = "http://localhost:1";
process.env.MINIO_ACCESS_KEY = "fakeaccesskey";
process.env.MINIO_SECRET_KEY = "fakesecretkey";
process.env.MINIO_BUCKET = "test-bucket";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "8087";

const { createApp } = await import("../src/server.js");
const { resetConfigCache } = await import("../src/config.js");

const VALID_TOKEN = "test-internal-token-32-chars-pad-here-ok";
const OWNER_ID = "44444444-4444-4444-8444-444444444444";

describe("internal auth middleware", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when X-Internal-Token is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: { "x-owner-id": OWNER_ID },
      payload: { mime_type: "image/jpeg", size_bytes: 1024 },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json<{ error: string }>().error).toBe("unauthorized");
  });

  it("returns 400 when X-Owner-Id is missing (valid token provided)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: { "x-internal-token": VALID_TOKEN },
      payload: { mime_type: "image/jpeg", size_bytes: 1024 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toBe("x-owner-id header is required");
  });
});
