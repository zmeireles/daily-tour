# Daily Tour — Orchestrator Notes

Project-local instructions for any Claude Code session opened in this repo. Layered on top of `~/.claude/CLAUDE.md` (global).

## Read first

- **[`docs/ai/session-handoff.md`](./docs/ai/session-handoff.md)** — most recent session-end state + explicit first-task-of-next-session. **Always check this on resume.**
- [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) — what's being built, locked decisions (D1–D15), open questions.
- [`docs/implementation-plans/001-roadmap/README.md`](./docs/implementation-plans/001-roadmap/README.md) — the master plan; phases 0–5.
- [`docs/implementation-plans/001-roadmap/TODO.md`](./docs/implementation-plans/001-roadmap/TODO.md) — current task state.
- [`docs/implementation-plans/001-roadmap/EXECUTION.md`](./docs/implementation-plans/001-roadmap/EXECUTION.md) — wave-by-wave log.
- [`docs/operations/auto-merge-doctrine.md`](./docs/operations/auto-merge-doctrine.md) — when you may auto-merge a PR.

## Auto-merge authorisation (orchestrator)

You MAY merge a PR autonomously when **all** of:

1. All 6 required CI checks are green.
2. PR belongs to an **auto-mergeable category** per the doctrine (Phase 0 infra, deps, docs, tests, lint fixes).
3. Acceptance criteria from the task TODO are attested in the PR body.
4. Fewer than 3 consecutive auto-merges since the human's last `continue` / `merged` / explicit ack.
5. The human has NOT typed `halt`, `pause`, `stop`, or similar in this session.

Anything else: draft the PR, comment "ready for review", and wait.

**Merge command**: `gh pr merge <num> --squash --auto --delete-branch`.

**Always-escalate** (never auto-merge): schema migrations, security-config changes (`.github/workflows/*`, `lefthook.yml`, `.gitleaks.toml`, secrets), Phase 1+ feature commits, risk-register decisions, CVE-response bumps, infra changes, reverts, doctrine updates, any PR after 2 CI flakes.

See the doctrine for the full list, budget cap, kill switches, and rollback protocol.

## Conventions

- Conventional Commits everywhere (commit messages AND PR titles). Lowercase subject. `lefthook.yml` + `pr-title.yml` both enforce.
- Node 22 via `.nvmrc`; pnpm 9; Turborepo 2.x.
- Python 3.12 via `uv`; ruff + mypy strict + pytest.
- Lint/test/audit gates: same locally (lefthook pre-push) as in CI (`turbo run lint/test --filter=...[HEAD]` and `pnpm audit --prod --audit-level=high`).
- Plan task IDs: `T-<phase>.<slice>.<task>`. cs-agent names use hyphens only (`t0-1-1`), never dots — tmux can't target dotted pane names.

## Human testing protocol

Daily Tour has a paired Riff project `dt-tests` for human verification of UI-touching work. Two flows: **forward** (engineer pre-creates verification task before flipping plan/PR to DONE) and **reverse** (tester files in-the-wild bug at `review`, orchestrator picks up at checkpoint).

**Full protocol**: [`docs/human/how-to/testing-protocol.md`](./docs/human/how-to/testing-protocol.md). Read it once; refer back at lifecycle decision points.

### Orchestrator polling ritual (mandatory)

The reverse flow only works if the engineer-side picks up filed tasks reliably:

1. **Every session start** — `mcp__tasks-prod__list_tasks(project_id='e03901a6-b656-4f38-a768-b98d4fa081cc', statuses=['review'])`. Triage anything found before picking up other work.
2. **After every plan close-out wave** — same query, scoped to anything referencing the just-closed plan.
3. **On user request** — "check dt-tests", "any failures?", or similar.

**dt-tests project ID**: `e03901a6-b656-4f38-a768-b98d4fa081cc` (code `DT-TESTS`, Kanban workflow). Captured in `~/.claude/projects/-media-jmeireles-ssd3-my-projects-daily-tour/memory/reference_dt_tests.md`.

### Forward-flow trigger

A plan / PR cannot flip to DONE until paired test tasks exist and at least one passed. Skip cases: pure infra, DB migration, docs, CI config, backend refactor with no consumer change, path covered by a green Playwright spec.

### When the tasks-prod MCP isn't loaded

If `mcp__tasks-prod__*` tools aren't visible in the session, deliver UAT content as a paste-ready markdown file under `temp/uat-batch-<date>.md`. See `temp/uat-batch-2026-05-20.md` for the reference batch.

## Operational reminders

- Never `cs-agent kill <name>` before `cs-agent push <name>`. Kill removes the worktree; the branch is recoverable via direct `git push` if you forget, but it's an avoidable footgun.
- GitHub Actions workflow shows "failed" with no job logs and jobs stuck in `queued` → runner-allocation flake. `gh run rerun <id>` first; investigate the YAML only if the rerun also fails.
- Major OTel bumps may break: `new Resource()` → `resourceFromAttributes()`, fastify dropped from `auto-instrumentations-node` bundle. Mock factories in tests need matching updates.
- Doc commits via the orchestrator: prettier hook may reformat tables. Run `pnpm exec prettier --write <files>` once and re-commit. Don't fight it.
