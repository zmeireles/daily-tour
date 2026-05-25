# Session Handoff — 2026-05-25 → next session (UAT cycle paused; pick up at G05 or backoffice)

> **10 PRs merged across 5-day arc (2026-05-21 → 2026-05-25).** Stood up the `dt-tests` Riff project (runbook + 8 UAT backfill tasks), passed UAT-G01/G02/G03/G04/G06 with retry trails preserved, codified the env-readiness gate as protocol doctrine, filed 11 substantive backlog items in the `daily-tour` Riff project. The PWA happy path is now verified end-to-end through the home + Eat drill-down. **Next: continue UAT (G05, then the likely-blocked G07/G08) OR pivot to a backoffice cycle (admin UI gap is now backlogged).**

## TL;DR — exactly what to do next session

1. **Pull main + sync local state**:

   ```bash
   git checkout main && git fetch origin --prune && git reset --hard origin/main
   ```

2. **Verify env via the readiness gate** (mandatory before any UAT — see §Env-readiness gate below):

   ```bash
   bash scripts/dev/dev-env-check.sh --markdown
   # Exit 0 = ready; exit 1 lists the broken thing with a fix hint
   ```

3. **If env-check passes ✅** — pick one of:
   - **Continue UAT chain** — UAT-G05 (place detail) is the next sensible test. Same authentication flow as G04 (it works). See dt-tests project task code 6.
   - **Pivot to backoffice cycle** — `daily-tour` backlog #131 (Backoffice UI for `is_hosts_pick`) unblocks editorial workflow; #124 (signed media URLs) unblocks real images. Each is plan-sized.

