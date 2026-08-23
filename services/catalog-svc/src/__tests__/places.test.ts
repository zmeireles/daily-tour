import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type TestContext,
  seedReferenceData,
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

const VALID_BODY = {
  actions: [{ action_slug: "eat", wish_slugs: ["sea-view"] }],
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
  });

  it("create + get + list happy path", async () => {
    const createRes = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<{ id: string; name: Record<string, string> }>();
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.name.en).toBe("Test Place");

    const getRes = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${created.id}`,
    });
    expect(getRes.statusCode).toBe(200);

    const listRes = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/places",
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json<{ data: unknown[]; nextCursor: string | null }>();
    expect(list.data.length).toBe(1);
  });

  it("list order is stable across a PATCH (createdAt keyset, not updatedAt)", async () => {
    // Regression for daily-tour #153: ordering by updated_at made any PATCH
    // (e.g. a host's-pick toggle) bump the row to the top of /admin/places.
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
        method: "POST",
        url: "/v1/places",
        payload: VALID_BODY,
      });
      ids.push(res.json<{ id: string }>().id);
    }

    const orderBefore = (
      await app.inject({
        headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
        method: "GET",
        url: "/v1/places",
      })
    )
      .json<{ data: { id: string }[] }>()
      .data.map((p) => p.id);

    // PATCH the last (oldest) row — under the old updated_at ordering this would
    // have jumped it to the front.
    const target = orderBefore[orderBefore.length - 1];
    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${target}`,
      payload: { is_hosts_pick: true },
    });

    const orderAfter = (
      await app.inject({
        headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
        method: "GET",
        url: "/v1/places",
      })
    )
      .json<{ data: { id: string }[] }>()
      .data.map((p) => p.id);

    expect(orderAfter).toEqual(orderBefore);
  });

  it("PATCH updates fields + returns updated entity", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { address: "São Roque, Açores" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json<{ address: string }>().address).toBe("São Roque, Açores");
  });

  it("DELETE soft-archives + 404 on subsequent GET (default), 200 with include_archived", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();

    const del = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "DELETE",
      url: `/v1/places/${id}`,
    });
    expect(del.statusCode).toBe(204);

    const get404 = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}`,
    });
    expect(get404.statusCode).toBe(404);

    const getArchived = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}?include_archived=true`,
    });
    expect(getArchived.statusCode).toBe(200);
    expect(getArchived.json<{ status: string }>().status).toBe("archived");

    // Idempotent re-delete returns 204.
    const del2 = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "DELETE",
      url: `/v1/places/${id}`,
    });
    expect(del2.statusCode).toBe(204);
  });

  // #376 — archiving used to be a one-way door. The guard blocked EVERY PATCH
  // on an archived row, including the one that undoes the archive, so an owner
  // who archived a place by mistake had no way back from the console: the row,
  // its tags, its media and its coordinates all still existed and were simply
  // unreachable through the write API.
  it("an archived place can be restored, and the restore may carry other edits", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();
    expect(
      (
        await app.inject({
          headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
          method: "DELETE",
          url: `/v1/places/${id}`,
        })
      ).statusCode,
    ).toBe(204);

    // The console's form submits every field on save, so the restore request
    // is never status-only. A rule of "the body may change only status" would
    // reject the very request the restore path sends.
    const restore = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { status: "published", address: "Restaurado, Açores" },
    });
    expect(restore.statusCode).toBe(200);
    expect(restore.json<{ status: string }>().status).toBe("published");
    expect(restore.json<{ address: string }>().address).toBe("Restaurado, Açores");

    // And it is genuinely back: reachable without include_archived.
    const get = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}`,
    });
    expect(get.statusCode).toBe(200);
  });

  it("an archived place is still read-only for edits that leave it archived", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();
    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "DELETE",
      url: `/v1/places/${id}`,
    });

    for (const payload of [
      { address: "Uma morada nova" }, // no status at all
      { status: "archived", address: "Outra" }, // explicitly staying archived
    ]) {
      const res = await app.inject({
        headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
        method: "PATCH",
        url: `/v1/places/${id}`,
        payload,
      });
      expect(res.statusCode).toBe(409);
      // 409 `place_archived`, NOT 404. Answering "not found" for a row that
      // demonstrably exists left a caller unable to tell a bad id from an
      // archived one — same illegibility as the opaque guesthouse 400 (#372).
      expect(res.json<{ error: string }>().error).toBe("place_archived");
    }
  });

  it("404 on unknown id", async () => {
    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/places/00000000-0000-4000-8000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("400 on invalid body", async () => {
    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, geom_lat: 999 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST rejects is_hosts_pick=true on a non-published place (422)", async () => {
    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "draft" as const, is_hosts_pick: true },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ error: string }>().error).toBe("hosts_pick_requires_published");
  });

  it("POST allows is_hosts_pick=true on a published place (201)", async () => {
    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "published" as const, is_hosts_pick: true },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ is_hosts_pick: boolean }>().is_hosts_pick).toBe(true);
  });

  it("PATCH rejects flipping a draft place to a pick (422)", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "draft" as const },
    });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { is_hosts_pick: true },
    });
    expect(patch.statusCode).toBe(422);
    expect(patch.json<{ error: string }>().error).toBe("hosts_pick_requires_published");
  });

  it("PATCH rejects un-publishing a pick without clearing it (422)", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "published" as const, is_hosts_pick: true },
    });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { status: "draft" },
    });
    expect(patch.statusCode).toBe(422);
    expect(patch.json<{ error: string }>().error).toBe("hosts_pick_requires_published");
  });

  it("PATCH allows marking a pick on a published place + un-publishing when also clearing the pick", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, status: "published" as const },
    });
    const { id } = create.json<{ id: string }>();

    const mark = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { is_hosts_pick: true },
    });
    expect(mark.statusCode).toBe(200);
    expect(mark.json<{ is_hosts_pick: boolean }>().is_hosts_pick).toBe(true);

    const unpublish = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
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

    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    expect(create.statusCode).toBe(201);
    const { id: placeId } = create.json<{ id: string }>();

    await ctx.pool.query(
      `INSERT INTO catalog.place_media (id, place_id, kind, url, alt, attribution, sort_order)
       VALUES ($1, $2, 'image', 'https://example.com/img.jpg', '{"en":"A place"}'::jsonb,
               '{"author":"Jane Doe","license":"CC BY-SA 4.0","source_url":"https://example.com/file"}'::jsonb, 0)`,
      [mediaId, placeId],
    );

    await ctx.pool.query(`UPDATE catalog.place SET season = 'summer' WHERE id = $1`, [placeId]);

    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
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

    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    expect(create.statusCode).toBe(201);
    const { id: placeId } = create.json<{ id: string }>();

    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
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
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id: placeWithMedia } = createWithMedia.json<{ id: string }>();
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
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id: placeNoMedia } = createNoMedia.json<{ id: string }>();

    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
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

// The write path that did not exist: `media` was absent from the zod schema, so
// zod's default `strip` deleted it and `safeParse` still succeeded — every photo
// an owner attached uploaded fine, rendered a thumbnail, saved 200, and wrote no
// `place_media` row at all.
describe("place media persistence", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  const ASSET_A = "aaaaaaaa-0000-4000-8000-000000000001";
  const ASSET_B = "aaaaaaaa-0000-4000-8000-000000000002";

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
    await seedReferenceData(ctx.pool);
  });

  beforeEach(async () => {
    await truncateAll(ctx.pool);
    await seedReferenceData(ctx.pool);
  });

  async function mediaRows(placeId: string) {
    const { rows } = await ctx.pool.query<{
      id: string;
      url: string;
      sort_order: number;
      attribution: { author: string; license: string; source_url: string } | null;
      alt: Record<string, string> | null;
    }>(
      `SELECT id, url, sort_order, attribution, alt FROM catalog.place_media
       WHERE place_id = $1 ORDER BY sort_order ASC`,
      [placeId],
    );
    return rows;
  }

  it("persists the assets attached on create, in the order given", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, media: [ASSET_A, ASSET_B] },
    });
    expect(create.statusCode).toBe(201);
    const { id } = create.json<{ id: string }>();

    const rows = await mediaRows(id);
    // Control: a place created WITHOUT media has zero rows, so a non-empty
    // result here is the media argument's doing and not a fixture.
    const bare = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    expect(await mediaRows(bare.json<{ id: string }>().id)).toHaveLength(0);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.url)).toEqual([`/v1/media/${ASSET_A}`, `/v1/media/${ASSET_B}`]);
    expect(rows.map((r) => r.sort_order)).toEqual([0, 1]);
  });

  // ⚠️ The trap. `place_media.attribution` carries the Wikimedia Commons
  // author/licence/source for the seeded landmark photos and has NO other copy
  // in the app. A delete-all-then-reinsert implementation passes every other
  // test in this block and destroys it on the owner's first save.
  it("keeps attribution and alt on a row the owner did not remove", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();

    const seededId = "33333333-3333-4333-8333-33333333aaaa";
    await ctx.pool.query(
      `INSERT INTO catalog.place_media (id, place_id, kind, url, alt, attribution, sort_order)
       VALUES ($1, $2, 'image', 'https://upload.wikimedia.org/commons/x.jpg',
               '{"en":"Sete Cidades"}'::jsonb,
               '{"author":"Jane Doe","license":"CC BY-SA 4.0","source_url":"https://commons.example/file"}'::jsonb,
               0)`,
      [seededId, id],
    );

    // The owner adds a photo of their own and saves. The editor sends the
    // existing row back by its place_media id, alongside the new asset id.
    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { media: [seededId, ASSET_A] },
    });
    expect(patch.statusCode).toBe(200);

    const rows = await mediaRows(id);
    expect(rows).toHaveLength(2);

    const kept = rows.find((r) => r.id === seededId);
    expect(kept).toBeDefined();
    // The row survived as ITSELF — same id, same url, licence data intact.
    expect(kept!.url).toBe("https://upload.wikimedia.org/commons/x.jpg");
    expect(kept!.attribution).toEqual({
      author: "Jane Doe",
      license: "CC BY-SA 4.0",
      source_url: "https://commons.example/file",
    });
    expect(kept!.alt).toEqual({ en: "Sete Cidades" });
  });

  it("re-orders a kept row without rewriting it, so the hero follows the array", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, media: [ASSET_A, ASSET_B] },
    });
    const { id } = create.json<{ id: string }>();
    const before = await mediaRows(id);
    const [rowA, rowB] = before;

    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { media: [rowB!.id, rowA!.id] },
    });
    expect(patch.statusCode).toBe(200);

    const after = await mediaRows(id);
    // Same two rows, same ids — swapped order, nothing recreated.
    expect(after.map((r) => r.id)).toEqual([rowB!.id, rowA!.id]);
    expect(after.map((r) => r.sort_order)).toEqual([0, 1]);

    // hero_image_url reads the lowest sort_order image, so the swap moved it.
    const list = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/places-by-action?action_slug=eat",
    });
    const items = list.json<{ items: { id: string; hero_image_url: string | null }[] }>().items;
    expect(items.find((i) => i.id === id)?.hero_image_url).toBe(`/v1/media/${ASSET_B}`);
  });

  it("removes exactly the row the owner took out", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, media: [ASSET_A, ASSET_B] },
    });
    const { id } = create.json<{ id: string }>();
    const [rowA, rowB] = await mediaRows(id);

    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { media: [rowA!.id] },
    });

    const after = await mediaRows(id);
    expect(after.map((r) => r.id)).toEqual([rowA!.id]);
    expect(after.some((r) => r.id === rowB!.id)).toBe(false);
  });

  // A pick toggle or a status flip must not touch the photos. This is also the
  // test that pins zod behaviour: `media` is `.optional()` rather than
  // `.default([])` precisely so an absent key can never be read as "empty".
  it("leaves media untouched on a PATCH that does not mention it", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, media: [ASSET_A, ASSET_B] },
    });
    const { id } = create.json<{ id: string }>();

    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { is_hosts_pick: true },
    });
    expect(patch.statusCode).toBe(200);

    const rows = await mediaRows(id);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.url)).toEqual([`/v1/media/${ASSET_A}`, `/v1/media/${ASSET_B}`]);
  });

  it("clears the photos when the owner explicitly sends an empty list", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: { ...VALID_BODY, media: [ASSET_A] },
    });
    const { id } = create.json<{ id: string }>();
    expect(await mediaRows(id)).toHaveLength(1);

    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { media: [] },
    });
    expect(await mediaRows(id)).toHaveLength(0);
  });
});

describe("place action tagging (S6b)", () => {
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
  });

  // The defect this closes: owner-created places carried zero place_action_wish rows,
  // and every action-scoped discovery query INNER JOINs that table — so the place was
  // invisible to guests while looking perfectly fine in the owner console.
  it("a created place is immediately reachable by action-scoped discovery", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    expect(create.statusCode).toBe(201);
    const { id } = create.json<{ id: string }>();

    const byAction = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/places-by-action?action_slug=eat",
    });
    expect(byAction.statusCode).toBe(200);
    const items = byAction.json<{ items: { id: string; wishes: string[] }[] }>().items;
    const found = items.find((i) => i.id === id);
    expect(found).toBeDefined();
    expect(found!.wishes).toContain("sea-view");
  });

  it("hydrated view exposes the action + wish written at create time", async () => {
    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();

    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}/hydrated`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      actions: { slug: string }[];
      wishes: { slug: string; action_slug: string }[];
    }>();
    expect(body.actions.map((a) => a.slug)).toEqual(["eat"]);
    expect(body.wishes).toEqual([
      expect.objectContaining({ slug: "sea-view", action_slug: "eat" }),
    ]);
  });

  it("400s when actions is missing, empty, or an action carries no wish", async () => {
    const noActions: Record<string, unknown> = { ...VALID_BODY };
    delete noActions.actions;
    for (const payload of [
      noActions,
      { ...VALID_BODY, actions: [] },
      { ...VALID_BODY, actions: [{ action_slug: "eat", wish_slugs: [] }] },
    ]) {
      const res = await app.inject({
        headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
        method: "POST",
        url: "/v1/places",
        payload,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json<{ error: string }>().error).toBe("validation_failed");
    }
  });

  it("422s on an unknown action or wish slug, and writes nothing", async () => {
    for (const actions of [
      [{ action_slug: "teleport", wish_slugs: ["sea-view"] }],
      [{ action_slug: "eat", wish_slugs: ["moon-view"] }],
    ]) {
      const res = await app.inject({
        headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
        method: "POST",
        url: "/v1/places",
        payload: { ...VALID_BODY, actions },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json<{ error: string }>().error).toBe("unknown_action_or_wish");
    }

    // The rejected creates must not have left orphan places behind.
    const list = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/places",
    });
    expect(list.json<{ data: unknown[] }>().data).toHaveLength(0);
  });

  it("de-duplicates a repeated action+wish pair instead of 409ing on the composite PK", async () => {
    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: {
        ...VALID_BODY,
        actions: [
          { action_slug: "eat", wish_slugs: ["sea-view", "sea-view"] },
          { action_slug: "eat", wish_slugs: ["sea-view"] },
        ],
      },
    });
    expect(res.statusCode).toBe(201);

    const { id } = res.json<{ id: string }>();
    const hydrated = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}/hydrated`,
    });
    expect(hydrated.json<{ wishes: unknown[] }>().wishes).toHaveLength(1);
  });

  it("PATCH replaces the tag set, and leaves it alone when actions is omitted", async () => {
    // A second action+wish to move the place to.
    const drinkId = "33333333-3333-4333-8333-333333333333";
    await ctx.pool.query(
      `INSERT INTO catalog.action (id, slug, i18n, sort_order, icon)
       VALUES ($1, 'drink', '{"en":"Drink"}'::jsonb, 1, 'wine')`,
      [drinkId],
    );
    await ctx.pool.query(
      `INSERT INTO catalog.wish (id, action_id, slug, i18n, sort_order)
       VALUES ($1, $2, 'cafe', '{"en":"Café"}'::jsonb, 0)`,
      ["44444444-4444-4444-8444-444444444444", drinkId],
    );

    const create = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "POST",
      url: "/v1/places",
      payload: VALID_BODY,
    });
    const { id } = create.json<{ id: string }>();

    // An unrelated PATCH must not disturb the tags.
    await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { address: "Somewhere else" },
    });
    let hydrated = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}/hydrated`,
    });
    expect(hydrated.json<{ actions: { slug: string }[] }>().actions.map((a) => a.slug)).toEqual([
      "eat",
    ]);

    // Supplying actions replaces the set wholesale.
    const patch = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "PATCH",
      url: `/v1/places/${id}`,
      payload: { actions: [{ action_slug: "drink", wish_slugs: ["cafe"] }] },
    });
    expect(patch.statusCode).toBe(200);

    hydrated = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: `/v1/places/${id}/hydrated`,
    });
    const body = hydrated.json<{
      actions: { slug: string }[];
      wishes: { slug: string }[];
    }>();
    expect(body.actions.map((a) => a.slug)).toEqual(["drink"]);
    expect(body.wishes.map((w) => w.slug)).toEqual(["cafe"]);
  });

  it("GET /v1/actions returns the taxonomy with wishes nested under their action", async () => {
    const res = await app.inject({
      headers: { "x-internal-token": TEST_INTERNAL_TOKEN },
      method: "GET",
      url: "/v1/actions",
    });
    expect(res.statusCode).toBe(200);
    const { data } = res.json<{
      data: {
        slug: string;
        icon: string;
        label_i18n: Record<string, string>;
        wishes: { slug: string; label_i18n: Record<string, string> }[];
      }[];
    }>();

    const eat = data.find((a) => a.slug === "eat");
    expect(eat).toBeDefined();
    expect(eat!.icon).toBe("utensils");
    expect(eat!.label_i18n["pt-PT"]).toBe("Comer");
    expect(eat!.wishes).toEqual([expect.objectContaining({ slug: "sea-view" })]);
  });
});

// Container + pool teardown is file-level: both describes share one Postgres, so
// neither may tear it down in its own afterAll (the second suite would find it gone).
afterAll(async () => {
  await closePool();
  await stopTestPostgres(ctx);
});
