# Session Handoff — 2026-05-17 03:00 → next session (POST-WAVES-15+16)

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).
>
> **Clean post-cycle state.** Slice 1.0 + Slice 1.1 + Slice 1.2 (BFF half) all closed. **5 PRs merged this session.** No in-flight work; worktrees clean. Next session has **5 🟢 ready tasks** — first parallel launch candidates are T-1.2.1 + T-1.2.2 (Home UI + components).

## TL;DR — exactly what to do next session

1. **Pull main** (this docs PR should already be merged):
   ```bash
   git checkout main && git pull --ff-only origin main
   ```
2. **Pick the next 2 parallel tasks** from the 🟢-ready bucket (5 candidates):
   - **T-1.2.1** — PWA Home (3×2 Action grid + greeting + locale-auto + theme-auto) — **needs Stitch mockup first** (deferred from T-0.4.1); orchestrator should generate via Stitch MCP before launch
   - **T-1.2.2** — PWA components (PlaceCard, ActionGroupHeader, LocationToggle, RangeSlider) — parallel-able with T-1.2.1
   - **T-1.3.0** — BFF `GET /v1/places/:id` hydrated payload — independent BFF route, parallel-able with PWA work
   - **T-1.3.1** — PWA Map setup (MapLibre + PMTiles + MapPin) — independent
   - **T-1.5.0** — PWA Public landing — independent
3. **Recommendation**: launch **T-1.2.2 + T-1.3.0** in parallel (clean separation: PWA components vs BFF route; no shared files; Sonnet-appropriate for both). T-1.2.1 (Home page) needs Stitch mockups generated first — orchestrator does that before the launch.
4. Monitor with `cs-agent status`; standard cycle when both finish.

## Where we are

| Slice                              | Status                                   | Tasks                                                                            |
| ---------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS)        | All slices ✅                                                                    |
| 1.0 — Reservation token & access   | ✅ closed (4/4)                          | T-1.0.0 ✅ · T-1.0.1 ✅ · T-1.0.2 ✅ · T-1.0.3 ✅                                |
| 1.1 — Catalog data model           | ✅ closed (3/3)                          | T-1.1.0 ✅ · T-1.1.1 ✅ · T-1.1.2 ✅                                             |
| 1.2 — Discover (6-action grid)     | 🟡 1/3 done · 2/3 ready                  | **T-1.2.0 ✅** · **T-1.2.1 🟢** · **T-1.2.2 🟢** · T-1.2.3 🔒 (deps 1.2.1+1.2.2) |
| 1.3 — Place detail                 | 🟡 0/3 done · 2/3 ready                  | **T-1.3.0 🟢** · **T-1.3.1 🟢** · T-1.3.2 🔒 (deps 1.3.0+1.3.1+1.2.2)            |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                       | depends on T-1.6.x for OIDC                                                      |
| 1.5 — Ingest skeleton              | 🟢 ready (parallel candidate; unchanged) | Python service, deps T-0.2.2 ✅ + T-0.3.0 ✅                                     |
| 1.6 — Authentik integration        | 🔒                                       | clears 2 deferrals                                                               |

**Phase 1 progress**: 8/25 done. **5 🟢 ready** (T-1.2.1, T-1.2.2, T-1.3.0, T-1.3.1, T-1.5.0). After the next 2-task parallel cycle: 10/25.

## Latest merges (this session, 5 PRs)

| PR  | Title                                                                                    | Merge commit | Merge type                              |
| --- | ---------------------------------------------------------------------------------------- | ------------ | --------------------------------------- |
| #29 | feat(catalog-svc): add CRUD endpoints (places + guesthouses + owner-profiles) (T-1.1.1)  | `b5c6710`    | Human-merged (escalates)                |
| #30 | feat(pwa): add /r/:token route + Zustand session store + auth lib (T-1.0.3)              | `79a1951`    | Human-merged (escalates — auth surface) |
| #31 | docs(handoff): session-end closeout                                                      | `81a9ea6`    | Auto-merged (docs only)                 |
| #32 | docs(plan-001): close T-1.0.3 + T-1.1.1, log Waves 13 + 14                               | `0486b01`    | Auto-merged (docs only)                 |
| #33 | feat(catalog-svc): add 28-place São Miguel seed fixture + idempotent loader (T-1.1.2)    | `89481ff`    | Human-merged (Phase 1+ escalates)       |
| #34 | feat(bff): add /v1/discover aggregator + catalog-svc places-by-action endpoint (T-1.2.0) | `a460694`    | Human-merged (auth-chain escalates)     |

