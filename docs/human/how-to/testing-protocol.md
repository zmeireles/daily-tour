# Human Testing Protocol

When a delivery touches a user-visible surface, automated tests are not enough. This protocol turns "feature shipped" into "feature verified" through Riff-tracked test tasks that flow in **two directions**:

- **Forward** — engineer pre-creates verification tasks before flipping a plan/PR to DONE
- **Reverse** — tester files found-in-the-wild bug reports without interrupting the engineer's work

Cloned from cc-platform's protocol (single-tester, all-developer, async-friendly shape) with daily-tour-specific surface taxonomy.

## Project

| Riff project | Tester  | Surfaces                                                               |
| ------------ | ------- | ---------------------------------------------------------------------- |
| `dt-tests`   | akadmin | All (PWA guest, PWA backoffice, BFF API, public site, dev-env scripts) |

One project. One tester. No audience split — the tester is also the developer, so technical and UX testing go in the same queue.

## Trigger rule

A plan / PR cannot flip its README or merge to DONE until paired test tasks exist and at least one has passed (or has been explicitly skipped per the table below).

| Surface touched                                                                                | Test task    | Notes                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| **PWA guest** (any route under `/`, `/r/:token`, `/discover`, `/places/:id`, `/tour`, `/chat`) | **required** | The customer-facing surface. Highest leverage.                                       |
| **PWA backoffice** (`/admin/*`)                                                                | **required** | Owner-facing CRUD; broken admin = blocked guesthouse onboarding.                     |
| **BFF API** consumed by a PWA route not covered by an automated e2e                            | **required** | Smoke via browser through the consumer.                                              |
| **Public site** (the marketing `/` for unauthenticated visitors)                               | **required** | First-impression surface.                                                            |
| **Dev-env scripts** (`scripts/dev/dev-up.sh`, `dev-smoke.sh`, `dev-token.sh`)                  | **required** | These ARE our local QA harness; a regression here invalidates every downstream test. |
| **Pure infra / DB migration / docs / CI config**                                               | **skip**     | Compose + lefthook + CI are the gates.                                               |
| **Backend refactor with no consumer change**                                                   | **skip**     | Vitest / pytest coverage is the gate.                                                |
| **Path covered by a green Playwright spec**                                                    | **skip**     | Cite the spec in plan close-out. (None today — plan-002 will add them.)              |

When in doubt → spawn one. Cheap to skip, expensive to miss.

## Env readiness gate (precondition for any UAT run)

**The engineer MUST run `scripts/dev/dev-env-check.sh` before signalling the tester to pull a UAT task into `doing`.** The script snapshots repo state, container health, BFF route registration, PWA dev server, and a fast smoke. It exits 0 only when every check is green; exit 1 means env is NOT ready and the UAT does not run until env is fixed.

**Why this is load-bearing:** a UAT result against a stale or partially-rebuilt dev env is worse than no test — it lies. We hit this exact failure mode in DT-TESTS-3 (UAT-G02): the tester ran the test against a local checkout that hadn't synced post-merge, and the resulting "FAIL" was an env artefact, not a code defect. The gate exists to prevent that recurrence.

**Workflow:**

1. Engineer runs `bash scripts/dev/dev-env-check.sh --markdown`. Output is a paste-ready fingerprint.
2. If verdict is ❌ **ENV NOT READY** — fix the listed failure (rebuild BFF, restart Vite, sync git, etc.), re-run, repeat until ✅.
3. If verdict is ✅ **ENV READY** — paste the fingerprint into the UAT task's `## Setup` section (under the existing setup steps) and signal the tester.
4. Tester pulls task to `doing` only after the fingerprint is present in Setup.

**What the gate checks:**

- **REPO**: git HEAD short SHA + commit subject; current branch + upstream; working-tree cleanliness; ahead/behind state vs upstream.
- **CONTAINERS**: every expected service (postgres, redis, rabbitmq, minio, token-svc, catalog-svc, media-svc, bff, search-svc, planner-svc, chat-hub, notif-svc) is `(healthy)`.
- **BFF ENDPOINTS**: `/health` returns 200; `/r/:token` route registered (302/401/404 for an invalid path-segment); `/v1/auth/refresh` returns `401 no_refresh_cookie` for a cold call. The third probe catches "BFF wasn't rebuilt" — the single highest-payoff check.
- **PWA**: vite dev server bound on :5173; key files for the latest change actually exist on disk (file-presence assertions catch stale local checkouts that no health probe would detect).
- **SMOKE**: catalog has 28 seeded places. Fast (one DB query); skippable with `--skip-smoke` when iterating.

**When the gate fails — common causes + fix:**

