import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type TestContext,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
  truncateAll,
} from "./helpers.js";
import { TEST_INTERNAL_TOKEN } from "./helpers.js";

const ctx: TestContext = await startTestPostgres();
setTestEnv(ctx.databaseUrl);

const { createApp } = await import("../app.js");
const { closePool } = await import("../db/client.js");
const { resetConfigCache } = await import("../config.js");

const OWNER_ID = "33333333-3333-4333-8333-333333333333";

const VALID_BODY = {
  owner_id: OWNER_ID,
  bio: { en: "Host of Casa do Mar", "pt-PT": "Anfitrião da Casa do Mar" },
  phone: "+351912345678",
  call_enabled: true,
  dm_channels: {
    in_app: true,
    telegram: false,
    whatsapp_link: true,
    whatsapp_cloud: false,
  },
  email: "host@example.com",
};

describe("POST/GET/PATCH/DELETE /v1/owner-profiles", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
  });

  beforeEach(async () => {
    await truncateAll(ctx.pool);
  });

  afterAll(async () => {
    await app.close();
    await closePool();
    await stopTestPostgres(ctx);
  });

  it("POST creates (201) and re-POST upserts (200)", async () => {
    const first = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/owner-profiles",
      payload: VALID_BODY,
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/owner-profiles",
      payload: { ...VALID_BODY, phone: "+351999999999" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json<{ phone: string }>().phone).toBe("+351999999999");
  });

  it("GET + PATCH + 404 paths", async () => {
    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/owner-profiles",
      payload: VALID_BODY,
    });

    const get = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/owner-profiles/${OWNER_ID}`,
    });
    expect(get.statusCode).toBe(200);

    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/owner-profiles/${OWNER_ID}`,
      payload: { call_enabled: false },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json<{ call_enabled: boolean }>().call_enabled).toBe(false);

    const get404 = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/owner-profiles/00000000-0000-4000-8000-000000000000",
    });
    expect(get404.statusCode).toBe(404);
  });

  it("DELETE hard-removes + idempotent", async () => {
    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/owner-profiles",
      payload: VALID_BODY,
    });

    const del1 = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "DELETE",
      url: `/v1/owner-profiles/${OWNER_ID}`,
    });
    expect(del1.statusCode).toBe(204);

    const get404 = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/owner-profiles/${OWNER_ID}`,
    });
    expect(get404.statusCode).toBe(404);

    const del2 = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "DELETE",
      url: `/v1/owner-profiles/${OWNER_ID}`,
    });
    expect(del2.statusCode).toBe(204);
  });

  // ── dt-tests #35: null clears the photo, absent leaves it ──────────────────

  it("photo: null CLEARS a set photo, while omitting it leaves the photo alone", async () => {
    const PHOTO = "11111111-1111-4111-8111-111111111111";
    const hdr = { "x-internal-token": TEST_INTERNAL_TOKEN };

    await app.inject({
      headers: hdr,
      method: "POST",
      url: "/v1/owner-profiles",
      payload: { ...VALID_BODY, photo: PHOTO },
    });

    // CONTROL: omitting photo must NOT clear it — otherwise a "cleared" result
    // below would prove nothing, since every save would clear.
    const omitted = await app.inject({
      headers: hdr,
      method: "PATCH",
      url: `/v1/owner-profiles/${OWNER_ID}`,
      payload: { phone: "+351911111111" },
    });
    expect(omitted.statusCode).toBe(200);
    expect(omitted.json<{ photo: string | null }>().photo).toBe(PHOTO);

    // the fix: an explicit null clears it
    const cleared = await app.inject({
      headers: hdr,
      method: "PATCH",
      url: `/v1/owner-profiles/${OWNER_ID}`,
      payload: { photo: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json<{ photo: string | null }>().photo).toBeNull();

    // and it persists, rather than only appearing in the PATCH response
    const reread = await app.inject({
      headers: hdr,
      method: "GET",
      url: `/v1/owner-profiles/${OWNER_ID}`,
    });
    expect(reread.json<{ photo: string | null }>().photo).toBeNull();
  });
});
