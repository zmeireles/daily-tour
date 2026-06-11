# Plan-006 — Execution Log

## Wave 1 — 2026-06-03 (Slice 6.A foundation)

Built directly (not cs-agent): 6.A is sequential (schema → API → BFF → UI) and the
schema migration is a careful, escalate-only change. Dev stack up, so each step was
verified against the live DB.

| Task    | Branch                         | Scope                                                                   | Status  |
| ------- | ------------------------------ | ----------------------------------------------------------------------- | ------- |
| T-6.A.0 | `feat/s603-plan006-6a-scoping` | schema: `guesthouse.hidden_place_ids uuid[]` + migration + shared-types | ✅ Done |
| T-6.A.1 | `feat/s603-plan006-6a-scoping` | catalog-svc hide/unhide endpoints + expose field                        | ✅ Done |

### T-6.A.0 — Schema

- **Model decision settled:** `guesthouse.hidden_place_ids uuid[]` (opt-out exclusion),
  not `{all:true, except:[…]}`. Keeps `place.guesthouse_scope` for inclusion; the hidden
  list is a per-guesthouse overlay. (The one open call from the plan — resolved as
  recommended.)
- `drizzle-kit generate --name guesthouse_hidden_places` → `0004_*.sql`, a clean single
  `ADD COLUMN` (no schema-recreate noise). Applied via `db:migrate`; column verified
  `hidden_place_ids | ARRAY` on the live DB.
- `shared-types` GuesthouseSchema gains `hidden_place_ids: z.array(uuid)`; fixture updated.
- **Changes**: `services/catalog-svc/src/db/schema.ts`, `drizzle/migrations/0004_*.sql`,
  `packages/shared-types/src/guesthouse.ts`, `…/__tests__/fixtures.ts`.
- **Tests**: shared-types 50 ✓, catalog-svc 25 ✓, catalog + bff typecheck clean.

### T-6.A.1 — Catalog hide/unhide

- `PUT /v1/guesthouses/:id/hidden-places/:placeId` — idempotent add (append-and-dedup via
  `array_agg(DISTINCT …)`). `DELETE …` — `array_remove`. Both atomic; 404 if gh missing.
- `formatGuesthouse` now returns `hidden_place_ids`.
- Owner-ownership enforcement deferred to the BFF admin layer (T-6.A.2); these internal
  catalog routes do the mutation (matches the existing no-auth-in-catalog pattern).
- "Add own place" needs no new endpoint — existing place POST + `guesthouse_scope` covers
  it; wiring lands in the curation UI (T-6.A.3).
- **Changes**: `services/catalog-svc/src/routes/guesthouses.ts`, `…/__tests__/guesthouses.test.ts` (+2).

## Wave 2 — 2026-06-03 (Slice 6.A — BFF filter)

| Task    | Branch                                  | Scope                                                 | Status  |
| ------- | --------------------------------------- | ----------------------------------------------------- | ------- |
| T-6.A.2 | `feat/s603-plan006-6a2-discover-filter` | BFF discover filters out the guest gh's hidden places | ✅ Done |

### T-6.A.2 — BFF discover filter

- `discover` reads the JWT `gh` claim (= guesthouse_id) and drops places in that
  guesthouse's `hidden_place_ids` (new `catalog-client.fetchHiddenPlaceIds`, 404 → `[]`),
  filtered before TOP_N so hidden places don't consume visible slots.
- **Resilient:** a hidden-places lookup failure logs and serves the unfiltered set —
  scoping never turns discovery into a 5xx.
- **Deferred:** the inclusion half (`+gh-scoped / − other-gh`) needs the catalog query to
  be scope-aware; it's a no-op today (all 28 places `{all:true}`) and only matters once
  owners add own places (6.C).
- **Changes**: `services/bff/src/routes/discover.ts`, `services/bff/src/lib/catalog-client.ts`,
  `…/__tests__/discover.test.ts` (+2). Full bff suite green (16 files).

## Wave 3 — 2026-06-03 (Slice 6.A — curation UI)

| Task    | Branch                              | Scope                                                  | Status                    |
| ------- | ----------------------------------- | ------------------------------------------------------ | ------------------------- |
| T-6.A.3 | `feat/s603-plan006-6a3-curation-ui` | backoffice per-row visibility toggle + BFF owner proxy | 🔄 Code done, UAT pending |

### T-6.A.3 — Backoffice curation UI

- **BFF:** owner-gated `PUT`/`DELETE` `/v1/admin/guesthouses/:id/hidden-places/:placeId`
  proxy → catalog (6.A.1). Single-owner v1: per-gh owner_id check deferred (same posture
  as the other admin-guesthouses routes).