4. **If env-check fails ❌** — the script prints which check failed + the fix command. Common ones:
   - `dt_notif_svc` unhealthy → `docker compose ... up -d notif-svc` (Python startup race; #140 already loosened the timeout 5s→15s)
   - SSH tunnel to VPS Postgres dropped → `tasks-prod` MCP unreachable. Reconnect the tunnel (port 15432) before trying to use Riff MCP tools. See `~/.claude/projects/-media-jmeireles-ssd3-my-projects-codecomedy-platform/memory/reference_tasks_mcp.md`.

5. **Polling ritual** (per project CLAUDE.md §Human testing protocol):
   ```
   mcp__tasks-prod__list_tasks(
     project_id='e03901a6-b656-4f38-a768-b98d4fa081cc',  # dt-tests
     statuses=['review']
   )
   ```
   Currently empty (verified 2026-05-25 17:55 local). Anything new = process before picking up other work.

## What got done in this arc (2026-05-21 → 25)

### dt-tests project bootstrap

- Created `dt-tests` Riff project (id `e03901a6-b656-4f38-a768-b98d4fa081cc`, Kanban workflow)
- Drafted the runbook task + 8 UAT backfill tasks (DT-TESTS-1..9) + 6 retry tasks during the arc
- Adapted the cc-platform testing-protocol pattern verbatim — full doctrine at `docs/human/how-to/testing-protocol.md`
- Memory: `~/.claude/projects/-media-jmeireles-ssd3-my-projects-daily-tour/memory/reference_dt_tests.md`

### UAT cycles closed (5 PASS, with retry trails)

| UAT                           | Final task            | Outcome              | PRs that fixed defects                                     |
| ----------------------------- | --------------------- | -------------------- | ---------------------------------------------------------- |
| **G01** (token exchange)      | DT-TESTS-2            | ✅ PASS              | none (initial verification)                                |
| **G02** (locale switch)       | DT-TESTS-11 (retry-2) | ✅ PASS              | #134 (SessionBootstrap) + #138 (locale-race)               |
| **G06** (session persistence) | DT-TESTS-7            | ✅ PASS              | (same #134 fix)                                            |
| **G03** (Eat drill-down)      | DT-TESTS-13 (retry-2) | ✅ PASS              | #139 (placeholder visibility) + #141 (action-context icon) |
| **G04** (hosts' picks ribbon) | DT-TESTS-15 (retry-2) | ✅ PASS with backlog | #142 (seed marks 4 picks)                                  |

Fail-trail preserved per protocol: DT-TESTS-3, DT-TESTS-5, DT-TESTS-10, DT-TESTS-12, DT-TESTS-14 stay at `done` with `failed` labels.

### PRs landed (this arc)

| #    | Title                                                                    | Cycle         |
| ---- | ------------------------------------------------------------------------ | ------------- |
| #133 | docs(testing): add human testing protocol + orchestrator polling ritual  | bootstrap     |
| #134 | feat(bff,pwa): add /v1/auth/refresh + boot-time session rehydrate        | G02           |
| #137 | chore(testing): add dev-env-check.sh + codify env-readiness gate         | systematic    |
| #138 | fix(pwa): apply JWT locale once at /r/:token exchange, not on remount    | G02 retry     |
| #139 | fix(pwa): render placeholder when PlaceCard heroImageUrl is null         | G03           |
| #140 | fix(infra): bump notif-svc healthcheck timeout 5s → 15s                  | env-readiness |
| #141 | fix(pwa): action-context icon for PlaceCard placeholder (eat → Utensils) | G03 retry     |
| #142 | fix(catalog-svc): mark 4 eat-places as is_hosts_pick in dev seed         | G04           |

(Plus #135 #136 — Lighthouse workflow + budget fixes — between #134 and #137.)

### Env-readiness gate (the load-bearing process innovation of this arc)

The most important meta-deliverable. Codified in #137:

- `scripts/dev/dev-env-check.sh` — single-command env fingerprint (repo HEAD, container health, BFF endpoint registration, Vite, file-presence checks, smoke). Exit 0 = ready, exit 1 with explicit failure list. `--markdown` flag for paste-into-Riff.
- `docs/human/how-to/testing-protocol.md` §Env readiness gate — mandates engineer runs the check before signalling tester. Anti-pattern: "skipping the gate once". This protocol pivot eliminated 2 false UAT failure attributions during the arc (notif-svc healthcheck flake + DT-TESTS-5 spec ambiguity).

### daily-tour backlog filed from UAT cycles

11 items (codes #124-#134) in `daily-tour` Riff project. Headline ones:

- **#124** [bff,catalog-svc] Wire signed media URLs from media-svc into `/v1/discover` `hero_image_url` — substantive image fix (T-1.4.x admin gap)
- **#131** [backoffice] Owner UI to manage `is_hosts_pick` on places (T-1.4.x admin gap)
- **#125-#128** distance slider UX (granularity, tick marks, richer UX, "all island" option)
- **#129** [pwa] PublicIndex vs AuthedIndex visual ambiguity
- **#130** [pwa] SamplePlaces cards look clickable but aren't
- **#132-#134** PlaceCard polish (left-padding, uniform heights, cross-view icon consistency)

## State of `dt-tests` UATs still to run

| Code | Title                            | Notes                                                |
| ---- | -------------------------------- | ---------------------------------------------------- |
| 6    | UAT-G05 — Place detail page      | Next sensible test. Independent path.                |
| 8    | UAT-G07 — Daily tour intake form | Likely blocked ("Plan my day" still "Coming soon").  |
| 9    | UAT-G08 — Chat with host (WS)    | Likely blocked ("Message João" still "Coming soon"). |

## Operational quirks worth knowing

- **`tasks-prod` MCP** = SSH tunnel to VPS PostgreSQL on port 15432. Tunnel sometimes drops between sessions; reconnect first thing if Riff tools fail.
- **notif-svc healthcheck** is finicky under 0.25 CPU limit (Python startup races the 5s probe timeout). #140 bumped to 15s; if it still flakes, bump further or apply the same pattern to other Python services (search-svc, planner-svc, chat-hub).
- **Tester-side env state** — fresh incognito windows are mandatory for any auth-surface UAT. Stale localStorage from previous tests is the load-bearing failure mode. Env-readiness fingerprint comments now boilerplate this.
- **The local Vite dev process** at PID 2653385 has been running since 2026-05-24; it can be left running across sessions but expect it to die on OS reclaim. Restart with `pnpm --filter @daily-tour/pwa dev`.

## Files of note (this arc)

- `docs/human/how-to/testing-protocol.md` — the protocol doc, including §Env readiness gate
- `scripts/dev/dev-env-check.sh` — the gate script
- `apps/pwa/src/components/session-bootstrap.tsx` — boot-time session rehydrate (#134)
- `apps/pwa/src/components/place-card.tsx` — placeholder + `placeholderIcon` prop (#139, #141)
- `services/bff/src/routes/auth-refresh.ts` — refresh endpoint (#134)
- `services/catalog-svc/seeds/places-sao-miguel.sql` — now marks 4 places as hosts' picks (#142)
- `~/.claude/projects/-media-jmeireles-ssd3-my-projects-daily-tour/memory/reference_dt_tests.md` — dt-tests project ID + workflow + backfill table
- `~/.claude/docs/riff-uat-product-spec-2026-05-20.md` — Riff product feedback queued for cc-platform pickup (also filed as Riff task in the `Riff improvements` project, code 27)

## Decisions deferred / open questions

1. **Backoffice cycle vs UAT continuation** — both are valuable; gut says start backoffice (#131 admin UI) because it unblocks editorial review of seed content + opens UAT G07/G08 in time.
2. **Real hero images** — `daily-tour` #124 is the substantive fix; commissioning vs sourcing stock vs ML-generation is an open product decision.
3. **Wish-chip vs action-chip semantics** — confusion surfaced in DT-TESTS-12 triage; current code conflates the two. May warrant a refactor task before more chip-UX work lands.

## Bus number

1 (you). All state on origin + in this handoff + in Riff `dt-tests` and `daily-tour` projects.

---

**Session arc**: Started at "fix the placeholder" (UAT-G03 follow-up from earlier session) and ended having closed 4 full UAT cycles (G02-retry, G03, G04, G06), codified the env-readiness gate as protocol, and filed 11 substantive backlog items. The systematic env-readiness pivot mid-session is the load-bearing innovation — it eliminated false-positive UAT failures (would have looked like code bugs, were actually env drift or spec ambiguity) and produced a reusable fingerprint that future UATs can attach as evidence.

Resume cleanly: pull main → env-check → poll dt-tests review → pick next UAT or pivot to backoffice. Everything else is in this doc.
