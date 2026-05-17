# Session Handoff — 2026-05-17 04:00 → next session (POST-WAVES-17+18)

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).
>
> **Clean post-cycle state.** Slice 1.0 + 1.1 closed. Slice 1.2 at 3/4 (BFF + components done; Home page + drill-down remaining). Slice 1.3 at 1/3 (BFF done; Map setup + Place Detail UI remaining). **8 PRs merged this session** including 3 clean Sonnet self-commits in the latest cycle. **4 🟢 ready tasks** — natural next parallel launches are **T-1.2.1 (PWA Home; needs Stitch mockup first) + T-1.3.1 (Map setup)**.

## TL;DR — exactly what to do next session

1. **Pull main** (this docs PR should already be merged):
   ```bash
   git checkout main && git pull --ff-only origin main
   ```
2. **Pick the next 2 parallel tasks** from the 🟢-ready bucket (4 candidates):
   - **T-1.2.1** — PWA Home (3×2 Action grid + greeting + locale-auto + theme-auto) — **needs Stitch mockup first**
   - **T-1.2.3** — PWA Action drill-down `/a/:action` (composes T-1.2.0 + T-1.2.1 + T-1.2.2 — the action grid wires up real)
   - **T-1.3.1** — PWA Map setup (MapLibre + PMTiles + MapPin) — independent
   - **T-1.5.0** — PWA Public landing — independent (long-standing parallel candidate)
3. **Recommendation**: **T-1.2.1 + T-1.3.1** as the next parallel pair. T-1.2.1 unblocks T-1.2.3 (which depends on T-1.2.1 + T-1.2.2 ✅). T-1.3.1 unblocks T-1.3.2 (Place Detail UI). Both are PWA-only; disjoint file scopes (routes/\_authed.index.tsx + lib/theme/locale vs lib/map/\*).
4. **BEFORE launching T-1.2.1**: orchestrator must generate the Stitch Home mockup. The Stitch design system was set up in T-0.4.1 but no screen generated yet — deferred per the T-0.4.1 resolved-note. Use `mcp__stitch__generate_screen_from_text` with the 3×2 action grid spec from `02-ui-design-system.md §5` (PlaceCard already exists as a component reference) + the §1 visual identity ("Green Island, Volcanic Bones"). Attach the screen ID + a brief mockup description to the prompt.
5. Monitor with `cs-agent status`; standard cycle when both finish.

## Where we are

| Slice                              | Status                            | Tasks                                                     |
| ---------------------------------- | --------------------------------- | --------------------------------------------------------- |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS) | All slices ✅                                             |
| 1.0 — Reservation token & access   | ✅ closed (4/4)                   | T-1.0.0 ✅ · T-1.0.1 ✅ · T-1.0.2 ✅ · T-1.0.3 ✅         |
| 1.1 — Catalog data model           | ✅ closed (3/3)                   | T-1.1.0 ✅ · T-1.1.1 ✅ · T-1.1.2 ✅                      |
| 1.2 — Discover (6-action grid)     | 🟡 3/4 done · 2 ready             | T-1.2.0 ✅ · **T-1.2.1 🟢** · T-1.2.2 ✅ · **T-1.2.3 🟢** |
| 1.3 — Place detail                 | 🟡 1/3 done · 1 ready · 1 blocked | T-1.3.0 ✅ · **T-1.3.1 🟢** · T-1.3.2 🔒 (deps T-1.3.1)   |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                | depends on T-1.6.x for OIDC                               |
| 1.5 — Ingest skeleton              | 🟢 ready (parallel; unchanged)    | T-1.5.0; Python svc, deps T-0.2.2 ✅ + T-0.3.0 ✅         |
| 1.6 — Authentik integration        | 🔒                                | clears 2 deferrals                                        |

**Phase 1 progress**: 10/25 done. **4 🟢 ready** (T-1.2.1, T-1.2.3, T-1.3.1, T-1.5.0). After the next 2-task parallel cycle: 12/25.

## Latest merges (this session, 8 PRs)

| PR  | Title                                                                              | Merge commit | Merge type                          |
| --- | ---------------------------------------------------------------------------------- | ------------ | ----------------------------------- |
| #29 | feat(catalog-svc): CRUD endpoints (T-1.1.1)                                        | `b5c6710`    | Human-merged (escalates)            |
| #30 | feat(pwa): /r/:token + Zustand session (T-1.0.3)                                   | `79a1951`    | Human-merged (auth surface)         |
| #31 | docs(handoff): session-end closeout                                                | `81a9ea6`    | Auto-merged (docs only)             |
| #32 | docs(plan-001): close T-1.0.3 + T-1.1.1, log Waves 13+14                           | `0486b01`    | Auto-merged (docs only)             |
| #33 | feat(catalog-svc): 28-place São Miguel seed (T-1.1.2)                              | `89481ff`    | Human-merged (Phase 1+ escalates)   |
| #34 | feat(bff): /v1/discover + catalog-svc places-by-action (T-1.2.0)                   | `a460694`    | Human-merged (auth-chain escalates) |
| #35 | docs(plan-001): close T-1.1.2 + T-1.2.0, log Waves 15+16                           | `925709b`    | Auto-merged (docs only)             |
| #36 | feat(pwa): PlaceCard + ActionGroupHeader + LocationToggle + RangeSlider (T-1.2.2)  | `31ffd49`    | Human-merged (Phase 1+ escalates)   |
| #37 | feat(bff): /v1/places/:id hydrated + catalog-svc /v1/places/:id/hydrated (T-1.3.0) | `e6c795e`    | Human-merged (auth-chain escalates) |

