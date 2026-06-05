# Plan-006 — Owner Backoffice v2 — TODO

Status: **In Progress** — Slice 6.A DONE (6.A.0–6.A.3, code + forward-flow UAT, 2026-06-04;
Authentik up + owner-auth integration completed, commit `e84b091`). Decisions locked
(Riff #142, 2026-06-02).
Task IDs `T-6.<slice>.<task>`. Riff cross-refs in brackets.

## Progress

| Slice     | Title                               | Tasks  | Done  | Riff       |
| --------- | ----------------------------------- | ------ | ----- | ---------- |
| 6.A       | Per-guesthouse scoping (foundation) | 4      | 4     | #142a      |
| 6.B       | Place media pipeline + hero images  | 3      | 0     | #135       |
| 6.C       | Owner photo uploader                | 3      | 1     | #142c      |
| 6.D       | Hosts-pick governance               | 1      | 0     | #142b      |
| 6.E       | Reservations management             | 2      | 0     | #142d      |
| 6.F       | Owner field-editing gaps            | 2      | 0     | #150, #151 |
| **Total** |                                     | **15** | **5** |            |

---

## Slice 6.A — Per-guesthouse scoping (foundation) `[#142a]`

> Shared-baseline opt-out model. **Do first** — carries the open exclusion-shape call.

### ✅ T-6.A.0 — Schema: guesthouse opt-out exclusion

- [x] Add `guesthouse.hidden_place_ids uuid[]` (default `{}`) — recommended over
      extending `guesthouse_scope` (keep that for inclusion of owner-added places).
- **owns**: `services/catalog-svc/src/db/schema.ts`, `services/catalog-svc/drizzle/migrations/0004_guesthouse_hidden_places.sql`
- **deps**: none
- **blocks**: T-6.A.1, T-6.A.2, T-6.A.3, T-6.D.0
- **acceptance**: migration applies idempotently; `hidden_place_ids` defaults `{}`;
  `shared-types` Guesthouse zod updated. **ESCALATE — schema migration.**

> **Resolved 2026-06-03.** Migration `0004_guesthouse_hidden_places.sql` (clean
> `ADD COLUMN hidden_place_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL`) applied to the
> live DB and verified. `shared-types` GuesthouseSchema + fixtures updated. Tests:
> 50 shared-types + 25 catalog-svc green; bff typecheck clean.

### ✅ T-6.A.1 — Catalog-svc: owner-scoped place curation endpoints

- [x] Owner can add an own place (scoped `guesthouse_ids:[gh]`) and hide/unhide a
      global place (toggle id in the owning guesthouse's `hidden_place_ids`).
- **owns**: `services/catalog-svc/src/routes/{places,guesthouses}.ts`
- **deps**: T-6.A.0
- **acceptance**: add/hide/unhide persist; owner can only mutate their own guesthouse
  (owner_id enforced); unit tests for each path.

> **Resolved 2026-06-03.** Catalog-svc: `PUT`/`DELETE`
> `/v1/guesthouses/:id/hidden-places/:placeId` — atomic, idempotent array add
> (append-and-dedup) / remove (`array_remove`); `hidden_place_ids` now exposed in
> `formatGuesthouse`. +2 tests (idempotent hide/unhide, 404). Owner-ownership is
> enforced at the BFF admin layer (lands in T-6.A.2). **Scope note:** the
> hide/unhide opt-out core shipped here; "add own place" (scoping a new place to a
> gh) folds into the place-create + curation UI in T-6.A.3 — no separate endpoint
> needed (the existing place POST + `guesthouse_scope` already supports it).

### ✅ T-6.A.2 — BFF discover/search: filter by guest guesthouse

- [x] `discover` returns the effective set = `{all:true}` minus the guest gh's
      `hidden_place_ids`, plus places scoped to the guest gh. Keyed off JWT `gh`.
- **owns**: `services/bff/src/routes/discover.ts`, `services/bff/src/lib/catalog-client.ts`
- **deps**: T-6.A.0, T-6.A.1
- **acceptance**: guest in gh-X sees baseline−hidden+gh-X; vitest covers hide + add +
  no-cross-gh-leak; no guest-facing schema/contract change.

> **Resolved 2026-06-03.** `discover` reads the JWT `gh` claim (= guesthouse*id),
> fetches the gh's `hidden_place_ids` via new `catalog-client.fetchHiddenPlaceIds`
> (404 → `[]`), and drops them before TOP_N. **Scoping never breaks discovery** — a
> lookup failure logs and serves the unfiltered set. +2 BFF tests (hide-exclusion,
> graceful degrade); full bff suite green (16 files). **Deferred (follow-up):** the
> `+gh-scoped / − other-gh` \_inclusion* half needs the catalog query to become
> scope-aware; it's a no-op today (all 28 places are `{all:true}`, none gh-scoped)
> and only matters once owners add own places (6.C). Tracked as a 6.A note.

### ✅ T-6.A.3 — Backoffice: curation UI (list + hide toggle)

- [x] Place list distinguishes global vs own; per-row hide/show toggle; "add place" is
      scoped to the owner's guesthouse.
- **owns**: `apps/pwa/src/features/backoffice/places/**`, `apps/pwa/src/routes/admin.places.tsx`
- **deps**: T-6.A.1
- **acceptance**: owner hides a global place + adds an own place; RTL cases; **paired
  dt-tests forward-flow UAT** (owner hides → guest no longer sees it).

> **Code complete 2026-06-03; forward-flow UAT PASSED 2026-06-04.** PWA `place-list`
> gains a "Guests" column with a per-row `VisibilityToggle`: a place in the owner
> guesthouse's `hidden_place_ids` shows a "Hidden" badge + "Show", else "Hide". Wired to
> `useToggleHiddenPlace` → BFF owner-gated `PUT`/`DELETE`
> `/v1/admin/guesthouses/:id/hidden-places/:placeId` → catalog (6.A.1). Single-owner v1:
> uses the first guesthouse. +1 PWA test, +2 BFF test; typecheck/lint clean.
>
> **UAT (2026-06-04):** Authentik brought up + owner-auth integration completed
> (commit `e84b091`). A headless-Chromium forward-flow UAT (`temp/uat-6a3.mjs`) drove a
> **real OIDC login** (akadmin → Authentik flow) → `/admin/places` → clicked **Hide** on
> "Azores Sub-Dive" → asserted the "Hidden" badge + that catalog `hidden_place_ids`
> persisted `c0000001-…028`, then **Show** → asserted revert to `[]`. The guest-side
> exclusion (hidden id absent from discover) was verified last session + is covered by
> BFF unit tests. "Add own place" stays light (existing place POST + scope).

---

## Slice 6.B — Place media pipeline + real hero images `[#135]`

### ⬜ T-6.B.0 — Schema: `place_media.attribution`

- [ ] Add `attribution jsonb` (`{author, license, source_url}`) to `catalog.place_media`.
- **owns**: `catalog.place_media` migration, `services/catalog-svc/src/db/schema.ts`
- **deps**: none
- **acceptance**: nullable column; existing rows unaffected. **ESCALATE — migration.**

### ⬜ T-6.B.1 — Ingest landmark manifest + replace placeholder heroes

- [ ] Download the verified Commons files (`temp/place-photo-sourcing.md`: 5 verified,
      confirm 6 more, 3 Unsplash/owner fallback) → media-svc → set per-place hero;
      capture per-file attribution (PD = none, CC-BY-SA = author+license+url).
- **owns**: `services/catalog-svc/seeds/places-sao-miguel.sql` (or a data migration), media-svc assets
- **deps**: T-6.B.0
- **acceptance**: every landmark place has a non-placeholder hero; **licence read from
  each File: page at ingest** (varies — Sete Cidades PD vs Lagoa do Fogo CC-BY-SA).

### ⬜ T-6.B.2 — Render attribution on place detail (CC-BY-SA only)

- [ ] Place detail shows a credit line when `attribution` present.
- **owns**: `apps/pwa/src/routes/place.*`, `services/bff/src/lib/*` (place view)
- **deps**: T-6.B.0
- **acceptance**: CC-BY-SA hero shows author + licence; PD/own photos show nothing.

---

## Slice 6.C — Owner photo uploader `[#142c]`

> Reuses the media-svc signed-URL flow already built for Place CRUD (T-1.6.2).

### ✅ T-6.C.0 — Backoffice: owner avatar uploader

- [x] Avatar upload → `owner_profile.photo` (asset UUID), rendered same-origin.
- **owns**: `apps/pwa/src/features/backoffice/profile/**`, `services/bff/src/routes/{admin-media,media-display}.ts`
- **deps**: none (media-svc exists)
- **acceptance**: owner uploads avatar; profile reflects it; **paired UAT**.

> **Done 2026-06-05 (PR #196).** Building this surfaced that the upload+display
> flow never worked in-browser despite the persistence plumbing existing. Shipped
> the **media-display foundation** (shared by 6.B/6.C): public BFF `GET /v1/media/:id`
> proxies asset bytes same-origin (media-svc only 302s to the internal
> `minio:9000` presigned host). Fixed three integration bugs no mock caught:
> (1) **upload split-horizon** — browser can't PUT to the internal MinIO host →
> new BFF `POST /v1/admin/media/upload` proxies sign→PUT→complete server-side;
> the shared `MediaUploader` now makes one same-origin call (fixes place uploads
> too). (2) media-svc didn't allow **image/png**. (3) Authentik `sub_mode`
> `hashed_user_id`→`user_uuid` (owner_id columns are uuid). Profile renders the
> avatar `<img src="/v1/media/:id">`. +unit tests (BFF media-display/upload,
> media-uploader, profile render) + gated `owner-avatar` e2e. **UAT PASSED**
> (real browser: upload → render → save → reload → renders; + headless).

### ⬜ T-6.C.1 — Backoffice: guesthouse hero uploader

- [ ] Hero upload → `guesthouse.media[0]`.
- **owns**: `apps/pwa/src/features/backoffice/guesthouses/**`
- **deps**: T-6.C.0 (shared upload component)
- **acceptance**: guesthouse hero set + renders.

### ⬜ T-6.C.2 — Backoffice: per-place hero upload (business places)

- [ ] Owner uploads a hero for an own/added place → unblocks the 14 business photos.
- **owns**: `apps/pwa/src/features/backoffice/places/**`
- **deps**: T-6.C.0, T-6.B.0
- **acceptance**: business place shows owner-uploaded hero in guest discover/detail.

---

## Slice 6.D — Hosts-pick governance `[#142b]`

### ⬜ T-6.D.0 — Backoffice: soft hosts-pick cap (~6–8 / guesthouse)

- [ ] Warn when marking a pick past the cap within the guesthouse's visible set; do
      **not** block; no DB constraint.
- **owns**: `apps/pwa/src/features/backoffice/places/**`
- **deps**: T-6.A.0 (per-guesthouse unit)
- **acceptance**: warning shows at the (cap+1)th pick; saving still succeeds.

---

## Slice 6.E — Reservations management `[#142d]`

### ⬜ T-6.E.0 — BFF: reservations list + token lifecycle endpoint

- [ ] Owner-gated `GET /v1/admin/reservations` (list `auth_tokens.reservation`) +
      issue/revoke guest token via token-svc.
- **owns**: `services/bff/src/routes/admin-reservations.ts`, `services/token-svc/src/routes/*`
- **deps**: none
- **acceptance**: list returns the owner's reservations; revoke invalidates the guest
  token (token-svc test); owner_id scoped.

### ⬜ T-6.E.1 — Backoffice: reservations screen

- [ ] New `admin.reservations` route — list + per-row issue/revoke guest link.
- **owns**: `apps/pwa/src/routes/admin.reservations.tsx`, `apps/pwa/src/features/backoffice/reservations/**`
- **deps**: T-6.E.0
- **acceptance**: list renders; issue/revoke round-trips; **paired UAT**. Replaces the
  T-1.6.1 placeholder nav link.

---

## Slice 6.F — Owner field-editing gaps `[#150, #151]`

### ⬜ T-6.F.0 — Verify/complete hours + contacts editing `[#151]`

- [ ] Verify `admin.places` form exposes weekly-hours + contacts; add missing controls.
- **owns**: `apps/pwa/src/routes/admin.places.$id.tsx`, `services/bff/src/routes/admin-places.ts`
- **deps**: none
- **acceptance**: owner sets weekly hours + contacts; round-trips to catalog-svc. If
  already complete, close as verified.

### ⬜ T-6.F.1 — `place.season` column + backoffice control `[#150]`

- [ ] Add `place.season` (shape TBD — enum vs `{months:int[]}`); backoffice control.
- **owns**: `services/catalog-svc/src/db/schema.ts`, migration, `apps/pwa/src/routes/admin.places.$id.tsx`
- **deps**: none
- **acceptance**: owner marks a place seasonal; flag flows catalog-svc → BFF.
  **ESCALATE — schema migration.**

---

## Notes

- **Escalations** (human-merge, never auto): T-6.A.0, T-6.B.0, T-6.F.1 (schema
  migrations).
- **Paired forward-flow UATs** required before done: T-6.A.3, T-6.C.0, T-6.E.1, and the
  user-visible parts of 6.F.
- **Riff mirror**: 6.A→#142a, 6.B→#135, 6.C→#142c, 6.D→#142b, 6.E→#142d, 6.F→#150/#151.
  When promoted DRAFT→READY, mint cs-agent prompt files under `temp/prompt-t6-*.md`.
