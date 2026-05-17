# Session Handoff — 2026-05-17 05:00 → next session (SESSION CLOSEOUT)

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).
>
> **Session closeout.** **11 PRs merged this session.** Phase 1 at 12/25 (48%) — Slice 1.0 + 1.1 + 1.5 closed; Slice 1.2 at 3/4; Slice 1.3 at 2/3. **No in-flight work; worktrees clean.** **2 🟢 ready tasks** for next session. Token budget closed out at ~90% to preserve context for resumption.

## TL;DR — exactly what to do next session

1. **Pull main** (this docs PR should already be merged):
   ```bash
   git checkout main && git pull --ff-only origin main
   ```
2. **Pick the next move.** With only 2 🟢 ready (T-1.2.1 + T-1.2.3) and both in Slice 1.2, the next session has two natural patterns:
   - **Sequential**: launch **T-1.2.1 first** (needs Stitch Home mockup pre-launch — see below), then T-1.2.3 once it merges. T-1.2.3 depends on T-1.2.1 ✅, T-1.2.2 ✅, T-1.2.0 ✅.
   - **Sequential + bonus**: launch T-1.2.1, while it runs do a **Stitch mockup pass** for the future Place Detail page (T-1.3.2), then queue T-1.2.3 when T-1.2.1 lands. By session end, T-1.3.2 unblocks (deps T-1.3.0 ✅, T-1.3.1 ✅, T-1.2.2 ✅ — already met!).
3. **CRITICAL: BEFORE launching T-1.2.1**, generate the Stitch Home mockup. The Stitch design system is set up (T-0.4.1) but no Home screen generated yet. Use `mcp__stitch__generate_screen_from_text` with the 3×2 action grid spec from `02-ui-design-system.md §5` (PlaceCard already exists as a component reference) + the §1 visual identity ("Green Island, Volcanic Bones"). Attach the screen ID to the prompt.
4. **Note: T-1.3.2 is actually ready now too!** Check the dependency list — T-1.3.2 deps are T-1.3.0 ✅, T-1.3.1 ✅ (newly), T-1.2.2 ✅ — all met. It's not flagged 🟢 in TODO.md because it requires a **Place Detail Stitch mockup** before launch (per the deferral list). If you generate Stitch mockups for both Home (T-1.2.1) and Place Detail (T-1.3.2), you unlock 2 more tasks for parallel launch.

## Where we are

| Slice                              | Status                               | Tasks                                                                            |
| ---------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS)    | All slices ✅                                                                    |
| 1.0 — Reservation token & access   | ✅ closed (4/4)                      | T-1.0.0 ✅ · T-1.0.1 ✅ · T-1.0.2 ✅ · T-1.0.3 ✅                                |
| 1.1 — Catalog data model           | ✅ closed (3/3)                      | T-1.1.0 ✅ · T-1.1.1 ✅ · T-1.1.2 ✅                                             |
| 1.2 — Discover (6-action grid)     | 🟡 3/4 done · 2 ready                | T-1.2.0 ✅ · **T-1.2.1 🟢** (Stitch mockup needed) · T-1.2.2 ✅ · **T-1.2.3 🟢** |
| 1.3 — Place detail                 | 🟡 2/3 done · 1 ready-pending-mockup | T-1.3.0 ✅ · T-1.3.1 ✅ · **T-1.3.2 🟡** (deps all met; needs Stitch mockup)     |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                   | depends on T-1.6.x for OIDC                                                      |
| **1.5 — Public landing**           | ✅ closed (1/1)                      | T-1.5.0 ✅                                                                       |
| 1.6 — Authentik integration        | 🔒                                   | clears 2 deferrals                                                               |

**Phase 1 progress**: **12/25 done (48%)**. 4 slices closed (1.0, 1.1, 1.5, + technically Phase 0). After T-1.2.1 + T-1.2.3 + T-1.3.2 land (the next 3 tasks): 15/25 (60%), Slice 1.2 + 1.3 both close. Then Slice 1.7 (i18n + PWA install) becomes the natural next batch.

## All merges this session (11 PRs, in order)

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
| #38 | docs(plan-001): close T-1.2.2 + T-1.3.0, log Waves 17+18                           | `20eca81`    | Auto-merged (docs only)             |
| #39 | feat(pwa): MapView + MapPin + map config helpers (T-1.3.1)                         | `fd668f6`    | Human-merged (Phase 1+ escalates)   |
| #40 | feat(pwa): expand / route into public landing (T-1.5.0)                            | `c85ad78`    | Human-merged (Phase 1+ escalates)   |

