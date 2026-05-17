import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type TestCtx,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
  truncateAssets,
} from "./helpers.js";

const ctx: TestCtx = await startTestPostgres();
setTestEnv(ctx.databaseUrl);

const { createApp } = await import("../src/server.js");
const { closePool } = await import("../src/db.js");
const { resetConfigCache } = await import("../src/config.js");

const VALID_TOKEN = "test-internal-token-32-chars-pad-here-ok";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";

describe("POST /v1/uploads/sign", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });

  beforeEach(async () => {
    await truncateAssets(ctx.pool);
  });

  afterAll(async () => {
    await app.close();
    await closePool();
    await stopTestPostgres(ctx);
  });

  it("happy path: returns 201 with put_url and asset_id", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: {
        "x-internal-token": VALID_TOKEN,
        "x-owner-id": OWNER_ID,
      },
      payload: { mime_type: "image/jpeg", size_bytes: 1024 * 512 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ put_url: string; asset_id: string }>();
    expect(body.asset_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(typeof body.put_url).toBe("string");
    expect(body.put_url.length).toBeGreaterThan(0);
  });

  it("rejects oversized files (> 50 MB) with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: {
        "x-internal-token": VALID_TOKEN,
        "x-owner-id": OWNER_ID,
      },
      payload: { mime_type: "image/jpeg", size_bytes: 60 * 1024 * 1024 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toMatch(/50 MB/);
  });

  it("rejects unsupported MIME types with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: {
        "x-internal-token": VALID_TOKEN,
        "x-owner-id": OWNER_ID,
      },
      payload: { mime_type: "image/gif", size_bytes: 1024 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string; allowed: string[] }>().allowed).toContain("image/jpeg");
  });
});
