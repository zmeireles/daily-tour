# Session Handoff — 2026-05-26 → 27 → next session

> **Big multi-cycle session.** Resumed from the 2026-05-25 handoff, ran the UAT chain forward, then an autonomous backoffice cycle. **7 PRs merged** (#144–#150), **4 backoffice PRs open for review** (#151–#154), **5 UATs passed** (G05 + hero + slider + retries), and the backoffice's buildable gaps are now either fixed-in-PR or logged-as-blocked. Next: review/merge the 4 open PRs, run the one staged UAT (#19), add the missing form tests, and unblock the product-decision items in #142.

## TL;DR — resume next session

```bash
git checkout main && git fetch origin --prune && git reset --hard origin/main
bash scripts/dev/dev-env-check.sh --markdown          # env gate (Vite likely down — restart below)
pnpm --filter @daily-tour/pwa dev                      # restart Vite if the gate says it's not bound
```

**Then, in order:**

1. **MCP gotcha:** if `mcp__tasks-prod__*` tools aren't visible, run `/mcp` (reconnect `tasks-prod`). At THIS session's start they showed "Connected" in `claude mcp list` but weren't registered to the tool surface until a `/mcp` reconnect. Don't burn time on it — just reconnect.
2. **Polling ritual:** `mcp__tasks-prod__list_tasks(project_id='e03901a6-b656-4f38-a768-b98d4fa081cc', statuses=['review'])` (dt-tests review queue) — was empty at close.
3. **Review/merge the 4 open backoffice PRs** (#151–#154) — see below.

## What got done (2026-05-26 → 27)

**Merged (7):**
| # | What |
|---|---|
| #144 | bff,catalog-svc: forward `place_media` hero_image_url through `/v1/discover` (passthrough; signed-URL chain deferred to #135) |
| #145 | pwa: G05 fixes — maplibre CSS import (map marker), detail `max-w-2xl`, ribbon `scroll-px-4`, **route code-split** (maplibre out of home bundle) |
| #146 | pwa: inline `is_hosts_pick` toggle + badge in admin place list |
| #147 | ci: Lighthouse median-of-3 + server-ready timeout (hardened the flaky single-run perf gate) |
| #148 | pwa: distance slider granularity (1/2/3/5/10/15/20/30 + "Entire island") + tick marks + entire-island (large-km, PWA-only) |
| #149 | pwa: distance-slider value label edge-clamp (no clip at ∞) |
| #150 | pwa: public-landing clarity (GuestBanner + reworded copy) + static SamplePlaces + landing/action `max-w-5xl` |

**UATs (all PASS):** G05 retry (#17), hero image (#16), distance slider (#18, pass-with-2-issues → #137/#138, both now fixed+merged). **dt-tests #19** (landing clarity + samples + width + slider label) is **staged + fingerprinted but NOT yet run** — first UAT to run next session.

**Open PRs — review/merge these first (all gate-green when pushed, escalated; some may be BEHIND main → use "Update branch" then merge):**
| # | What | Risk |
|---|---|---|
| #151 | **place-form media-wipe data-loss fix** (catalog-svc GET returns media; form seeds + preserves it) | HIGH-value (silent data loss) |
| #152 | wire orphaned Beta Dashboard (`/admin/beta` route+nav) + drop dead Reservations link + delete dead `placeholder-pages.tsx` | low |
| #153 | published-only `is_hosts_pick` validation (catalog-svc 422 + toast) | low |
| #154 | profile photo uploader (replaces raw asset-ID input with MediaUploader) | low |

## Riff state (daily-tour project `e98dfe58-…d3df`)

- **Done:** #124, #131, #132, #136, #137, #138 (+ the merged work above).
- **qa (merged, awaiting #19 UAT):** #129, #130, #137, #138.
- **review (open PRs):** #139 (→#151), #140 (→#152), #141 (→#153). #154 ≈ the profile-photo item in #142.
- **#135** — signed media-svc URLs, backlog, gated on real photography (product decision).

## Blockers / backlog — need YOUR decision (logged in #142)

1. **Max-5-picks-per-guesthouse cap** (T-2.2.0 unmet) — "per guesthouse" is ambiguous under the `guesthouse_scope` model (a place can scope to ALL guesthouses). Decide the rule before building.
2. **Per-guesthouse place-scoping UI** — `place-form.tsx` hardcodes `guesthouse_scope:{all:true}`; catalog-svc supports `guesthouse_ids` but no UI. Single- vs multi-guesthouse product decision.
3. **Reservations admin screen** — nav link removed (#152); no reservations backend/model exists. Needs scoping + backend.
4. **Audit trail** for `is_hosts_pick` (low-pri; `audit` schema exists but unused).

## Operational notes / lessons

- **Vite is flaky** on this box — died (SIGTERM) mid-session; restart with `pnpm --filter @daily-tour/pwa dev`. Don't trust it to survive across long gaps.
- **cs-agent auto-commit fallback** fired on most agents this session (generic "agent work… auto-committed by closer" messages + agents skipping `pnpm install`/gates). Orchestrator had to: run gates manually, fix small issues (typecheck `noUncheckedIndexedAccess`, one unused-import lint error), and rely on PR titles (squash-merge) rather than amending. **Lesson:** keep telling agents to `pnpm install` + run gates + self-commit; always verify gates yourself before PR.
- **Footgun avoided:** nearly lost #154's branch by `git branch -D` + `cs-agent kill` before pushing (the `-D` failed because the worktree held the branch, so it survived). **Never kill a worktree before the branch is pushed.**
- **Lighthouse gate** is now median-of-3 (#147) — robust, but PWA PRs take ~2min on that check.
- New memory saved: `feedback_uat_out_of_criteria_findings` (UAT findings outside pass criteria → file separately, still PASS).

## Suggested next-session start (in priority order)

1. **Run dt-tests #19** (the one staged UAT — landing clarity + sample cards + desktop width + slider label). Reconnect MCP + restart Vite + re-fingerprint first (the staged token may have expired). On PASS, flip #129/#130/#137/#138 → done.
2. **Review + merge #151–#154.** #151 (data-loss fix) is the priority. They're independent; merge in any order, "Update branch" if BEHIND. After merge, pre-stage a backoffice UAT (needs an **Authentik staff login** — see human-testing caveat; admin UATs are the one surface that needs the staff IdP, not the guest token flow).
3. **Tests gap (buildable, frontend-only, no decisions):** add RTL tests for `place-form.tsx`, `guesthouse-form.tsx`, `media-uploader.tsx` (recon found these are the only backoffice components with zero tests — and they hold the exact create/edit paths that had bugs this session). Good low-risk parallel agent work.
4. **Unblock #142 items** — bring decisions on: the 5-pick cap rule, single-vs-multi guesthouse scoping, whether to build a reservations screen. Each unlocks a concrete backoffice task. The cap + published-only (#153) together complete T-2.2.0.
5. **#135 signed media URLs** — only worth doing once real photography is sourced (open product decision #2 from the prior handoff; still open).

## Bus number

1 (you). All state on origin + this doc + Riff (`daily-tour` + `dt-tests` projects).
