# Plan-006 — Owner Backoffice v2 — TODO

Status: **Draft**. Decisions locked (Riff #142, 2026-06-02). All tasks need the dev
stack up. Task IDs `T-6.<slice>.<task>`. Riff cross-refs in brackets.

## Progress

| Slice     | Title                               | Tasks  | Done  | Riff       |
| --------- | ----------------------------------- | ------ | ----- | ---------- |
| 6.A       | Per-guesthouse scoping (foundation) | 4      | 0     | #142a      |
| 6.B       | Place media pipeline + hero images  | 3      | 0     | #135       |
| 6.C       | Owner photo uploader                | 3      | 0     | #142c      |
| 6.D       | Hosts-pick governance               | 1      | 0     | #142b      |
| 6.E       | Reservations management             | 2      | 0     | #142d      |
| 6.F       | Owner field-editing gaps            | 2      | 0     | #150, #151 |
| **Total** |                                     | **15** | **0** |            |

---

## Slice 6.A — Per-guesthouse scoping (foundation) `[#142a]`

> Shared-baseline opt-out model. **Do first** — carries the open exclusion-shape call.

### ⬜ T-6.A.0 — Schema: guesthouse opt-out exclusion

- [ ] Add `guesthouse.hidden_place_ids uuid[]` (default `{}`) — recommended over
      extending `guesthouse_scope` (keep that for inclusion of owner-added places).
- **owns**: `services/catalog-svc/src/db/schema.ts`, `services/catalog-svc/drizzle/migrations/000N_guesthouse_hidden_places.sql`
- **deps**: none
- **blocks**: T-6.A.1, T-6.A.2, T-6.A.3, T-6.D.0
- **acceptance**: migration applies idempotently; `hidden_place_ids` defaults `{}`;
  `shared-types` Guesthouse zod updated. **ESCALATE — schema migration.**

### ⬜ T-6.A.1 — Catalog-svc: owner-scoped place curation endpoints

- [ ] Owner can add an own place (scoped `guesthouse_ids:[gh]`) and hide/unhide a
      global place (toggle id in the owning guesthouse's `hidden_place_ids`).
- **owns**: `services/catalog-svc/src/routes/{places,guesthouses}.ts`
- **deps**: T-6.A.0
- **acceptance**: add/hide/unhide persist; owner can only mutate their own guesthouse
  (owner_id enforced); unit tests for each path.

### ⬜ T-6.A.2 — BFF discover/search: filter by guest guesthouse

- [ ] `discover` returns the effective set = `{all:true}` minus the guest gh's
      `hidden_place_ids`, plus places scoped to the guest gh. Keyed off JWT `gh`.
- **owns**: `services/bff/src/routes/discover.ts`, `services/bff/src/lib/catalog-client.ts`
- **deps**: T-6.A.0, T-6.A.1
- **acceptance**: guest in gh-X sees baseline−hidden+gh-X; vitest covers hide + add +
  no-cross-gh-leak; no guest-facing schema/contract change.

### ⬜ T-6.A.3 — Backoffice: curation UI (list + hide toggle + add-place scope)

- [ ] Place list distinguishes global vs own; per-row hide/show toggle; "add place" is
      scoped to the owner's guesthouse.
- **owns**: `apps/pwa/src/features/backoffice/places/**`, `apps/pwa/src/routes/admin.places.tsx`
- **deps**: T-6.A.1
- **acceptance**: owner hides a global place + adds an own place; RTL cases; **paired
  dt-tests forward-flow UAT** (owner hides → guest no longer sees it).

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

### ⬜ T-6.C.0 — Backoffice: owner avatar uploader

- [ ] Avatar upload → media-svc signed PUT → `owner_profile.photo` (asset UUID).
- **owns**: `apps/pwa/src/features/backoffice/profile/**`, `services/bff/src/routes/admin-media.ts`
- **deps**: none (media-svc exists)
- **acceptance**: owner uploads avatar; profile reflects it; **paired UAT**.

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
