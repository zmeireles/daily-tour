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

  it("list order is stable across a PATCH (createdAt keyset, not updatedAt)", async () => {
    // Regression for daily-tour #153: ordering by updated_at made any PATCH
    // (e.g. a host's-pick toggle) bump the row to the top of /admin/places.
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: "POST", url: "/v1/places", payload: VALID_BODY });
      ids.push(res.json<{ id: string }>().id);
    }

    const orderBefore = (await app.inject({ method: "GET", url: "/v1/places" }))
      .json<{ data: { id: string }[] }>()
      .data.map((p) => p.id);

    // PATCH the last (oldest) row — under the old updated_at ordering this would
    // have jumped it to the front.
    const target = orderBefore[orderBefore.length - 1];
    await app.inject({
      method: "PATCH",
      url: `/v1/places/${target}`,
      payload: { is_hosts_pick: true },
    });

    const orderAfter = (await app.inject({ method: "GET", url: "/v1/places" }))
      .json<{ data: { id: string }[] }>()
      .data.map((p) => p.id);

    expect(orderAfter).toEqual(orderBefore);
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

  it("POST rejects is_hosts_pick=true on a non-published place (422)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "draft" as const, is_hosts_pick: true },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ error: string }>().error).toBe("hosts_pick_requires_published");
  });

  it("POST allows is_hosts_pick=true on a published place (201)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "published" as const, is_hosts_pick: true },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ is_hosts_pick: boolean }>().is_hosts_pick).toBe(true);
  });

  it("PATCH rejects flipping a draft place to a pick (422)", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "draft" as const },
    });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { is_hosts_pick: true },
    });
    expect(patch.statusCode).toBe(422);
    expect(patch.json<{ error: string }>().error).toBe("hosts_pick_requires_published");
  });

  it("PATCH rejects un-publishing a pick without clearing it (422)", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "published" as const, is_hosts_pick: true },
    });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { status: "draft" },
    });
    expect(patch.statusCode).toBe(422);
    expect(patch.json<{ error: string }>().error).toBe("hosts_pick_requires_published");
  });

  it("PATCH allows marking a pick on a published place + un-publishing when also clearing the pick", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "published" as const },
    });
    const { id } = create.json<{ id: string }>();

    const mark = await app.inject({
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { is_hosts_pick: true },
    });
    expect(mark.statusCode).toBe(200);
    expect(mark.json<{ is_hosts_pick: boolean }>().is_hosts_pick).toBe(true);

    const unpublish = await app.inject({
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { status: "draft", is_hosts_pick: false },
    });
    expect(unpublish.statusCode).toBe(200);
    expect(unpublish.json<{ status: string }>().status).toBe("draft");
  });

  it("GET /v1/places/:id/hydrated — returns joined media + actions + wishes", async () => {
    const actionId = "11111111-1111-4111-8111-111111111111";
    const wishId = "22222222-2222-4222-8222-222222222222";
    const mediaId = "33333333-3333-4333-8333-333333333333";

    await ctx.pool.query(
      `INSERT INTO catalog.wish (id, action_id, slug, i18n, sort_order)
       VALUES ($1, $2, 'sea-view', '{"en":"Sea view","pt-PT":"Vista mar"}'::jsonb, 1)
       ON CONFLICT DO NOTHING`,
      [wishId, actionId],
    );

    const create = await app.inject({ method: "POST", url: "/v1/places", payload: VALID_BODY });
    expect(create.statusCode).toBe(201);
    const { id: placeId } = create.json<{ id: string }>();

    await ctx.pool.query(
      `INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES ($1, $2, $3)`,
      [placeId, actionId, wishId],
    );

    await ctx.pool.query(
      `INSERT INTO catalog.place_media (id, place_id, kind, url, alt, attribution, sort_order)
       VALUES ($1, $2, 'image', 'https://example.com/img.jpg', '{"en":"A place"}'::jsonb,
               '{"author":"Jane Doe","license":"CC BY-SA 4.0","source_url":"https://example.com/file"}'::jsonb, 0)`,
      [mediaId, placeId],
    );

    await ctx.pool.query(`UPDATE catalog.place SET season = 'summer' WHERE id = $1`, [placeId]);

    const res = await app.inject({
      method: "GET",
      url: `/v1/places/${placeId}/hydrated`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      id: string;
      season: string | null;
      media: {
        id: string;
        kind: string;
        url: string;
        attribution: { author: string; license: string; source_url: string } | null;
      }[];
      actions: { slug: string; label_i18n: Record<string, string> }[];
      wishes: { slug: string; action_slug: string; label_i18n: Record<string, string> }[];
    }>();
    expect(body.id).toBe(placeId);
    expect(body.season).toBe("summer");
    expect(body.media).toHaveLength(1);
    expect(body.media[0]!.kind).toBe("image");
    expect(body.media[0]!.attribution).toEqual({
      author: "Jane Doe",
      license: "CC BY-SA 4.0",
      source_url: "https://example.com/file",
    });
    expect(body.actions).toHaveLength(1);
    expect(body.actions[0]!.slug).toBe("eat");
    expect(body.wishes).toHaveLength(1);
    expect(body.wishes[0]!.slug).toBe("sea-view");
    expect(body.wishes[0]!.action_slug).toBe("eat");
  });

  it("GET /v1/places-by-action — returns published places with wish slugs for action", async () => {
    // seedReferenceData (called by beforeEach) inserts action id "11111111-..." with slug "eat".
    const actionId = "11111111-1111-4111-8111-111111111111";
    const wishId = "22222222-2222-4222-8222-222222222222";

    await ctx.pool.query(
      `INSERT INTO catalog.wish (id, action_id, slug, i18n, sort_order)
       VALUES ($1, $2, 'sea-view', '{"en":"Sea view"}'::jsonb, 1)
       ON CONFLICT DO NOTHING`,
      [wishId, actionId],
    );

    const create = await app.inject({ method: "POST", url: "/v1/places", payload: VALID_BODY });
    expect(create.statusCode).toBe(201);
    const { id: placeId } = create.json<{ id: string }>();

    await ctx.pool.query(
      `INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES ($1, $2, $3)`,
      [placeId, actionId, wishId],
    );

    const res = await app.inject({
      method: "GET",
      url: "/v1/places-by-action?action_slug=eat",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: { id: string; wishes: string[]; geom_lat: number }[] }>();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]!.id).toBe(placeId);
    expect(body.items[0]!.wishes).toContain("sea-view");
    expect(body.items[0]!.geom_lat).toBe(37.74);
  });

  it("GET /v1/places-by-action — hero_image_url is first image media (by sort_order), null when none", async () => {
    const actionId = "11111111-1111-4111-8111-111111111111";
    const wishId = "22222222-2222-4222-8222-222222222222";

    await ctx.pool.query(
      `INSERT INTO catalog.wish (id, action_id, slug, i18n, sort_order)
       VALUES ($1, $2, 'sea-view', '{"en":"Sea view"}'::jsonb, 1)
       ON CONFLICT DO NOTHING`,
      [wishId, actionId],
    );

    // Place WITH image media.
    const createWithMedia = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id: placeWithMedia } = createWithMedia.json<{ id: string }>();
    await ctx.pool.query(
      `INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES ($1, $2, $3)`,
      [placeWithMedia, actionId, wishId],
    );
    // A video (excluded by kind filter) at sort_order 0, plus two images; the
    // lowest-sort_order image (sort_order 1) is the expected hero.
    await ctx.pool.query(
      `INSERT INTO catalog.place_media (place_id, kind, url, sort_order) VALUES
         ($1, 'video', 'https://example.com/clip.mp4', 0),
         ($1, 'image', 'https://example.com/second.jpg', 2),
         ($1, 'image', 'https://example.com/first.jpg', 1)`,
      [placeWithMedia],
    );

    // Place WITHOUT any media.
    const createNoMedia = await app.inject({
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id: placeNoMedia } = createNoMedia.json<{ id: string }>();
    await ctx.pool.query(
      `INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES ($1, $2, $3)`,
      [placeNoMedia, actionId, wishId],
    );

    const res = await app.inject({
      method: "GET",
      url: "/v1/places-by-action?action_slug=eat",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: { id: string; hero_image_url: string | null }[] }>();
    const byId = new Map(body.items.map((i) => [i.id, i.hero_image_url]));
    expect(byId.get(placeWithMedia)).toBe("https://example.com/first.jpg");
    expect(byId.get(placeNoMedia)).toBeNull();
  });
});
