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
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";

describe("GET /v1/assets/:id", () => {
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

  it("redirects 302 to a pre-signed GET URL for a known asset", async () => {
    // Insert an asset row directly via the upload route to ensure consistency.
    const signRes = await app.inject({
      method: "POST",
      url: "/v1/uploads/sign",
      headers: {
        "x-internal-token": VALID_TOKEN,
        "x-owner-id": OWNER_ID,
      },
      payload: { mime_type: "image/webp", size_bytes: 2048 },
    });
    expect(signRes.statusCode).toBe(201);
    const { asset_id } = signRes.json<{ asset_id: string; put_url: string }>();

    const res = await app.inject({
      method: "GET",
      url: `/v1/assets/${asset_id}`,
    });
    expect(res.statusCode).toBe(302);
    const location = res.headers["location"] as string;
    expect(typeof location).toBe("string");
    expect(location.length).toBeGreaterThan(0);
  });

  it("returns 404 for an unknown asset id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/assets/${ASSET_ID}`,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: string }>().error).toBe("asset not found");
  });
});
