// Idempotency test for the São Miguel places seed (28 day-1 places + 11
// near-guesthouse POIs = 39; the 14 landmark places carry a hero, businesses
// + POIs are media-less and use the PWA Hero fallback).
// Boots a fresh Testcontainer pg, applies the schema, seeds actions + wishes
// (canonical UUIDs from actions-wishes.sql, required for the FK refs in the
// place_action_wish rows), then applies places-sao-miguel.sql twice and
// asserts row counts are unchanged on re-run.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startTestPostgres, stopTestPostgres, type TestContext } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = resolve(__dirname, "../../seeds");

let ctx: TestContext;
let placesSql: string;

beforeAll(async () => {
  ctx = await startTestPostgres();
  placesSql = await readFile(resolve(SEEDS_DIR, "places-sao-miguel.sql"), "utf8");
  const actionsWishesSql = await readFile(resolve(SEEDS_DIR, "actions-wishes.sql"), "utf8");
  await ctx.pool.query(actionsWishesSql);
}, 90_000);

afterAll(async () => {
  if (ctx) await stopTestPostgres(ctx);
});

describe("places-sao-miguel.sql seed", () => {
  it("loads 40 places + ≥40 action+wish tags + 20 media rows on first apply", async () => {
    await ctx.pool.query(
      "TRUNCATE catalog.place_media, catalog.place_action_wish, catalog.place CASCADE;",
    );
    await ctx.pool.query(placesSql);

    const counts = await readCounts(ctx);
    expect(counts.places).toBe(40);
    // 15 places carry a hero: 14 landmark Commons photos + The Place's 6 owner
    // photos (= 20 media rows). Businesses + the 11 POIs are media-less (the PWA
    // Hero shows a branded fallback).
    expect(counts.media).toBe(20);
    // Each place has ≥1 action+wish tag; multi-action places have more.
    expect(counts.tags).toBeGreaterThanOrEqual(40);
  });

  it("is idempotent — second apply leaves row counts unchanged", async () => {
    const before = await readCounts(ctx);
    await ctx.pool.query(placesSql);
    const after = await readCounts(ctx);

    expect(after.places).toBe(before.places);
    expect(after.tags).toBe(before.tags);
    expect(after.media).toBe(before.media);
  });
});

async function readCounts(
  c: TestContext,
): Promise<{ places: number; tags: number; media: number }> {
  const { rows } = await c.pool.query<{ places: string; tags: string; media: string }>(
    `SELECT
      (SELECT COUNT(*)::text FROM catalog.place) AS places,
      (SELECT COUNT(*)::text FROM catalog.place_action_wish) AS tags,
      (SELECT COUNT(*)::text FROM catalog.place_media) AS media`,
  );
  const r = rows[0];
  return {
    places: Number(r?.places ?? 0),
    tags: Number(r?.tags ?? 0),
    media: Number(r?.media ?? 0),
  };
}
