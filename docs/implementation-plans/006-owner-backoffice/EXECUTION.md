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