| Symptom                         | Fix                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vs upstream: diverged ahead=N` | Stale local main. `git fetch && git reset --hard origin/main` (verify the diverged commits are squash-merged on origin first).                                 |
| `/v1/auth/refresh: 404`         | BFF container is pre-fix. `docker compose --env-file .env -f infra/compose/docker-compose.base.yml -f infra/compose/docker-compose.app.yml up -d --build bff`. |
| `vite dev :5173: not bound`     | Start the PWA dev server: `pnpm --filter @daily-tour/pwa dev`.                                                                                                 |
| `<file>: missing`               | Local checkout is missing the latest code. Same fix as the divergence symptom.                                                                                 |
| `catalog seeded: got '0'`       | Postgres reset without re-seed. `pnpm --filter @daily-tour/catalog-svc run seed`.                                                                              |

**Anti-pattern**: skipping the gate "just this once" because env was green an hour ago. Container drift is real; rebuilds happen silently; HMR sometimes lies. The gate's runtime is ~3 s. Run it.

## Lifecycle

`dt-tests` uses the **Kanban** workflow (`todo → doing → review → done`).

```
Forward flow (engineer-spawned verification):
  engineering plan: review → done
                       │
                       └─► test task : todo → doing → review → done
                                       (engineer)        (tester)  (engineer)

Reverse flow (tester-spawned bug):
  user spots bug while using local dev / staging / prod
                       │
                       └─► test task : review → done
                                       (tester)  (engineer triages)
```

**Forward:**

- Engineer flips plan to `review`, spawns test task at `todo` referencing the plan
- Tester moves to `doing`, runs steps, writes PASS/FAIL in Result, moves to `review`
- Engineer reads result, moves to `done`
  - PASS → plan can flip to DONE
  - FAIL → plan goes back to `doing`; engineer fixes; spawns a **fresh** test task; failed test stays at `done` with FAIL recorded (the trail is the value)

**Reverse:**

- Tester files task directly at `review` with FAIL section pre-filled (steps + screenshot/log + observed behaviour)
- Orchestrator picks up at session-start or plan-close-out checkpoint (see polling ritual below)
- Engineer triages, then closes the loop per the matrix below (NEVER flips straight to `done` on the tester's behalf — that's the tester's call after re-test)

**No "doing" for reverse flow.** Tester doesn't need to claim it before filing — they already saw the bug. Engineer takes ownership at triage.

## Engineer close-the-loop protocol

Status changes are **the visual signal** to the tester. After acting on any `review` row, the engineer must comment + flip status. Without it, the tester has no idea whether the engineer is still triaging or has shipped a fix; the row stays static and the loop never closes.

**State semantics from the tester's POV:**

- `review` = "I filed a result, awaiting engineer triage."
- `todo` = "Engineer touched this, my turn — read the comments and re-test."
- `done` = "PASS recorded by tester, no further work."

**Action matrix:**

| Engineer action after triage                | new status        | comment must include                                                                                                                                        |
| ------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product bug, fix shipped                    | `review` → `todo` | "Fixed in `<sha>`, please re-test"                                                                                                                          |
| Test bug, spec patched (no product change)  | `review` → `todo` | "Test fix in `<sha>` — product behavior unchanged. Re-test if you want to confirm."                                                                         |
| Cannot reproduce, need more info            | `review` → `todo` | "Cannot reproduce — please re-test with browser/OS specifics + reproduction steps."                                                                         |
| Not a bug / works as designed               | `review` → `todo` | "Working as designed because `<reason>`. Closing as not-a-bug — flip to `done` if you agree."                                                               |
| Product bug, queued as backlog (no fix yet) | `review` → `todo` | "Queued as backlog #N — re-test will repro until #N ships. Flipping anyway so you see I touched this; defer re-test or confirm the bug at your discretion." |

**No exceptions on the flip.** Always `review` → `todo` when the engineer acts. The flip is the visual signal — leaving the row at `review` makes it indistinguishable from "engineer hasn't looked yet", defeating the whole point of the protocol. The tester reads the comment and decides whether to re-test now, defer, or re-confirm — that decision is the tester's, not the engineer's.

**Always include in the comment:** what the engineer found (one-liner root cause), what the engineer did (commit SHA _or_ backlog ref), what the tester should do next (re-test, wait, provide more info, or flip to `done`).

### Snapshot + clean before flipping

Before flipping `review` → `todo`, the engineer **must**:

1. **Snapshot** the tester's filled-in `## Result` section (and any prior accumulated runs) into a new comment titled `## Test run history (preserved before description reset)`. Label each run as `Run N — YYYY-MM-DD, PASS/FAIL`, quote-block the original notes.
2. **Reset** the description's `## Result` section back to the empty template:

   ```
   ## Result
   - [ ] PASS
   - [ ] FAIL — paste screenshot / log / repro notes

   (Prior runs preserved in comments. Use this section fresh for the next run.)
   ```