Plus this PR (docs cycle for Waves 19+20) — pending auto-merge.

**11 feature PRs + 4 docs PRs = 15 PRs merged total this session** if you count this closeout.

## Auto-merge counter

**2/3 → 3/3 once this PR auto-merges.** Counter cap reached. Next docs PR after T-1.2.1+T-1.2.3 cycle should be human-driven (or trigger an explicit user "merge it" ack to reset).

## Open in-flight cs-agent worktrees

**None.** All worktrees cleaned up at session end:

- ✅ `t1-3-1` killed (post-merge)
- ✅ `t1-5-0` killed (post-merge)
- ⚠️ `plan-028-slice-a` left alone (predates this plan lineage)
- ⚠️ `plan-028-slice-b` left alone (appeared this session — not in our kill list)

## Next launches (3 candidates; recommended path inside)

After this cycle, **3 tasks** are actually launchable (with the right prep work):

### T-1.2.1 — PWA Home: 6 Action tiles + locale-auto + theme-auto

- **owns**: `apps/pwa/src/routes/_authed.index.tsx`, `apps/pwa/src/features/home/**`, `apps/pwa/src/lib/theme/**`, `apps/pwa/src/lib/locale/**`
- **deps**: T-0.4.0 ✅, T-0.4.1 ✅, T-1.0.3 ✅ — all met.
- **acceptance**: 3×2 Action grid (using PlaceCard + ActionGroupHeader from T-1.2.2 — already shipped); greeting by guest name from token claims; theme auto via `suncalc` against São Miguel lat/long; locale auto from token; locale switcher in header overflow.
- **Pre-launch action (orchestrator)**: **generate the Stitch Home mockup first**. The Stitch design system is set up (T-0.4.1) but no screen generated yet. Use `mcp__stitch__generate_screen_from_text` with the 3×2 action grid spec from `02-ui-design-system.md §5` + the §1 visual identity. Attach the screen ID + a brief mockup description to the prompt.
- **Prompt template**: model on `temp/prompt-t-1.2.2.md` (PWA + RTL patterns) + `temp/prompt-t-1.5.0.md` (route composition + i18n). Sonnet profile. Estimate 75-100 min.

### T-1.2.3 — PWA Action drill-down route (`/a/:action`)

- **owns**: `apps/pwa/src/routes/_authed.a.$action.tsx`, `apps/pwa/src/features/discover/**`
- **deps**: T-1.2.0 ✅, T-1.2.1 (must complete first), T-1.2.2 ✅
- **acceptance**: Renders grouped-by-wish list using ActionGroupHeader; LocationToggle + RangeSlider working with TanStack Query refetch; default sort = distance from active location; sort menu (Distance/Rating/Name) + group-toggle; virtualised at ≥30 items; Playwright e2e (token → tap Eat → grouped list).
- **Pre-launch dep**: T-1.2.1 must merge first. Sequence: T-1.2.1 → T-1.2.3.
- **Prompt template**: model on `temp/prompt-t-1.5.0.md` + the new T-1.2.1 prompt. Sonnet profile. Estimate 90-120 min (the most complex Slice 1.2 task — composes everything + adds Playwright).

### T-1.3.2 — PWA Place Detail route (`/p/:id`)

- **owns**: `apps/pwa/src/routes/_authed.p.$id.tsx`, `apps/pwa/src/features/place-detail/**`
- **deps**: T-1.3.0 ✅, T-1.3.1 ✅, T-1.2.2 ✅ — **all met after this session!**
- **acceptance**: Hero + embla carousel gallery; i18n description with per-field fallback indicator; map centered on place with single pin (uses MapView from T-1.3.1); action row (Navigate via `geo:`/`maps.apple.com`, Call via `tel:`, Draft DM via `wa.me`); Playwright e2e (token → Eat → place → tap Call).
- **Pre-launch action (orchestrator)**: **generate the Stitch Place Detail mockup first**. Same MCP path as for T-1.2.1's Home mockup; reuse the design system. Attach screen ID to prompt.
- **Prompt template**: model on `temp/prompt-t-1.5.0.md` (route composition) + `temp/prompt-t-1.3.1.md` (Map integration). Sonnet profile. Estimate 90-120 min.

### Recommended next-session sequence

