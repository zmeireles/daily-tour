import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { startTestPostgres, stopTestPostgres, truncateAll } from "./helpers.js";

// #383 — the locale CHECK accepted six locales while the PWA ships four.
// A reservation created with 'pt-BR' or 'de' produced a guest whose UI was
// entirely English, silently, because it read as a language preference rather
// than a failure.
//
// These run against a real Postgres with the migrations applied, so they assert
// the constraint as the database actually enforces it — not as the drizzle
// schema describes it. Those two drifted apart before and the whole point of
// #383 is that nothing noticed.
const ctx = await startTestPostgres();

const insertGuest = (locale: string) =>
  ctx.pool.query(
    `INSERT INTO auth_tokens.guest (id, display_name, locale, opt_in_flags)
     VALUES (gen_random_uuid(), 'Test Guest', $1, '{"marketing":false,"analytics":false}'::jsonb)`,
    [locale],
  );

describe("locale CHECK constraint", () => {
  beforeEach(async () => {
    await truncateAll(ctx.pool);
  });

  afterAll(async () => {
    await stopTestPostgres(ctx);
  });

  // Positive control first, and it is load-bearing: if the accepted locales did
  // NOT insert, the rejection assertions below would pass for the wrong reason
  // — a broken INSERT rejects everything, including what should be allowed.
  it.each(["en", "pt-PT", "es", "fr"])(
    "accepts %s — the locales the app serves",
    async (locale) => {
      await expect(insertGuest(locale)).resolves.toBeDefined();
    },
  );

  it.each(["pt-BR", "de"])("rejects %s — narrowed out in #383", async (locale) => {
    await expect(insertGuest(locale)).rejects.toThrow(/guest_locale_check/);
  });

  it("rejects an unknown locale", async () => {
    await expect(insertGuest("zz")).rejects.toThrow(/guest_locale_check/);
  });

  it("keeps the reservation constraint in step with the guest one", async () => {
    // The two constraints are separate objects and were narrowed together. A
    // test that only covered `guest` would let them drift on the next edit.
    const { rows } = await ctx.pool.query<{ conname: string; def: string }>(
      `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conname IN ('guest_locale_check', 'reservation_locale_check')
        ORDER BY conname`,
    );
    expect(rows).toHaveLength(2);
    const guest = rows[0]!;
    const reservation = rows[1]!;
    // Compare the accepted sets, not the raw text — Postgres may render the
    // same constraint differently between versions.
    const accepted = (def: string) =>
      [...def.matchAll(/'([a-zA-Z-]+)'::text/g)].map((m) => m[1]).sort();
    expect(accepted(guest.def)).toEqual(accepted(reservation.def));
    expect(accepted(guest.def)).toEqual(["en", "es", "fr", "pt-PT"]);
  });
});
