# Plan-006 — Owner Backoffice v2

> **Status: Draft.** Feature plan (not a lifecycle phase) — pulled forward from the
> Plan-003/004 readiness arc because the #142 product decisions (2026-06-02) unblocked
> it. Matures the shipped backoffice MVP (Plan-001 Slice 1.6) into a real multi-owner
> curation surface. **Supersedes Plan-004 Slice 4.B** (multi-owner scoping) — see
> [Reconciliation](#reconciliation-with-plan-004) below.

## Overview

Daily Tour ships a curated 28-place São Miguel catalog with a guest-facing PWA and an
Authentik-gated owner backoffice at `/admin`. The backoffice **MVP already shipped**
(Plan-001 Slice 1.6): `/admin` shell, Place CRUD + media upload, Owner profile,
Guesthouse CRUD, hosts-pick toggle. This plan closes the gaps that block a _real_ owner
running a _real_ guesthouse: per-guesthouse curation, a working photo pipeline, pick
governance, reservations management, and the deferred field-editing.

All four product decisions are **locked** (Riff #142, 2026-06-02): soft hosts-pick cap,
avatar+hero uploader, **shared-baseline opt-out** scoping, list+revoke reservations.

## Problem

The shipped MVP treats every owner identically against a globally-visible catalog. Six
concrete gaps block real-owner use:

1. **No per-guesthouse curation.** All 28 places are `guesthouse_scope = {all:true}`;
   every guest of every guesthouse sees the same list. Owners can't tailor.
2. **No real place photos.** All 28 hero images are one shared Unsplash placeholder
   (`seeds/places-sao-miguel.sql`). ~14 landmarks have free-licensed Commons photos
   (manifest ready, Riff #135); ~14 businesses can only come via owner upload.
3. **No owner photo uploader.** `owner_profile.photo` and `guesthouse.media[]` columns
   exist but have no backoffice UI to populate them — and this is the _only_ lawful
   path for the 14 business photos.
4. **Hosts-picks are uncapped.** Unbounded `is_hosts_pick` dilutes the trust signal.
5. **Reservations screen is an unbuilt placeholder.** The `/admin` nav has a
   Reservations link (Plan-001 T-1.6.1) but no `admin.reservations` route exists.
6. **Owner field-editing gaps.** `place.season` was never added (seasonal places like
   whale-watching show year-round); owner hours/contacts editing in `admin.places` is
   unverified (catalog-svc accepts both; the PWA form may be partial).

## Solution

Six slices. **6.A is the foundation** (the scoping model everything else assumes).
6.C unblocks 6.B's business photos. 6.D depends on 6.A. 6.E and 6.F are independent.

### Slice 6.A — Per-guesthouse scoping `[Riff #142a]` — foundation

**Model decision (the one open call):** the current
`place.guesthouse_scope = {all:true} | {guesthouse_ids:[…]}` is **inclusion-only** and
can't express the opt-out "hide". Recommended shape:

- Keep `guesthouse_scope` for **inclusion** (owner-added places scoped to their gh).
- Add `guesthouse.hidden_place_ids uuid[]` for **opt-out** hides of global places.
- Effective visible set for a guesthouse = `{all:true}` places **minus**
  `hidden_place_ids`, **plus** places whose `guesthouse_scope` names this gh.

The guest's guesthouse is already in the JWT `gh` claim — the BFF filters on it. No
guest-facing schema change; the 28 island staples remain the cold-start baseline.

### Slice 6.B — Place media pipeline + real hero images `[Riff #135]`

Add `place_media.attribution`, then ingest: landmark manifest
(`temp/place-photo-sourcing.md` — 5 verified Commons files, 4 public-domain + Lagoa do
Fogo CC BY-SA 3.0; 6 more to confirm; 3 Unsplash/owner fallback) and replace the single
placeholder URL with real per-place signed media-svc URLs. Business hero photos arrive
via **6.C**.

### Slice 6.C — Owner photo uploader `[Riff #142c]`

Backoffice uploaders on the existing media-svc signed-URL flow: owner avatar →
`owner_profile.photo`; guesthouse hero → `guesthouse.media[0]`; and per-place hero for
owner-added / business places (the lawful source for the 14 business photos in 6.B).

### Slice 6.D — Hosts-pick governance `[Riff #142b]` — needs 6.A

Soft cap (~6–8 picks per guesthouse, within its visible set): the backoffice warns past
the limit but does not block. No DB constraint. Depends on 6.A's per-guesthouse unit.

### Slice 6.E — Reservations management `[Riff #142d]` — independent

New `admin.reservations` route + BFF owner-gated endpoint: list
`auth_tokens.reservation` rows and issue/revoke the guest access token (token-svc).
**No** new reservation CRUD (dates/rooms) — that is PMS-sized, deferred.

### Slice 6.F — Owner field-editing gaps `[Riff #150, #151]` — independent

Verify/complete hours + contacts editing in the place form (#151); add `place.season`
column + a backoffice control (#150).

## Reconciliation with Plan-004

Plan-004 (Draft) **Slice 4.B — Multi-owner scoping** sketched a _different, incompatible_
model: `T-4.B.0 — place.guesthouse_id non-null FK` (every place belongs to exactly one
guesthouse — pure opt-in). The #142 decision chose **shared baseline + opt-out**, which
preserves the 28-place cold-start value. **This plan's Slice 6.A supersedes Plan-004
Slice 4.B**; Plan-004 4.B is struck and points here (see that README). 4.A (owner
signup) and 4.C (billing) in Plan-004 are unaffected.

## Files Changed (anticipated)

| Area           | Files                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Scoping schema | `services/catalog-svc/src/db/schema.ts` (`guesthouseTable.hiddenPlaceIds`), new `drizzle/migrations/000N_guesthouse_hidden_places.sql` |
| Scoping API    | `services/catalog-svc/src/routes/{places,guesthouses}.ts`, `services/bff/src/routes/{discover,admin-places}.ts`                        |
| Scoping UI     | `apps/pwa/src/features/backoffice/places/**`, `apps/pwa/src/routes/admin.places.tsx`                                                   |
| Media          | `catalog.place_media` migration (+`attribution`), `seeds/places-sao-miguel.sql`, `services/media-svc/src/routes/*`                     |
| Uploader UI    | `apps/pwa/src/features/backoffice/{profile,guesthouses,places}/**`, `services/bff/src/routes/admin-media.ts`                           |
| Hosts-pick cap | `apps/pwa/src/features/backoffice/places/**` (warn only)                                                                               |
| Reservations   | new `apps/pwa/src/routes/admin.reservations.tsx`, `services/bff/src/routes/admin-reservations.ts`, `services/token-svc/src/routes/*`   |
| Field-editing  | `apps/pwa/src/routes/admin.places.$id.tsx`, `services/catalog-svc/src/routes/places.ts` (`season`)                                     |

## Dependencies + Sequence

```
6.A scoping ──► 6.D cap
6.C uploader ──► 6.B media (business photos)
6.B media (landmark ingest) ── independent
6.E reservations ── independent
6.F field-editing ── independent
```

Build order: **6.A → 6.D**, **6.C → 6.B**, with **6.E** and **6.F** in parallel. Slice
6.A carries the one open model decision; settle it first. All slices need the **dev
stack up** (currently `make down`).

## Testing

- **6.A**: BFF unit tests (guest in gh-X sees baseline minus hidden plus gh-X places);
  forward-flow UAT (owner hides a place → guest no longer sees it).
- **6.B**: ingest dry-run asserts each place has a non-placeholder hero; attribution
  renders for CC-BY-SA files.
- **6.C**: upload → media-svc asset → profile/guesthouse/place reflects it (UAT).
- **6.D**: backoffice warns at the 7th pick; no DB rejection.
- **6.E**: list shows reservations; revoke invalidates the guest token (token-svc test).
- **6.F**: hours/contacts persist round-trip; seasonal place carries the flag.

User-visible slices (6.A, 6.C, 6.E, 6.F) each get a paired dt-tests forward-flow UAT
before flipping to done (per the human-testing protocol).

## Exit criteria

- An owner scopes their guesthouse: adds own places, hides global ones; their guests
  see exactly that set (baseline − hidden + added).
- Every place renders a real (non-placeholder) hero; CC-BY-SA images show attribution.
- Owner uploads avatar + guesthouse hero + business-place photos from the backoffice.
- Marking a 7th+ hosts-pick warns the owner.
- Owner lists reservations and issues/revokes a guest link.
- Owner edits hours/contacts and marks a place seasonal.
- Plan-004 Slice 4.B struck + pointing here; index updated.

## Open decisions

1. **Scoping exclusion shape** (6.A.0) — `guesthouse.hidden_place_ids[]` (recommended)
   vs extending `guesthouse_scope` to `{all:true, except:[…]}`. Pick before building.
2. **Season shape** (6.F.1) — enum (`year_round|summer|winter`) vs `{months:int[]}`.

## References

- Decisions: Riff #142 (locked 2026-06-02) · `temp/142-decisions.md` · memory
  `project_142_backoffice_decisions`.
- Media: Riff #135 · `temp/place-photo-sourcing.md` (landmark manifest).
- Field gaps: Riff #150 (season), #151 (hours/contacts).
- Shipped MVP: `docs/implementation-plans/001-roadmap/TODO.md` Slice 1.6.
- Superseded: `docs/implementation-plans/004-scale-and-monetize/README.md` Slice 4.B.