Plus this PR (docs cycle for Waves 17+18) — pending auto-merge.

## Auto-merge counter

**1/3 → 2/3 once this PR auto-merges.** Reset by your explicit "verify, push, run docs cycle" instruction this session (an explicit ack covering the #36+#37 merges). Pending docs PR is the next auto-merge candidate.

## Open in-flight cs-agent worktrees

**None.** All worktrees cleaned up at session end:

- ✅ `t1-2-2` killed (post-merge)
- ✅ `t1-3-0` killed (post-merge)
- ⚠️ `plan-028-slice-a` left alone (predates this plan lineage)
- ⚠️ `plan-028-slice-b` left alone (appeared this session — not in our kill list)

## Next launches (T-1.2.1 + T-1.3.1, recommended)

Recommended for next-session parallel launch. Both Sonnet-appropriate; disjoint file scopes (different `apps/pwa/src/` subdirectories).

### T-1.2.1 — PWA Home: 6 Action tiles + locale-auto + theme-auto

- **owns**: `apps/pwa/src/routes/_authed.index.tsx`, `apps/pwa/src/features/home/**`, `apps/pwa/src/lib/theme/**`, `apps/pwa/src/lib/locale/**`
- **deps**: T-0.4.0 ✅, T-0.4.1 ✅, T-1.0.3 ✅
- **acceptance**:
  - 3×2 grid of Action tiles (icons + EN/pt-PT labels) using **PlaceCard** + **ActionGroupHeader** from T-1.2.2.
  - Greeting by guest name (from token claims).
  - Theme auto via `suncalc` against São Miguel lat/long; manual override in settings.
  - Locale auto from token; locale switcher in header overflow.
- **Pre-launch action (orchestrator)**: **generate the Stitch Home mockup first** via `mcp__stitch__generate_screen_from_text`. Use the 3×2 action grid spec from `02-ui-design-system.md §5` + the §1 visual identity. Without the mockup, the PWA spec is implicit and the agent may diverge from the intended UX. Attach the screen ID to the prompt.
- **Prompt template**: model on `temp/prompt-t-1.2.2.md` (PWA + RTL patterns). Sonnet profile. Estimate 75-100 min (Stitch mockup integration + theme/locale logic + component composition + tests).

### T-1.3.1 — PWA: Map setup (MapLibre GL JS + PMTiles + custom MapPin)

- **owns**: `apps/pwa/src/lib/map/**`, `apps/pwa/src/components/map-pin.tsx`, `apps/pwa/src/components/map-view.tsx`
- **deps**: T-0.4.0 ✅
- **acceptance**:
  - MapLibre 5.24 + PMTiles 4 loaded; OSM tile style; PMTiles file path configurable.
  - `MapPin` custom SVG (basalt teardrop + tea-green dot + selected ring) per `02-ui-design-system.md §5`.
  - `MapView` accepts `{center, zoom, pins[]}`; `prefers-reduced-motion` disables fly-to.
- **Prompt template**: model on `temp/prompt-t-1.2.2.md` (PWA component patterns; maplibre-gl + pmtiles deps already in PWA package.json). Sonnet profile. Estimate 60-90 min. Mechanical work (load library + render MapView + design custom MapPin SVG); no auth interaction.

### Alternative pair: T-1.2.3 (drill-down) + T-1.5.0 (public landing)

Both are also ready and parallel-able. Trade-off: T-1.2.3 requires composing T-1.2.0 + T-1.2.1 + T-1.2.2 (so makes more sense AFTER T-1.2.1 lands); T-1.5.0 is genuinely independent. The recommended pair (T-1.2.1 + T-1.3.1) is preferred because both close blockers for Slice 1.2/1.3 — but if you prefer to keep momentum on Slice 1.5 (public landing), T-1.2.1 + T-1.5.0 is also valid.

## Pattern observations carried forward

Session stat update through Wave 18:

- **Agent crash rate this session: Sonnet 2/7 (28%), Opus 2/4 (50%).** Sonnet's reliability advantage widening again as the latest 3 Sonnet tasks (T-1.2.0, T-1.2.2, T-1.3.0) all committed cleanly. Pattern: **medium-complexity Phase 1 tasks with tight specs are Sonnet's sweet spot**. T-1.2.2 was the trickiest (4 components + shadcn-add + a11y) and Sonnet handled it cleanly.
- **Sonnet sits at interactive prompt when "done"** (observed again on t1-2-2 + t1-3-0) — same pattern as t1-2-0. `cs-agent status` says "running"; check `git log main..HEAD` on the worktree to confirm a clean commit landed.
- **Catalog-svc scope expansion pattern works.** 2 successful BFF aggregator tasks (T-1.2.0 + T-1.3.0) both added a small dedicated catalog-svc endpoint rather than load-all-and-filter in the BFF. Continue this idiom for T-1.6.x owner-side endpoints.
- **PR title lowercase-subject rule + cs-agent default title** — recurring 30-sec orchestrator rename. **Cross-cut to cc-platform**: cs-agent could read the first non-empty line of `temp/prompt-<name>.md`'s `# T-x.y.z — <subject>` heading and use that as the PR title. Would eliminate the rename entirely.

## Deferrals tracked across the session

Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md). **No new deferrals from Waves 17 + 18**.

