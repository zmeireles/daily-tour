import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type TestContext,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
  truncateAll,
} from "./helpers.js";

const ctx: TestContext = await startTestPostgres();
setTestEnv(ctx.databaseUrl);

const { createApp } = await import("../app.js");
const { closePool } = await import("../db/client.js");
const { resetConfigCache } = await import("../config.js");

const VALID_BODY = {
  owner_id: "22222222-2222-4222-8222-222222222222",
  name: { en: "Casa do Mar", "pt-PT": "Casa do Mar" },
  slug: "casa-do-mar",
  address: "Rua das Flores, Ribeira Grande",
  geom_lat: 37.82,
  geom_lng: -25.51,
  media: [],
};

describe("POST/GET/PATCH/DELETE /v1/guesthouses", () => {
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

  it("create + get + slug lookup", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/guesthouses",
      payload: VALID_BODY,
    });
    expect(create.statusCode).toBe(201);
    const { id } = create.json<{ id: string }>();

    const get = await app.inject({ method: "GET", url: `/v1/guesthouses/${id}` });
    expect(get.statusCode).toBe(200);

    const bySlug = await app.inject({
      method: "GET",
      url: `/v1/guesthouses?slug=casa-do-mar`,
    });
    expect(bySlug.statusCode).toBe(200);
    expect(bySlug.json<{ data: unknown[] }>().data.length).toBe(1);
  });

  it("409 on duplicate slug", async () => {
    await app.inject({ method: "POST", url: "/v1/guesthouses", payload: VALID_BODY });
    const dup = await app.inject({ method: "POST", url: "/v1/guesthouses", payload: VALID_BODY });
    expect(dup.statusCode).toBe(409);
  });

  it("PATCH + 404 on unknown id", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/guesthouses",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();
    const patch = await app.inject({
      method: "PATCH",
      url: `/v1/guesthouses/${id}`,
      payload: { address: "Updated address" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json<{ address: string }>().address).toBe("Updated address");

    const patch404 = await app.inject({
      method: "PATCH",
      url: "/v1/guesthouses/00000000-0000-4000-8000-000000000000",
      payload: { address: "Nope" },
    });
    expect(patch404.statusCode).toBe(404);
  });

  it("DELETE hard-removes + is idempotent", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/guesthouses",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();

    const del1 = await app.inject({ method: "DELETE", url: `/v1/guesthouses/${id}` });
    expect(del1.statusCode).toBe(204);

    const get404 = await app.inject({ method: "GET", url: `/v1/guesthouses/${id}` });
    expect(get404.statusCode).toBe(404);

    const del2 = await app.inject({ method: "DELETE", url: `/v1/guesthouses/${id}` });
    expect(del2.statusCode).toBe(204);
  });
});
