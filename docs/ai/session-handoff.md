# Session Handoff — 2026-05-17 00:50 → next session (POST-WAVES-13+14)

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).
>
> **Clean post-cycle state.** Slice 1.0 closed. PRs #29 + #30 + #31 all merged this session; worktrees cleaned up; docs cycle for Waves 13 + 14 in this branch. **No in-flight work.** Next session can launch T-1.1.2 + T-1.2.0 in parallel.

## TL;DR — exactly what to do next session

1. **Pull main** (this docs PR should be merged by then; if not, merge it first):
   ```bash
   git checkout main && git pull --ff-only origin main
   ```
2. **Draft the two parallel prompts** at `temp/prompt-t-1.1.2.md` and `temp/prompt-t-1.2.0.md`. Templates are referenced below in §"Next launches".
3. **Launch both in parallel** (Sonnet profile for both, disjoint worktrees):
   ```bash
   cs-agent launch --name t1-1-2 --prompt temp/prompt-t-1.1.2.md --profile claude-sonnet-yolo
   cs-agent launch --name t1-2-0 --prompt temp/prompt-t-1.2.0.md --profile claude-sonnet-yolo
   ```
4. Monitor with `cs-agent status`; when both finish, run the standard cycle: review diffs → push → open PRs → docs cycle when they land.

## Where we are

| Slice                              | Status                                   | Tasks                                                 |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS)        | All slices ✅                                         |
| 1.0 — Reservation token & access   | ✅ closed (4/4)                          | T-1.0.0 ✅ · T-1.0.1 ✅ · T-1.0.2 ✅ · **T-1.0.3 ✅** |
| 1.1 — Catalog data model           | 🟡 2/3 done                              | T-1.1.0 ✅ · T-1.1.1 ✅ · **T-1.1.2 🟢 ready**        |
| 1.2 — Discover (6-action grid)     | 🟢 ready                                 | **T-1.2.0 🟢 ready**                                  |
| 1.3 — Place detail                 | 🔒                                       | depends on Slice 1.1                                  |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                       | depends on T-1.6.x for OIDC                           |
| 1.5 — Ingest skeleton              | 🟢 ready (parallel candidate; unchanged) | Python service, deps T-0.2.2 ✅ + T-0.3.0 ✅          |
| 1.6 — Authentik integration        | 🔒                                       | clears 2 deferrals                                    |

**Phase 1 progress**: 6/25 done. After T-1.1.2 + T-1.2.0 land: 8/25, T-1.2.1 (PWA Home grid) unblocks.

## Latest merges (this session)

| PR  | Title                                                                                   | Merge commit | Merge type                                                                  |
| --- | --------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| #29 | feat(catalog-svc): add CRUD endpoints (places + guesthouses + owner-profiles) (T-1.1.1) | `b5c6710`    | Human-merged (escalates per doctrine)                                       |
| #30 | feat(pwa): add /r/:token route + Zustand session store + auth lib (T-1.0.3, Slice 1.0)  | `79a1951`    | Human-merged (escalates — auth surface)                                     |
| #31 | docs(handoff): session-end closeout — PRs #29 + #30 awaiting merge                      | `81a9ea6`    | Auto-merged (docs only; counter 0/3 → 1/3 after the user's `merge #29` ack) |

## Auto-merge counter

**1/3.** Last session burned:

- #31 (session closeout docs) — auto-merged → 1/3

This session's pending docs PR (Waves 13+14 cycle + this handoff rewrite) will auto-merge if armed → 2/3. Next-session docs PR after T-1.1.2 + T-1.2.0 cycle would push to 3/3 — at which point reset on the user's next explicit ack.

## Open in-flight cs-agent worktrees

**None.** All worktrees cleaned up at session end:

- ✅ `t1-0-3` killed
- ✅ `t1-1-1` killed
- ⚠️ `plan-028-slice-a` left alone (predates this plan lineage — not in our kill list)

## Next launches (T-1.1.2 + T-1.2.0)

Both unblocked by #29 merge. Both Sonnet-appropriate. Disjoint file scopes — safe to parallel-launch.

### T-1.1.2 — 28-place seed fixture loader

- **owns**: `services/catalog-svc/seeds/places-sao-miguel.sql`, `services/catalog-svc/seeds/load.ts`
- **deps**: T-1.1.0 ✅, T-1.1.1 ✅
- **acceptance**:
  - All 28 places from [`docs/exploration/05-tourism-domain.md §2`](../exploration/05-tourism-domain.md) loaded with action+wish tags, EN + pt-PT description placeholders, hours where known, geom, status='published'.
  - Hero photo URLs reference seeded MinIO objects (or stable Unsplash for dev — flagged for replacement).
  - `pnpm --filter @daily-tour/catalog-svc seed:places` is idempotent (fixed UUIDs per the T-1.0.0 lesson).
- **Prompt template**: model on `temp/prompt-t-1.1.0.md`. Sonnet profile. Estimate 60-75 min. Recommend reading `05-tourism-domain.md §2` first to verify the 28-place list is complete.

### T-1.2.0 — BFF aggregator: `GET /v1/discover?action=<>&loc=...&km=...`