| Deferral                                                                | Owner task                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **BFF / token-svc / catalog-svc Docker images: 200 MB+ targets**        | Phase 0 / 5 — distroless / OTel sidecar split.                           |
| **Authentik OIDC provider + forward-auth Proxy binding + outpost**      | T-0.3.4 or T-1.6.x.                                                      |
| **Stitch MCP Home mockup**                                              | Generate BEFORE T-1.2.1 launch (orchestrator action).                    |
| **Stitch MCP mockups: Place Detail, Daily Tour, Chat**                  | Generate BEFORE T-1.3.2, T-3.1.1, T-4.1.1 launches.                      |
| **n8n on dedicated Postgres + auto-revoke flow + revoke gate**          | Phase 5 hardening + RabbitMQ event wiring.                               |
| **CI deploy gate to QA VPS** (T-0.4.4)                                  | Unblocked when QA Ubuntu 24 VPS exists.                                  |
| **Docs/design tokens-light.svg + tokens-dark.svg**                      | Generate when Stitch mockups land.                                       |
| **token-svc asymmetric JWT signing (RS256 / ES256) + JWKS endpoint**    | T-1.6.0.                                                                 |
| **tsx watch + initOtel() startup ordering bug**                         | Native dev workaround: direct `tsx` invocation.                          |
| **BFF refresh-cookie consumer** (re-issue JWT when expired)             | T-1.0.3 deferred; PWA flow may surface the need — could be a follow-up.  |
| **catalog-svc Authentik wrap for owner-side write endpoints**           | T-1.4.x (Owner CRUD slice) + T-1.6.0.                                    |
| **Soft-delete on guesthouses + owner-profiles** (currently hard-delete) | T-1.4.x may add status columns via migration if business needs it.       |
| **`place.season` column** (for "summer-only", "winter-only" flags)      | T-1.4.x owner-edit may add this if seasonal filtering becomes a UX need. |
| **Hours/contacts data entry for 28 seeded places**                      | T-1.4.x owner-edit (currently `[]`/`{}` placeholders).                   |
| **Per-place imagery (replace shared Unsplash hero)**                    | T-1.4.x media pipeline + MinIO uploads.                                  |
| **Real IPMA weather call** (`weather_ok_today` currently always true)   | T-3.2.x — payload contract preserved so BFF/PWA upgrade transparently.   |

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md). Nothing to change on GitHub.

## How to resume (step-by-step)

1. **Read this doc.** 8 PRs merged this session; Phase 1 at 10/25; Slice 1.0+1.1 closed; Slice 1.2 at 3/4; Slice 1.3 at 1/3.
2. **Pull main.** `git checkout main && git pull --ff-only origin main`.
3. **Generate the Stitch Home mockup** (required before T-1.2.1) via `mcp__stitch__generate_screen_from_text`.
4. **Draft prompts** at `temp/prompt-t-1.2.1.md` + `temp/prompt-t-1.3.1.md`.
5. **Launch in parallel** (Sonnet profile, disjoint worktrees).
6. **Monitor + finalise** per the standard cycle.
7. **Update this handoff** at session end.

## Session ending state checklist

- [x] PRs #29 through #37 merged (main at `e6c795e` plus this docs PR)
- [x] Worktrees `t1-2-2` + `t1-3-0` killed
- [x] TODO.md ticked: T-1.2.2 + T-1.3.0 ✅; T-1.2.3 flipped to 🟢; Progress Summary refreshed (23 → 25 done; 5 → 4 ready)
- [x] EXECUTION.md: Waves 17 + 18 appended
- [x] Riff state synced (DAILY-TOUR project: 12 tasks → done, 4 → todo, 2 → in-progress during the cycle; will resync at end-of-session for the final state)
- [x] cc-platform-feedback.md: no new entries (Waves 17+18 reaffirmed prior patterns)
- [x] This handoff rewritten for the clean post-merge state
- [x] No in-flight cs-agent worktrees besides legacy `plan-028-slice-{a,b}`
- [x] Telegram channel paired; reports continue inline per user instruction at msg #22

Bus number for this session's work is 1 (you). All state is on origin or in this handoff. Next session picks up cleanly from main + the 2-task parallel launch.
