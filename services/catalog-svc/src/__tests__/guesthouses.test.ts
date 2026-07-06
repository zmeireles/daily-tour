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
  rooms: 4,
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
    const created = create.json<{ id: string; status: string; rooms: number | null }>();
    const { id } = created;
    // status defaults to "active"; rooms round-trips the create payload.
    expect(created.status).toBe("active");
    expect(created.rooms).toBe(4);

    const get = await app.inject({ method: "GET", url: `/v1/guesthouses/${id}` });
    expect(get.statusCode).toBe(200);
    const fetched = get.json<{ status: string; rooms: number | null }>();
    expect(fetched.status).toBe("active");
    expect(fetched.rooms).toBe(4);

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
      payload: { address: "Updated address", status: "archived", rooms: 6 },
    });
    expect(patch.statusCode).toBe(200);
    const patched = patch.json<{ address: string; status: string; rooms: number | null }>();
    expect(patched.address).toBe("Updated address");
    expect(patched.status).toBe("archived");
    expect(patched.rooms).toBe(6);

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

  it("hide/unhide places — idempotent add + remove (Plan-006 6.A)", async () => {
    const PLACE_A = "c0000001-0000-4000-a000-000000000001";
    const PLACE_B = "c0000002-0000-4000-a000-000000000002";

    const create = await app.inject({
      method: "POST",
      url: "/v1/guesthouses",
      payload: VALID_BODY,
    });
    const { id, hidden_place_ids } = create.json<{ id: string; hidden_place_ids: string[] }>();
    expect(hidden_place_ids).toEqual([]); // default empty

    // Hide A, hide A again (idempotent), then hide B.
    const h1 = await app.inject({
      method: "PUT",
      url: `/v1/guesthouses/${id}/hidden-places/${PLACE_A}`,
    });
    expect(h1.statusCode).toBe(200);
    expect(h1.json<{ hidden_place_ids: string[] }>().hidden_place_ids).toEqual([PLACE_A]);

    const h2 = await app.inject({
      method: "PUT",
      url: `/v1/guesthouses/${id}/hidden-places/${PLACE_A}`,
    });
    expect(h2.json<{ hidden_place_ids: string[] }>().hidden_place_ids).toEqual([PLACE_A]); // no dup

    const h3 = await app.inject({
      method: "PUT",
      url: `/v1/guesthouses/${id}/hidden-places/${PLACE_B}`,
    });
    expect(h3.json<{ hidden_place_ids: string[] }>().hidden_place_ids.sort()).toEqual(
      [PLACE_A, PLACE_B].sort(),
    );

    // Unhide A → only B remains; unhide A again is a no-op.
    const u1 = await app.inject({
      method: "DELETE",
      url: `/v1/guesthouses/${id}/hidden-places/${PLACE_A}`,
    });
    expect(u1.statusCode).toBe(200);
    expect(u1.json<{ hidden_place_ids: string[] }>().hidden_place_ids).toEqual([PLACE_B]);

    const u2 = await app.inject({
      method: "DELETE",
      url: `/v1/guesthouses/${id}/hidden-places/${PLACE_A}`,
    });
    expect(u2.json<{ hidden_place_ids: string[] }>().hidden_place_ids).toEqual([PLACE_B]);
  });

  it("hide on a missing guesthouse → 404", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/guesthouses/00000000-0000-4000-8000-000000000000/hidden-places/c0000001-0000-4000-a000-000000000001",
    });
    expect(res.statusCode).toBe(404);
  });
});