3. **Add** the engineer-triage comment (per the action matrix above).
4. **Flip** the status to `todo`.

**Why:** without snapshot+clean, the next test run accumulates noise in the description — testers see prior failure notes still there, get unsure whether to overwrite or append, and end up with multi-line FAIL blocks mixing runs. The result section becomes hard to read and chronology is lost. Attachments (screenshots) on the row stay because they're separate from description text — only the description's `## Result` text is touched.

## Orchestrator polling ritual

The reverse flow only works if the engineer-side picks up filed tasks reliably. The orchestrator commits to:

1. **Every session start** — `mcp__tasks-prod__list_tasks(project_id='e03901a6-b656-4f38-a768-b98d4fa081cc', statuses=['review'])`. Triage anything found before picking up other work.
2. **After every plan-close-out wave** — same query, scoped to anything referencing the just-closed plan in title or description.
3. **On user request** — "check dt-tests", "any failures?", or similar.

Without this discipline, the reverse flow degrades to "tester writes into the void." With it, the user can file-and-forget without interrupting whatever the orchestrator is doing.

## Task body template

Use this verbatim. Subject prefixes the surface and feature.

**Subject:** `[<surface>] <feature> — <forward|reverse>`

Examples:

- `[pwa-guest] /r/:token guest URL exchange — forward`
- `[pwa-guest] Action drill-down filter rail — reverse` (user-filed bug)

**Body:**

```markdown
## Source

Engineering plan / PR: <number, title>
Surface: <pwa-guest | pwa-backoffice | bff-api | public-site | dev-env>
Flow: <forward | reverse>
Env: <local | staging | prod>

## Setup

<URL, login state, env, devtools panel, terminal commands — whatever applies>

## Steps

1. <action> → <expected observation>
2. <action> → <expected observation>

## Pass criteria (forward flow only — engineer fills before test)

- All steps observe expected outcome
- No console errors / no 500s / no stuck spinners
- **Self-explanatory** — a user landing on this surface cold can figure out what to do without consulting docs (empty-state copy, tooltips, CTAs, doc links in place where context is non-obvious)
- <feature-specific assertions>

## Result

- [ ] PASS
- [ ] FAIL — paste screenshot / log / repro notes
```

Steps are atomic (one action, one observation). Pass criteria are written **before** the test runs — no negotiation about "did it work?" later.

For reverse flow, `Pass criteria` is omitted (the tester already saw the bug — there's no a-priori expectation to assert). Only `Result: FAIL` plus repro details.

## Anti-patterns

- ❌ Skipping the lifecycle and just commenting "tested ✓" on the plan PR — without a Riff task, no audit trail and no orphan-task counter
- ❌ Reusing one test task across multiple deliveries — failure trail gets muddled; each delivery gets its own
- ❌ Closing a `review` test task on the engineer's say-so without confirming the repro — read carefully, run the steps, then close
- ❌ Filing a forward-flow verification task without pass criteria — defeats the "no-negotiation" rule
- ❌ Engineer continuously polling dt-tests during deep work — the cadence is _checkpoint-based_ (session start, plan close-out, on request), not _real-time_

## Bootstrap

- Single Riff project `dt-tests` (id `e03901a6-b656-4f38-a768-b98d4fa081cc`, code `DT-TESTS`, Kanban workflow, created 2026-05-20)
- Backfill 8 verification tasks for already-shipped Plan-001 guest surfaces — see `temp/uat-batch-2026-05-20.md`

## Out of scope (today)

- **Glossary** — single tester is also a developer; no need to define `JWT` / `incognito` / `hard refresh`. If a non-developer tester ever joins (e.g. a guesthouse owner pilot), lift the glossary verbatim from po-platform's `docs/developers/guides/human-testing-protocol.md`.
- **Audience split** — one tester, one queue. po-platform's two-project pattern is right for them, wrong for here.
- **Custom labels beyond `uat`, `passed`, `failed`, `blocked`** — Kanban statuses + a small label palette are enough.
- **Test-task templates as reusable Riff entities** — start with copy-paste; consider templates only if the same shape recurs >5 times.

## Cross-references

- Canonical doctrine: `~/.claude/docs/testing-protocol-setup.md`
- cc-platform reference (closest in shape): `/media/jmeireles/ssd3/my-projects/codecomedy-platform/docs/human/how-to/testing-protocol.md`
- po-platform reference (mixed-skill, audience-split alternative): `/media/jmeireles/ssd3/my-projects/cristina-meireles/po-platform/docs/developers/guides/human-testing-protocol.md`
- UAT body template + 8 backfill tasks: `temp/uat-batch-2026-05-20.md` (gitignored, paste-only artefact)
- Riff feature-request doc: `~/.claude/docs/riff-uat-product-spec-2026-05-20.md` (cross-project; cc-platform queue picks up)
