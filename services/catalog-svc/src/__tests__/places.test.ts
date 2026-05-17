import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type TestContext,
  seedReferenceData,
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
  guesthouse_scope: { all: true as const },
  name: { en: "Test Place", "pt-PT": "Lugar de Teste" },
  description: { en: "A place", "pt-PT": "Um lugar" },
  geom_lat: 37.74,
  geom_lng: -25.66,
  address: "Ponta Delgada, Açores",
  contacts: {},
  hours: [],
  status: "published" as const,
  source_kind: "manual" as const,
};

describe("POST/GET/PATCH/DELETE /v1/places", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
    await seedReferenceData(ctx.pool);
  });

  beforeEach(async () => {
    await truncateAll(ctx.pool);
    await seedReferenceData(ctx.pool);
  });

  afterAll(async () => {
    await app.close();
    await closePool();
    await stopTestPostgres(ctx);
  });

  it("create + get + list happy path", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<{ id: string; name: Record<string, string> }>();
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.name.en).toBe("Test Place");

    const getRes = await app.inject({ method: "GET", url: `/v1/places/${created.id}` });
    expect(getRes.statusCode).toBe(200);

    const listRes = await app.inject({ method: "GET", url: "/v1/places" });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json<{ data: unknown[]; nextCursor: string | null }>();
    expect(list.data.length).toBe(1);
  });

  it("PATCH updates fields + returns updated entity", async () => {
    const create = await app.inject({ method: "POST", url: "/v1/places", payload: VALID_BODY });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { address: "São Roque, Açores" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json<{ address: string }>().address).toBe("São Roque, Açores");
  });

  it("DELETE soft-archives + 404 on subsequent GET (default), 200 with include_archived", async () => {
    const create = await app.inject({ method: "POST", url: "/v1/places", payload: VALID_BODY });
    const { id } = create.json<{ id: string }>();

    const del = await app.inject({ method: "DELETE", url: `/v1/places/${id}` });
    expect(del.statusCode).toBe(204);

    const get404 = await app.inject({ method: "GET", url: `/v1/places/${id}` });
    expect(get404.statusCode).toBe(404);

    const getArchived = await app.inject({
      method: "GET",
      url: `/v1/places/${id}?include_archived=true`,
    });
    expect(getArchived.statusCode).toBe(200);
    expect(getArchived.json<{ status: string }>().status).toBe("archived");

    // Idempotent re-delete returns 204.
    const del2 = await app.inject({ method: "DELETE", url: `/v1/places/${id}` });
    expect(del2.statusCode).toBe(204);
  });

  it("404 on unknown id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/places/00000000-0000-4000-8000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("400 on invalid body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, geom_lat: 999 },
    });
    expect(res.statusCode).toBe(400);
  });
});