1. Generate **2 Stitch mockups** in one session at start (Home + Place Detail) — efficient batch of MCP calls.
2. **Launch T-1.2.1 + T-1.3.2 in parallel** — disjoint scopes (routes/\_authed.index.tsx + features/home vs routes/\_authed.p.$id.tsx + features/place-detail). Both have prerequisites met.
3. **After both merge**: launch T-1.2.3 alone (depends on T-1.2.1). Slice 1.2 closes.
4. **Docs cycle** with T-1.7.x (i18n + PWA install) flipping to 🟢 — closes Phase 1 to ~60% done.

## Session statistics

**Velocity:**

- **15 PRs merged** (11 feature + 4 docs)
- **Phase 1: 4 → 12 done** (48% complete, up from 16%)
- **Average task wall-clock: ~30-40 min** (under estimates across the board for Sonnet)

**Sonnet vs Opus reliability:**

- Sonnet: **2/9 crashes (22%)** — improved from earlier 40% (Sonnet's last 5 runs all clean)
- Opus: 2/4 crashes (50%) — no Opus runs this session
- **Conclusion**: Sonnet's medium-complexity Phase 1 fit is excellent. Use Sonnet for all mechanical Phase 1 work; reserve Opus for the IPv4-pin/custom-migrator class of insight work.

**Cumulative patterns confirmed:**

- Catalog-svc scope expansion (add small dedicated endpoint, BFF stays slim) works — 2 successful uses (T-1.2.0 + T-1.3.0).
- `onRoute` hook auto-auth inheritance works — 2 confirmed end-to-end auth chains shipped.
- `gh pr update-branch` resolves lockfile conflicts on the 2nd-merged PR — happened on every parallel pair this session.
- PR title rename via `gh pr edit` — recurring 30-sec step. **Cross-cut to cc-platform**: cs-agent could read the first `# T-x.y.z — <subject>` heading from `temp/prompt-<name>.md` and use as PR title.
- Sonnet sits at interactive prompt when done (cs-agent status shows "running"). Always check `git log main..HEAD` on the worktree to confirm clean commit landed.
- maplibre-gl tests require full `vi.mock("maplibre-gl", ...)` to work in jsdom (no WebGL).
- **Watcher correctness**: counting "completed" must use `select(.conclusion == "")` (empty conclusion = in_progress in gh's data shape), NOT just `status == "COMPLETED"`. The latter occasionally returned prematurely on requeued checks (caused #40 "not mergeable" misfire).

## Deferrals tracked across the session

Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md). **No new deferrals from Waves 19 + 20**.

| Deferral                                                                | Owner task                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| **BFF / token-svc / catalog-svc Docker images: 200 MB+ targets**        | Phase 0 / 5 — distroless / OTel sidecar split.   |
| **Authentik OIDC + forward-auth Proxy + outpost wiring**                | T-0.3.4 or T-1.6.x.                              |
| **Stitch Home mockup**                                                  | Generate BEFORE T-1.2.1 launch.                  |
| **Stitch Place Detail mockup**                                          | Generate BEFORE T-1.3.2 launch.                  |
| **Stitch Daily Tour mockup + Chat mockup**                              | Generate BEFORE T-3.1.1, T-4.1.1 launches.       |
| **n8n on dedicated Postgres + auto-revoke flow + revoke gate**          | Phase 5 + RabbitMQ event wiring.                 |
| **CI deploy gate to QA VPS** (T-0.4.4)                                  | Unblocked when QA Ubuntu 24 VPS exists.          |
| **Docs/design tokens-light.svg + tokens-dark.svg**                      | Generate when Stitch mockups land.               |
| **token-svc asymmetric JWT signing (RS256 / ES256) + JWKS endpoint**    | T-1.6.0.                                         |
| **tsx watch + initOtel() startup ordering bug**                         | Native dev workaround: direct `tsx` invocation.  |
| **BFF refresh-cookie consumer** (re-issue JWT when expired)             | T-1.0.3 deferred; PWA flow may surface the need. |
| **catalog-svc Authentik wrap for owner-side write endpoints**           | T-1.4.x + T-1.6.0.                               |
| **Soft-delete on guesthouses + owner-profiles** (currently hard-delete) | T-1.4.x.                                         |
| **`place.season` column**                                               | T-1.4.x owner-edit.                              |
| **Hours/contacts data entry for 28 seeded places**                      | T-1.4.x owner-edit.                              |
| **Per-place imagery (replace shared Unsplash hero)**                    | T-1.4.x media pipeline + MinIO uploads.          |
| **Real IPMA weather call**                                              | T-3.2.x — payload contract preserved.            |
| **Public BFF endpoint for featured places** (T-1.5.0 uses fixture)      | Phase 1.5+ if pattern needed elsewhere.          |
| **`is_hosts_pick = true`** on any seeded place                          | T-1.4.x owner UI.                                |
| **Per-guesthouse place scoping** (all currently `{"all": true}`)        | Phase 1.4+ owner flow.                           |

## Riff project state (DAILY-TOUR)

Synced this session via mcp**tasks-prod**:

- **12 tasks done** (matches TODO.md ✅ count)
- **2 in-progress** (T-1.3.1, T-1.5.0 — will flip to done in the next Riff sync at start of next session)
- **2 todo / ready** (T-1.2.1, T-1.2.3)
- **Phase 1 epic**: in-progress
- **Slice 1.0, 1.1, 1.5 stories**: done
- **Slice 1.2, 1.3 stories**: in-progress

**Note for next session**: re-sync Riff at session start to flip T-1.3.1 + T-1.5.0 to done (this session ran out of token budget before the final Riff update). Use `mcp__tasks-prod__update_task` with task IDs `14930a13-8cc5-44f4-b404-0410582fb53b` (T-1.3.1) and `abc16907-be52-4dde-80c2-cb3d1475c0a0` (T-1.5.0). Also flip T-1.2.3 (`1a433629-76b2-43d2-ad8a-1afa74dc8d00`) to todo since it's ready.

## How to resume (step-by-step)

1. **Read this doc.** 11 feature PRs merged; Phase 1 at 12/25 (48%); Slice 1.0+1.1+1.5 closed.
2. **Pull main.** `git checkout main && git pull --ff-only origin main`.
3. **Re-sync Riff** (3 task updates per the "Riff project state" section above).
4. **Generate 2 Stitch mockups** (Home + Place Detail) via `mcp__stitch__generate_screen_from_text`.
5. **Launch T-1.2.1 + T-1.3.2 in parallel** (the recommended pair). Both deps met; both have Stitch mockups ready; disjoint scopes.
6. **Monitor + finalise** per standard cycle. Watcher: use `select(.conclusion == "")` for the in-progress count, not `status == "COMPLETED"`.
7. **After both merge**: launch T-1.2.3 alone. Slice 1.2 closes.
8. **Docs cycle** + **handoff rewrite** at session end.

## Session ending state checklist

- [x] PRs #29 through #40 merged (12 total) + this docs PR pending
- [x] All worktrees killed (`t1-1-2`, `t1-1-1`, `t1-0-3`, `t1-2-2`, `t1-3-0`, `t1-3-1`, `t1-5-0` — none remain)
- [x] TODO.md: T-1.3.1 + T-1.5.0 ticked ✅; Progress Summary refreshed (25 → 27 done; 4 → 2 ready)
- [x] EXECUTION.md: Waves 19 + 20 appended
- [x] Riff state synced through Waves 13-18 cycle (T-1.3.1+T-1.5.0 + T-1.2.3 flip remain for next session)
- [x] cc-platform-feedback.md: no new entries this cycle
- [x] This handoff rewritten as session closeout
- [x] No in-flight cs-agent worktrees besides legacy `plan-028-slice-{a,b}`
- [x] Telegram channel paired

Bus number for this session's work is 1 (you). All state is on origin or in this handoff. **Next session picks up at 48% Phase 1 progress with a clear 2-Stitch-mockup-then-parallel-launch path forward.**

---

**Session closeout note**: This session was a marathon — 11 feature PRs landed including the first authed feature routes on both grid (T-1.2.0) and detail (T-1.3.0) sides, the 4 PWA component primitives (T-1.2.2), the 28-place São Miguel seed (T-1.1.2), MapLibre foundation (T-1.3.1), the public landing (T-1.5.0), and the catalog-svc CRUD + PWA token router that closed Slice 1.0. The Sonnet-vs-Opus reliability gap shifted decisively in Sonnet's favor for medium-complexity Phase 1 work (5 consecutive clean Sonnet self-commits at session end). Catalog-svc scope expansion is now an established BFF pattern (2 successful uses). Auto-merge counter sits at 3/3 (cap) — pending docs PR will be the third. Next session needs a Stitch mockup pass before the next big launch.