Plus this PR (docs cycle for Waves 15+16) — pending auto-merge.

## Auto-merge counter

**0/3 → likely 1/3 once this PR auto-merges.** Counter was reset by the user's explicit "push t1-1-2", "do it" (merge both #33+#34) instructions this session. The pending docs PR is the only auto-merge candidate currently in the queue.

## Open in-flight cs-agent worktrees

**None.** All worktrees cleaned up at session end:

- ✅ `t1-1-2` killed (post-merge)
- ✅ `t1-2-0` killed (post-merge)
- ⚠️ `plan-028-slice-a` left alone (predates this plan lineage)

## Next launches (T-1.2.2 + T-1.3.0, recommended)

Recommended for next-session parallel launch. Both Sonnet-appropriate; disjoint file scopes.

### T-1.2.2 — PWA: PlaceCard + ActionGroupHeader + LocationToggle + RangeSlider components

- **owns**: `apps/pwa/src/components/place-card.tsx`, `apps/pwa/src/components/action-group-header.tsx`, `apps/pwa/src/components/location-toggle.tsx`, `apps/pwa/src/components/range-slider.tsx`, `apps/pwa/src/components/__tests__/**`
- **deps**: T-0.4.0 ✅, T-0.4.1 ✅
- **acceptance**:
  - Each component matches the spec in [`docs/exploration/02-ui-design-system.md §5`](../exploration/02-ui-design-system.md).
  - RTL + a11y tests (Storybook deferred).
  - PlaceCard renders distance pill + action chips.
  - RangeSlider supports discrete steps `[1,3,5,10,25]`, debounced 250 ms.
- **Prompt template**: model on `temp/prompt-t-1.0.3.md` for the PWA + vitest + RTL patterns. Sonnet profile. Estimate 60-90 min. Mostly mechanical component work — high Sonnet fit.

### T-1.3.0 — BFF: `GET /v1/places/:id` hydrated payload

- **owns**: `services/bff/src/routes/places.ts`
- **deps**: T-1.1.1 ✅, T-1.0.2 ✅
- **acceptance**:
  - Returns place + media + actions + wishes + i18n description + computed `weather_ok_today` boolean (stubbed `true` in Phase 1; real IPMA call in Phase 3).
  - p95 < 200 ms.
- **Prompt template**: model on `temp/prompt-t-1.2.0.md` (similar BFF aggregator shape). Sonnet profile. Estimate 60-75 min. May need a small catalog-svc extension if the hydrated payload requires a new endpoint (currently `GET /v1/places/:id` returns the bare row; the BFF could add a join layer in JS, or push the join into catalog-svc). The agent should pick — both are reasonable.

### Alternative: T-1.2.1 (PWA Home) — needs Stitch mockup first