- **owns**: `services/bff/src/routes/discover.ts`, `services/bff/src/lib/catalog-client.ts`
- **deps**: T-1.0.2 ✅, T-1.1.1 ✅
- **acceptance**:
  - Query params validated by zod from `shared-types`.
  - Filters by action; geo-filters by haversine; returns top 30 grouped by wish.
  - Response hydrates place-card payload (signed media URLs via T-1.4.x or stable Unsplash placeholder).
  - p95 < 300 ms with 28-place seed (needs T-1.1.2 to test).
  - First real authed feature route — exercises the auth decorator from T-1.0.2 (the `onRoute` hook auto-attaches `authenticate`).
- **Prompt template**: model on `temp/prompt-t-1.0.2.md` for the BFF + auth interaction patterns; reference `services/catalog-svc/src/routes/places.ts` for the catalog-client shape (BFF calls `GET /v1/places?...` on catalog-svc via `dt_internal`). Sonnet profile. Estimate 75-100 min.

## Pattern observations carried forward

Same 20 observations as the prior handoff (PRs #29/30/31 confirmed them rather than added new ones). Key ones to keep in mind for T-1.1.2 + T-1.2.0:

- **Sonnet 1/4 (25%) vs Opus 2/4 (50%) crash rate this session.** Complexity drives crash risk more than profile. T-1.1.2 is lower complexity (data entry + loader) — expect Sonnet clean. T-1.2.0 is higher (auth interaction + new BFF route + cross-service HTTP) — budget orchestrator rescue time.
- **drizzle-orm pg-error wrap** (now 3rd Drizzle gotcha in cc-platform-feedback) — T-1.1.2's loader will hit the same `err.cause.code` pattern if it handles INSERT conflicts.
- **PR title lowercase-subject rule** — pre-PR-create check would save 30s; orchestrator habit by now.

## Deferrals tracked across the session

Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md). **No new deferrals from Waves 13 + 14**.

| Deferral                                                                | Owner task                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **BFF Docker image: 216 MB vs 200 MB target**                           | Phase 0 / 5 — distroless / OTel sidecar split.                               |
| **token-svc Docker image: 227 MB**                                      | Same investigation as BFF.                                                   |
| **catalog-svc Docker image** (size TBD when first compose-up done)      | Same investigation as BFF.                                                   |
| **Authentik OIDC provider creation**                                    | T-1.6.0.                                                                     |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**      | T-0.3.4 or T-1.6.x.                                                          |
| **Stitch MCP mockup generation**                                        | T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat.        |
| **n8n on dedicated Postgres**                                           | Phase 5 hardening.                                                           |
| **CI deploy gate to QA VPS** (T-0.4.4)                                  | Unblocked when QA Ubuntu 24 VPS exists.                                      |
| **Docs/design tokens-light.svg + tokens-dark.svg**                      | Generate when Stitch mockups land.                                           |
| **n8n auto-revoke flow on `reservation.cancelled`**                     | Follow-up after RabbitMQ event wiring.                                       |
| **token-svc revoke endpoint authorization gate**                        | Wrap in mTLS / API-key when n8n auto-revoke lands.                           |
| **token-svc asymmetric JWT signing (RS256 / ES256) + JWKS endpoint**    | T-1.6.0.                                                                     |
| **tsx watch + initOtel() startup ordering bug**                         | Native dev workaround: direct `tsx` invocation.                              |
| **BFF refresh-cookie consumer** (re-issue JWT when expired)             | T-1.0.3 deferred; PWA flow may surface the need — could be a follow-up here. |
| **catalog-svc Authentik wrap for owner-side write endpoints**           | T-1.4.x (Owner CRUD slice) + T-1.6.0.                                        |
| **Soft-delete on guesthouses + owner-profiles** (currently hard-delete) | T-1.4.x may add status columns via new migration if business needs it.       |

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md). Nothing to change on GitHub.

## How to resume (step-by-step)

1. **Read this doc.** Slice 1.0 + most of Slice 1.1 are done; T-1.1.2 + T-1.2.0 are the next two parallel-able tasks.
2. **Pull main.** `git checkout main && git pull --ff-only origin main`.
3. **Draft prompts** at `temp/prompt-t-1.1.2.md` and `temp/prompt-t-1.2.0.md`. See §"Next launches" above for templates + estimates.
4. **Launch both in parallel** (Sonnet profile, disjoint worktrees).
5. **Monitor + finalise** per the standard cycle (review → push → PR → docs cycle).
6. **Update this handoff** at session end with new merges + next launches.

## Session ending state checklist

- [x] PRs #29 + #30 + #31 all merged (main at `81a9ea6` plus this docs PR)
- [x] Worktrees `t1-0-3` + `t1-1-1` killed
- [x] TODO.md ticked: T-1.0.3 + T-1.1.1 ✅; T-1.1.2 + T-1.2.0 flipped to 🟢; Progress Summary refreshed (19 → 21 done)
- [x] EXECUTION.md: Waves 13 + 14 appended verbatim
- [x] cc-platform-feedback.md: 3rd Drizzle gotcha (`err.cause.code`) added to open items
- [x] This handoff rewritten for the clean post-merge state
- [x] No in-flight cs-agent worktrees besides legacy `plan-028-slice-a`
- [x] Telegram channel paired; reports continue inline per user instruction at msg #22

Bus number for this session's work is 1 (you). All state is on origin or in this handoff. Next session picks up cleanly from main + the 2-task parallel launch.
