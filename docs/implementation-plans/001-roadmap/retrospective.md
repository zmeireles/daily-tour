# Plan-001 — Accounting Retrospective

> **Output of an ad-hoc retro triggered by dt-tests UAT-G07 (2026-05-30).** Plan-001 was marked 83/84 complete in TODO.md and EXECUTION.md, but four substantive items turned out to be **marked done without actually shipping the working behavior**. The same root cause kept recurring; this doc names the pattern, lists the instances, and proposes prevention rules for Plan-002+.

## The pattern: "marked done, didn't ship"

A Plan-001 task ticked complete in `TODO.md` (with a real PR reference), but a critical part of the deliverable never landed in the repo. The PR's CI passed because no automated test exercised the missing piece. The gap stayed invisible until a user-facing journey (UAT, smoke, or production traffic) exposed it — typically weeks later.

Symptom shape:

- TODO.md row carries `✅ T-X.Y.Z` + `> Resolved 2026-MM-DD via PR #NN` + a one-line acceptance gloss
- The PR is real, merged, green
- Code that would exercise the deliverable end-to-end is absent or stubbed
- A future code path that depends on the deliverable fails at runtime with a specific error (`relation does not exist`, `permission denied`, `KeyError`, etc.)

## Confirmed instances (4)

### 1. T-3.0.3 — planner worker consumer never wired

**Marked done via**: PR #72 (May 17). Task brief: "POST /v1/tour-plans async flow with RabbitMQ tour.requested/completed."

**What actually shipped**: only the API endpoint half. `__main__.py` literally said `T-3.0.3 will add an aio-pika consumer...` (future tense — verbatim). `workers/plan_worker.py::process_plan` existed but was never imported anywhere; the publisher half on the POST flow also didn't exist.

**How surfaced**: UAT-G07 2026-05-30. POST /v1/tour-plans inserted a `queued` row, returned 202; nothing consumed the (never-published) message; PWA polled `queued` forever.

**Fixed in**: PR #167 (slice A — transport + stub), PR #168 (slice B — real LLM + RAG pipeline). #143.C remains for IPMA + OSRM + DLQ.

### 2. T-4.0.1 — chat-hub schemas + persistence never shipped

**Marked done via**: PR #83 (May 17) bundled with T-4.0.0/T-4.1.0/T-4.1.1/T-4.1.2 (chat-hub skeleton + driver interface, BFF WebSocket multiplexed channel, guest chat UI, owner inbox — **five tasks in one PR**). Task brief: "Schemas: `chat.chat_thread`, `chat.message`, `chat.channel_binding`."

**What actually shipped**: the WebSocket bridge + chat tile + driver scaffolding shipped; the three named tables never landed. `services/chat-hub` has **zero Postgres code** (no INSERTs, no sqlalchemy imports, no asyncpg use, no migrations directory).

**How surfaced**: UAT-G08 2026-05-30. WebSocket connected, message frame went to chat-hub, server accepted it, did nothing observable. Refresh lost the message (no persistence) because there's no place to load from.

**Fixed in**: PR #175 (2026-05-31) — `migrations/0001_chat_core.sql` (the three `chat.*` tables) + inbound persistence + typed ack frame + `GET /v1/history` read path; bff `GET /v1/chat/history` proxy; pwa history re-hydration on mount. Browser-verified end-to-end via **UAT-G08 / DT-TESTS-23 PASS** (send → reload → message persists; send+ack frames visible). Also fixed a latent `config` bug surfaced on first rebuild since the telegram mount: blank `${VAR:-}` credentials now coerce to `None` (was crashing startup via `aiogram.Bot("")`).

### 3. Analytics GRANT — table-create-vs-default-privileges ordering bug

**Marked done via**: never formally tracked. The `analytics.tour_event` table came from a catalog-svc migration; the GRANT was meant to come from `infra/postgres/init/02-roles.sql`'s `ALTER DEFAULT PRIVILEGES`.