- **owns**: `apps/pwa/src/routes/_authed.index.tsx`, `apps/pwa/src/features/home/**`, `apps/pwa/src/lib/theme/**`, `apps/pwa/src/lib/locale/**`
- **deps**: T-0.4.0 ✅, T-0.4.1 ✅, T-1.0.3 ✅
- **acceptance**: 3×2 Action grid + greeting (from token claims) + locale-auto + theme-auto via suncalc
- **Pre-launch action**: **orchestrator must generate the Stitch mockup first** (deferred from T-0.4.1 per the Stitch MCP note in T-0.4.1's resolved entry). Without the mockup, the PWA spec is implicit and the agent may diverge from the intended UX. Generate via `mcp__stitch__generate_screen_from_text` against the design system, then attach the screen ID + the §1 mockup to the prompt.

## Pattern observations carried forward

Session stat update through Wave 16:

- **Agent crash rate this session: Sonnet 2/5 (40%), Opus 2/4 (50%).** Both rates went up. Pattern remains: complexity drives crashes more than profile. Bulk-data-entry tasks (T-1.1.2's 28-row SQL emission) crash near the end as context fills. Recommend Sonnet for **all mechanical Phase 1 tasks** with orchestrator rescue budget always reserved (~15-30 min).
- **Sonnet sits at interactive prompt when "done"** instead of exiting cleanly (observed on T-1.2.0). `cs-agent status` still shows "running" even though work + commit are complete. Workaround: check `git log main..HEAD` on the worktree to see if a clean commit landed; if so, agent is effectively done.
- **Secure-by-default `onRoute` hook pays off** — T-1.2.0 inherited auth without writing any auth code. Pattern continues to work as expected.
- **PR title lowercase-subject rule + cs-agent default title trips orchestrators reliably** — cs-agent creates PR with title "T<branch>" (e.g. "T1 1 2") which violates conventional commits. Always `gh pr edit --title` before CI runs. Habit by now but worth flagging.
- **20 prior pattern observations unchanged** (in [PR #31](https://github.com/zmeireles/daily-tour/pull/31) closeout body + this handoff's prior version).

## Deferrals tracked across the session

Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md). **No new deferrals from Waves 15 + 16**.

| Deferral                                                                | Owner task                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **BFF Docker image: 216 MB vs 200 MB target**                           | Phase 0 / 5 — distroless / OTel sidecar split.                               |
| **token-svc Docker image: 227 MB**                                      | Same investigation as BFF.                                                   |
| **catalog-svc Docker image** (size TBD when first compose-up done)      | Same investigation as BFF.                                                   |
| **Authentik OIDC provider creation**                                    | T-1.6.0.                                                                     |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**      | T-0.3.4 or T-1.6.x.                                                          |
| **Stitch MCP mockup generation**                                        | T-1.2.1 Home (next), T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat. |
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
| **`place.season` column** (for "summer-only", "winter-only" flags)      | T-1.4.x owner-edit may add this if seasonal filtering becomes a UX need.     |
| **Hours/contacts data entry for 28 seeded places**                      | T-1.4.x owner-edit (currently `[]`/`{}` placeholders).                       |
| **Per-place imagery (replace shared Unsplash hero)**                    | T-1.4.x media pipeline + MinIO uploads.                                      |

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md). Nothing to change on GitHub.

## How to resume (step-by-step)

1. **Read this doc.** 5 PRs merged this session; Slice 1.0 + 1.1 + 1.2 (BFF half) closed.
2. **Pull main.** `git checkout main && git pull --ff-only origin main`.
3. **Generate the Stitch Home mockup** (if launching T-1.2.1) via `mcp__stitch__generate_screen_from_text`. Skip if launching T-1.2.2 + T-1.3.0 (recommended path; no mockup needed).
4. **Draft prompts** at `temp/prompt-t-<id>.md` for the chosen 2 tasks.
5. **Launch in parallel** (Sonnet profile, disjoint worktrees).
6. **Monitor + finalise** per the standard cycle (review diffs → push → PR → docs cycle).
7. **Update this handoff** at session end.

## Session ending state checklist

- [x] PRs #29 + #30 + #31 + #32 + #33 + #34 merged (main at `a460694` plus this docs PR)
- [x] Worktrees `t1-1-2` + `t1-2-0` killed
- [x] TODO.md ticked: T-1.1.2 + T-1.2.0 ✅; T-1.2.1 + T-1.2.2 + T-1.3.0 + T-1.3.1 flipped to 🟢; Progress Summary refreshed (21 → 23 done; 3 → 5 ready)
- [x] EXECUTION.md: Waves 15 + 16 appended above Waves 13+14
- [x] cc-platform-feedback.md: no new entries (Waves 15+16 reaffirmed prior gotchas but didn't surface new ones)
- [x] This handoff rewritten for the clean post-merge state
- [x] No in-flight cs-agent worktrees besides legacy `plan-028-slice-a`
- [x] Telegram channel paired; reports continue inline per user instruction at msg #22

Bus number for this session's work is 1 (you). All state is on origin or in this handoff. Next session picks up cleanly from main + the 2-task parallel launch.
