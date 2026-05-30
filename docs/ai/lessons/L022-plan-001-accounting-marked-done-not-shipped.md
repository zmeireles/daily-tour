# L022 — "Marked done" in TODO.md is a code-merged signal, not a feature-works signal

**Source**: Plan-001 accounting retrospective — `docs/implementation-plans/001-roadmap/retrospective.md`
**Date**: 2026-05-30

## The rule

When a multi-task PR claims to ship multiple `T-X.Y.Z` items, treat each task's TODO.md ✅ tick as **provisional** — proof that code merged with green CI, not proof that the deliverable actually exists or works. Before flipping a slice to "done," verify each task's acceptance criteria with either an automated end-to-end test or a manual reproduction.

## Why it matters

Plan-001 marked 83/84 tasks complete in TODO.md (with real PR refs) — and on 2026-05-30 we found **four** of those completions that hadn't actually shipped the working behavior:

- T-3.0.3 (planner async consumer — never imported anywhere; `__main__.py` literally said "T-3.0.3 will add..." in future tense)
- T-4.0.1 (chat.chat_thread / message / channel_binding tables — never declared; chat-hub has zero Postgres code)
- analytics GRANT (BFF couldn't INSERT to analytics.tour_event — `ALTER DEFAULT PRIVILEGES` only covered future tables, not the pre-existing one)
- Python service migrations (`dev-up.sh` never applied them — `search.place_embedding` existed locally only because someone applied it by hand once at Plan-001 setup)

Each surfaced as a user-facing failure (UAT-G07 BLOCKED, UAT-G08 pass-with-issues, telemetry 500s, planner crash). The cost: hours of debugging four separate bugs that should have been caught at PR-merge time.

## What happened

PR #83 bundled five Plan-001 task IDs (T-4.0.0 → T-4.1.2). The PR's CI was green — unit tests + Lighthouse + audit + gitleaks. Each of the five tasks got a `✅ Resolved 2026-05-17 via PR #83` row in TODO.md with a one-line acceptance gloss. None of those acceptance criteria were re-verified after merge; the slice was marked closed because the PR was.

Two weeks later, UAT-G08 exposed that T-4.0.1's tables don't exist. The PR title said `feat: agent work on t4-0-0 (auto-committed by closer)` — already a hint that the bundling was opaque, but nobody flagged it at the time.

The pattern shows up in 4 of ~84 Plan-001 tasks (~5%). It's not rare; it's the default failure mode when CI doesn't exercise the user journey.

## How to apply

Before marking a Plan-001-style task ✅ in TODO.md, the orchestrator MUST be able to point at one of:

1. **An automated end-to-end test** that exercises the specific deliverable (e.g. for T-3.0.3, an integration test that POSTs `/v1/tour-plans` and asserts terminal status within N seconds — not just a unit test of the worker function).
2. **A worked manual repro** captured in the PR body with command + output (acceptable for one-off slices like locale additions, but flag the gap).

When neither exists, the PR can still merge — but the task ✅ is **provisional**. A separate sweep at slice closeout (or a periodic UAT) must validate before the slice flips to ✅. Bundled-task PRs need this for **every** task they claim, not just the headline.

For Plan-002+, codify the rule in PR templates and in CLAUDE.md's "What 'done' means" section.

## Related

- See `docs/implementation-plans/001-roadmap/retrospective.md` for the full retro: four confirmed instances, four root causes, five prevention proposals (P1-P5).
- L016 (lock-file drift invisible to `tsc`/`eslint`) is a closely related failure mode — same shape: a tool doesn't catch a class of problem, the problem hides until something else hits production traffic.
- L017+L018 (squash-merge title + cs-agent push PR title) document a different but related accounting bug: PR titles that don't truthfully name the scope.
