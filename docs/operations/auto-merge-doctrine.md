# Auto-Merge Doctrine

> When the orchestrator (Claude Code session) may merge a PR without a human in the loop, what guardrails apply, and how the human kills the autonomy if it goes wrong.

**Last updated**: 2026-05-15
**Owner**: `@zmeireles`
**Status**: Active — enabled at the repo level via GitHub's "Allow auto-merge" setting.

---

## TL;DR

The orchestrator MAY auto-merge a PR when **all** of these hold:

1. **All required CI checks pass** (currently: `Lint / Typecheck / Test / Build`, `gitleaks`, `pnpm audit (prod, high+)`, `CodeQL (JS/TS)`, `PR title (Conventional Commits)`, plus the aggregate CodeQL gate).
2. The PR belongs to an **auto-mergeable category** (see [§ Categories](#categories)).
3. The PR body lists the acceptance criteria from the task TODO and they are all attested as met.
4. The orchestrator has merged **fewer than 3 PRs in a row** without human ack (see [§ Budget cap](#budget-cap)).
5. The user has NOT issued a `halt` / `pause` in this session (see [§ Kill switches](#kill-switches)).

Anything else is **always-escalate**: the orchestrator drafts the PR, comments "ready for review", and waits.

---

## Categories

### Auto-mergeable

PRs in these buckets are low-judgment, high-frequency, and well-covered by CI gates. Auto-merging them is a near-pure speed-up.

| Bucket                       | Example task IDs                                                                               | Why it's safe                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Phase 0 infra**            | T-0.1.x (monorepo, lint config, hooks, CI), T-0.2.x (shared packages), T-0.3.x (Compose infra) | CI catches build/typecheck/audit; rollback is `git revert` + redeploy. |
| **Dependency updates**       | Renovate PRs, lockfile bumps, security patches                                                 | Audit + tests are mechanical signals.                                  |
| **Docs / plan updates**      | `docs/**/*.md`, `EXECUTION.md`, `TODO.md` ticks, plan re-numbering                             | Zero runtime impact.                                                   |
| **Test-only additions**      | `*.test.{ts,py}`, `__tests__/**`, `e2e/**`                                                     | Net-positive coverage; no app-surface change.                          |
| **Linter / formatter fixes** | Reformat sweeps after prettier rules change                                                    | Mechanical.                                                            |

### Always-escalate (human approves)

These need human judgment beyond what CI can verify.

| Bucket                                                         | Why                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Schema migrations** (Drizzle `migrate`, Alembic `up`/`down`) | Data shape changes are not reversible from CI signal alone. Risk: silent data loss.                                                                                            |
| **Security-sensitive files**                                   | `.github/workflows/*`, `lefthook.yml`, `.gitleaks.toml`, Authentik realm config, `pnpm.overrides`, anything under `infra/secrets/`. Risk: lowering a gate or leaking a secret. |
| **Phase 1+ feature commits**                                   | UX, business logic, and integration choices need human review. CI won't catch a wrong-shaped API contract or a bad heuristic.                                                  |
| **Risk register decisions**                                    | R1 (paper test result), R6 (pricing), Q1–Q8 in `REQUIREMENTS.md §11`.                                                                                                          |
| **CVE response**                                               | If a HIGH+ CVE is found by `pnpm audit`, the orchestrator may draft the bump PR but a human approves the merge. (T-0.2.1 OTel bump established this pattern.)                  |
| **Production infra changes**                                   | Anything that touches the QA/Prod VPS, Compose files in `infra/compose/`, or Traefik routing.                                                                                  |
| **Reverts**                                                    | `git revert` PRs always go through a human.                                                                                                                                    |
| **Second CI flake**                                            | If CI fails twice on a PR, treat it as a real signal even if a manual `gh run rerun` clears it. Surface to human.                                                              |

### Borderline (orchestrator judgment, document the call)

- **New service skeleton** (`services/<svc>/` first commit): auto-mergeable if scope is just scaffold + `/health` + Dockerfile and no app routes yet. Otherwise escalate.
- **i18n string additions**: auto-mergeable if every string has every-locale coverage and the missing-keys CI check passes. Otherwise escalate.
- **shadcn component additions**: auto-mergeable if no new pattern is invented; otherwise escalate to maintain design-system coherence.

When the orchestrator picks a borderline case, it MUST note the call in the PR body so the human can flag it after the fact.

---

## Required CI checks (the gate)

These must be green before auto-merge fires:

1. `Lint / Typecheck / Test / Build` (`ci.yml`, the quality job)
2. `gitleaks (secret scan)` (`security.yml`)
3. `pnpm audit (prod deps, high+)` (`security.yml`)
4. `CodeQL (JS/TS) (javascript-typescript)` (`security.yml`)
5. `CodeQL` (aggregate, auto-added by GitHub)
6. `Validate PR title (Conventional Commits)` (`pr-title.yml`)

GitHub branch protection on `main` should mark all six as **required status checks** so the merge can't bypass them even via human override.

---

## Budget cap

To prevent runaway behaviour (cascading bad merges before the human notices):

- **Max 3 consecutive auto-merges** without explicit human ack in the conversation.
- After the 3rd auto-merge, orchestrator sends a Telegram digest with the merged PRs + waits for the human to type `continue` (or anything that isn't `halt`).
- The counter resets when the human acks.

---

## Kill switches

Any one of these immediately stops auto-merging for the rest of the session:

| Trigger                                                                               | Effect                                                                                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Human types `halt`, `pause`, `stop`, `slow down`, or similar in the chat              | Orchestrator returns to sequential cadence (drafts PR, waits for `merged`).                                               |
| **Any** CI check fails on an auto-merged PR                                           | Orchestrator stops, diagnoses, drafts a fix PR for human review. No further auto-merges in this session until human acks. |
| `gh pr merge --auto` fails for any reason (auth, protection rule violation, conflict) | Same as above.                                                                                                            |
| Doctrine doc has been modified in the current PR                                      | Auto-merge is disabled — doctrine changes are always-escalate (meta-rule).                                                |
| Two CI flakes on the same PR                                                          | Treat the second flake as a real failure. Escalate.                                                                       |

---

## Observability

What the human sees while the orchestrator runs autonomously:

1. **Per-merge Telegram ping** (chat_id from the paired session):
   > `T-0.3.0 merged · 6/6 green · next: T-0.3.1 (Traefik). PR https://github.com/zmeireles/daily-tour/pull/N`
2. **Daily summary** (when ≥3 PRs auto-merged in a day):
   > Tasks merged today: T-0.3.0, T-0.3.1, T-0.3.2. Tasks blocked: none. PRs needing review: none. Anomalies: 1 CI flake on PR #N, rerun cleared it.
3. **EXECUTION.md log** stays append-only — same format as today.
4. **GitHub Activity tab** captures the full audit trail (PR opened, CI checks, merge commit, who triggered it).

---

## Failure handling

| Scenario                                                                                            | Action                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI check fails                                                                                      | Diagnose, fix in a new commit on the same branch, push, wait for CI again. Same loop as today.                                                                        |
| Conflict with main (only possible if a parallel agent merged faster)                                | `git pull --rebase`, resolve, push. If conflict touches files outside the task's scope, escalate.                                                                     |
| Auto-merge fails because branch protection requires approval and orchestrator can't approve own PRs | Two options: (a) human flips the "require approval" rule off (sole-reviewer scenario), or (b) orchestrator escalates and waits. Default to (b) until (a) is explicit. |
| A merged PR breaks something downstream (next task's CI fails because of the previous merge)        | Orchestrator opens a revert PR, sends Telegram with the breakage details + revert link, requests human ack. Does NOT auto-merge the revert.                           |

---

## How the orchestrator decides per PR

Pseudocode:

```
on PR ready for merge:
    if doctrine.modified_in_this_pr:
        → escalate
    if task.category in always_escalate:
        → comment "ready for review", wait
    if not all_required_checks_green:
        → diagnose + iterate
    if consecutive_auto_merges >= 3:
        → telegram digest, wait for human ack
    if user_said_halt_this_session:
        → wait
    # else
    gh pr merge --squash --auto --delete-branch
    telegram_ping(pr_url, next_task)
    consecutive_auto_merges += 1
```

---

## Rollback protocol

If an auto-merge turns out to be wrong:

1. **First step is always `git revert`** on `main`, not a force-push or branch reset.
2. The revert PR is **always human-approved**, even though the original was auto-merged.
3. The retrospective entry in `EXECUTION.md` documents what slipped through which gate and what new gate (or category move from auto-mergeable to always-escalate) should prevent recurrence.

---

## Repo settings checklist

For this doctrine to function, these GitHub-side settings must be in place. They're **per-repo, not per-org or per-user**. Path is **Settings → General → Pull Requests** unless noted.

- [ ] **Allow auto-merge** — checked. This unlocks `gh pr merge --auto`.
- [ ] **Allow squash merging** — checked (this is the default; verify).
- [ ] **Default merge commit message** for squash → "Pull request title and description" so the conventional-commit title becomes the squashed commit subject.
- [ ] **Automatically delete head branches** — checked. Cleans up `jmeireles/t0-*-*` branches after merge.

Branch protection on `main` (**Settings → Branches → Add rule** OR **Settings → Rules → Rulesets**):

- [ ] **Require status checks to pass before merging** — checked.
- [ ] **Require branches to be up to date before merging** — checked (forces rebase if main moved).
- [ ] **Required status checks**: pick the 6 listed in [§ Required CI checks](#required-ci-checks-the-gate).
- [ ] **Require a pull request before merging** — checked.
- [ ] **Require approvals: 0** (you're the sole reviewer; the orchestrator can't approve its own PR. If you later add a second human or a bot identity, bump this to 1).
- [ ] **Dismiss stale pull request approvals when new commits are pushed** — checked.
- [ ] **Restrict who can push to matching branches** — leave open for now; bot identity can be added later.

---

## When the doctrine changes

- Modifying this file requires a human-approved PR. The orchestrator may draft the change but never auto-merges a doctrine update.
- A doctrine update should be paired with an `EXECUTION.md` entry capturing the trigger (e.g., "after the OTel CVE missed at PR #6, lefthook now mirrors `pnpm audit`").
- Versioning: bump the **Last updated** date and explain the diff in the PR body.

---

## See also

- [`CLAUDE.md`](../../CLAUDE.md) at repo root — the always-loaded snippet pointing here.
- [`docs/implementation-plans/001-roadmap/EXECUTION.md`](../implementation-plans/001-roadmap/EXECUTION.md) — wave log; future doctrine-violations get recorded there.
- [`docs/REQUIREMENTS.md §5.3`](../REQUIREMENTS.md#53-security) — the security NFR that motivates the always-escalate list.