- **PWA:** `place-list` gains a "Guests" column + `VisibilityToggle` — "Hidden" badge +
  "Show" when in `hidden_place_ids`, else "Hide". Wired to `useToggleHiddenPlace` (new
  hook) + `useGuesthouses` (the owner's gh = first row). `GuesthouseRow` gains
  `hidden_place_ids`.
- **Changes**: `services/bff/src/routes/admin-guesthouses.ts` (+2 tests),
  `apps/pwa/src/features/backoffice/{guesthouses/use-guesthouses.ts,places/place-list.tsx}`,
  `…/__tests__/place-list.test.tsx` (+1, fixed em-dash assertion). typecheck/lint clean.
- **i18n note:** new toggle strings use inline English `t()` defaults (matches the existing
  HostsPickToggle pattern); pt-PT/es translations are a minor follow-up.

**Remaining gate for 6.A:** the **forward-flow UAT** for 6.A.3 — owner hides a place in
`/admin` → that place vanishes from the guest's discover. Needs **Authentik up** (owner
login) + bff/catalog containers rebuilt. Ships like #149.

## Wave 4 — 2026-06-05 → 06-07 (Slices 6.C.0/6.C.1/6.D — retroactive entry)

> Backfilled 2026-06-11: the executing sessions updated TODO.md but not this log.

| Task    | PR   | Scope                                                               | Status                  |
| ------- | ---- | ------------------------------------------------------------------- | ----------------------- |
| T-6.C.0 | #196 | media foundation (public `GET /v1/media/:id`) + owner avatar upload | ✅ merged               |
| T-6.C.1 | #197 | guesthouse hero uploader on the 6.C.0 component                     | ✅ merged               |
| T-6.D.0 | #198 | soft hosts-pick cap warning (~6–8/gh)                               | ✅ merged (DT-TESTS-24) |

Also merged in the same arc: #199 stable place ordering (`createdAt`), #200 shell-quote
security override. Detail lives in the PR bodies.

## Wave 5 — 2026-06-11 (crash recovery + backoffice QoL batch + Slice 6.B)

**Context:** the 2026-06-10 session crashed mid-close-out after pushing PRs #201–#203
(all CI green). This session recovered: merged the batch (human ack), minted
DT-TESTS-25/26/27, flipped Riff #154/#155/#156, shipped hygiene (#204 chat-hub
`.gitignore`, #205 docs, #206 otel→ghcr registry fix [escalate]).

| Task    | Branch                             | PR        | Scope                                        | Status                      |
| ------- | ---------------------------------- | --------- | -------------------------------------------- | --------------------------- |
| QoL     | (crashed session's three branches) | #201–#203 | cursor-pointer, locale switcher, pagination  | ✅ merged, UAT pending      |
| T-6.B.0 | `feat/6b0-place-media-attribution` | #207      | `place_media.attribution jsonb` migration    | 🔄 in review (escalate)     |
| T-6.B.1 | `feat/6b1-landmark-heroes`         | #209      | 14 verified Commons landmark heroes + seed   | 🔄 in review (stacked #207) |
| T-6.B.2 | `feat/6b2-attribution-render`      | #208      | attribution credit line catalog→bff→pwa Hero | 🔄 in review (stacked #207) |

### Slice 6.B notes

- **Licences read live at ingest** (Commons API `extmetadata`, plan acceptance): 10 PD
  (Silveira/Noronha e Costa 2008 collection) + 4 attributed — Lagoa do Fogo (BY-SA 3.0),
  Praia de Santa Bárbara (BY 3.0, panoramio/JCNazza), Salto do Cabrito (BY-SA 4.0),
  Portas da Cidade (BY-SA 4.0, Diego Delso). **Zero Unsplash fallbacks** — the sheet's
  three "weak coverage" places all had real Commons files.
- **Design call:** hotlink Commons 1280px thumbs in `place_media.url` (all HEAD-verified 200) rather than ingesting binaries into media-svc/MinIO. Keeps the seed self-contained
  for fresh envs; media-svc stays the owner-upload lane (6.C). Revisit if Commons
  hotlinking ever becomes a constraint.
- **Live dev DB already updated** (UPDATE statements; seed is ON CONFLICT DO NOTHING) —
  heroes render in the PWA _now_; the credit line needs #207+#208 merged + catalog/bff
  rebuild.
- Harnesses (gitignored): `temp/commons-hero-manifest.py` (resolve+licence),
  `temp/finalize-hero-manifest.py` (verify 200s), `temp/rewrite-seed-heroes.py` (seed gen),
  `temp/hero-final.json` (locked manifest).
- **Env note:** `make up` broke — `otel/opentelemetry-collector-contrib:0.125.0` vanished
  from Docker Hub (OTel moved to ghcr). #206 fixes compose; local unblocked via retag.

**Remaining gate for 6.B:** review+merge #207 → #208/#209 retarget to main → rebuild
catalog-svc/bff → forward-flow UAT (hero photos + Lagoa do Fogo credit line).