**What actually shipped**: the ALTER DEFAULT PRIVILEGES clause applies to **future** tables created by the owning role. `analytics.tour_event` predated the clause (it was created by a catalog-svc migration that ran before the BFF role's default privilege was declared), so the new GRANT didn't retroactively apply. BFF could SELECT from analytics (USAGE was granted directly) but couldn't INSERT.

**How surfaced**: UAT-G07 2026-05-30 — `POST /v1/telemetry/tour` returned 500 with `permission denied for schema analytics` (PG 42501).

**Fixed in**: PR #166 (explicit `GRANT INSERT ON ALL TABLES IN SCHEMA analytics TO bff` covering existing tables; the DEFAULT PRIVILEGES clause still handles future tables).

### 4. Python services not migrated by dev-up.sh

**Marked done via**: never formally tracked. The dev-up.sh script ran `pnpm db:migrate` for TS services but skipped Python svcs (`search-svc`, `planner-svc`).

**What actually shipped**: the migration _files_ existed (`services/{search,planner}-svc/migrations/0001_*.sql`); the runner did not. `search.place_embedding` happened to exist locally because someone applied that migration by hand at Plan-001 setup time — tribal knowledge, not codified. `planner.tour_plan` never existed on any current local DB until 2026-05-30 when this manifested.

**How surfaced**: UAT-G07 2026-05-30 — planner-svc crashed with `relation "planner.tour_plan" does not exist`.

**Fixed in**: PR #169 (Python svc loop added to dev-up.sh Stage 4, idempotent, applies all `services/<svc>/migrations/*.sql` as the owning role).

## Root causes (in priority order)

### RC1 — PRs that bundle multiple tasks hide unshipped pieces

PR #83 shipped 5 task IDs (T-4.0.0 → T-4.1.2). Each got a `✅ T-X.Y.Z Resolved … via PR #83` row in TODO.md with an "actual delivery" gloss, but **CI didn't separately exercise each task's acceptance criteria**. T-4.0.1's specific deliverable (three chat tables) wasn't tested because no automated test queried them.

Bundling exists for valid reasons (a chat-hub skeleton + its first driver + its first BFF route are tightly coupled and ship together). But the _accounting_ should remain per-task: each T-X.Y.Z gets its own pre-merge acceptance gate, not just a per-PR CI run.

### RC2 — CI tests unit + smoke, not user journeys

The repo has thorough unit + integration tests per service, and a `dev-smoke.sh` that exercises the guest token exchange. But neither covers:

- End-to-end RabbitMQ publish→consume on the planner path
- End-to-end WebSocket → chat-hub → persistence → reload
- Real BFF DB user INSERT on the analytics table

These gaps are the four bugs we found, in order. **What CI doesn't run, CI doesn't catch.** The 6 required CI checks (Lint/Typecheck/Test/Build, Lighthouse, gitleaks, audit, CodeQL, conventional commits) verify code shape, not feature shape.

### RC3 — TODO.md tick = "code merged", not "feature works"

The `✅ T-X.Y.Z Resolved 2026-MM-DD via PR #NN` row is generated when the PR merges. Nobody re-verifies the acceptance criteria at slice closeout. A slice ✅ icon ("Slice 4.0 ✅") is just the AND of its task ✅s — same lie compounded.

### RC4 — Dev-env drift hides incomplete shipping

A developer who manually applied a migration once has it forever (the Postgres volume persists across dev-up.sh runs). They never see the gap on their machine. A fresh checkout / CI / new contributor / production deploy is where the gap manifests — and by then the original PR author has moved on.

## Prevention rules for Plan-002+

### P1 — One-task PRs by default; bundles need explicit per-task acceptance evidence

A PR that touches one task ID is the norm. When a PR genuinely closes multiple tasks (because they're tightly coupled — e.g. a service skeleton + its first migration), the PR body MUST include a per-task acceptance evidence block:

```markdown
## Acceptance evidence

- **T-X.Y.Z**: <link to an automated test that exercises the deliverable, or a worked manual repro with output>
- **T-X.Y.W**: <same>
```

Without this block, the PR is reviewable but the orchestrator marks only the _first_ listed task ✅; the rest stay open until evidence lands.

### P2 — End-to-end smoke tests, per cross-service path

**✅ Local smoke gate shipped (2026-05-31, PR pending).** `scripts/dev/dev-smoke.sh` now exercises all three journeys as Steps 6-8 (verified live, all green):

- POST `/v1/tour-plans` → poll → assert non-queued terminal status within 30 s (ready+steps when `ANTHROPIC_API_KEY` set, else rejected+warn)
- WS connect → send → read back via `GET /v1/chat/history` → assert message persists
- POST `/v1/telemetry/tour` → assert 2xx (analytics INSERT)

These don't replace unit tests; they catch the gaps unit tests structurally can't.

**Still open:** wiring the smoke into **CI** needs the full stack up in GitHub Actions (compose services / testcontainers) — a heavier lift (escalate, touches `.github/workflows/`). Until then the gate is local + the env-check table assertions (P4). Run `bash scripts/dev/dev-smoke.sh` after `dev-up.sh` as the pre-UAT gate.

### P3 — TODO.md tick is provisional until UAT closes

A `✅` in TODO.md means "code merged and CI green." Add a column or a separate marker for "verified by UAT or smoke run." A slice doesn't actually close until every task has both. (Optional: enforce via a CI check that scans for `verified:` keys per task.)

### P4 — `dev-env-check.sh` asserts expected tables

`scripts/dev/dev-env-check.sh` should grow a section that lists expected tables per schema and asserts they exist. If `planner.tour_plan` is missing, the env-check fails loud, not silent. (This is the cheapest of the four — could ship alongside the next dev-env touch.)

### P5 — Bundled-task PR titles must name every task

Today's PR titles often say `feat(planner-svc): T-3.0.3` even when bundling 5 tasks. Move bundle listings into the PR body, but the title still says "T-3.0.3, T-4.0.0, …" so the squash commit message is honest about the scope. Combined with P1, makes hidden bundles harder.

## Action items

- **P1, P2, P3** are process changes — need orchestrator + human alignment before formalising. **This doc is the proposal**; codify in the agent playbook + CLAUDE.md on the next pass.
- **P4** (env-check table assertions) — concrete, mechanical. Ship alongside the next dev-env touch; ~30 min of work.
- **P5** (PR title hygiene) — process, no code. Adopt informally now; codify in the playbook on next sweep.

## Meta — why this retro happened

This retro is **itself** a Plan-002 Slice 2.C output. The Slice 2.C goal was "hardening retrospective" — and the four accounting failures are exactly the kind of hardening signal that justifies the slice. The slice now has:

- T-2.C.0 — TODO.md/EXECUTION.md doc sync (done via PR #162)
- T-2.C.2 — cs-agent closer-fallback fix (done via repo setting + PR #160)
- T-2.C.3 — ESLint test override (already done; verified via PR #161)
- T-2.C.4 — estimate recalibration (done via PR #163)
- T-2.C.5 — lessons L017-L021 + this retro (done via PRs #161 + this PR)
- T-2.C.1 — chat WS eslint retry (open; gated on a concrete repro)

5/6 done. The remaining T-2.C.1 is gated on a real repro that hasn't surfaced.
