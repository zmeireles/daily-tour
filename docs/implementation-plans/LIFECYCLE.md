# Plan Lifecycle

Standard lifecycle for implementation plans in this project.

## Phases

```
DRAFT → READY → EXECUTING → REVIEW → DONE
```

### 1. DRAFT — Define the problem and solution

Create `docs/implementation-plans/NNN-slug-name/` with:

| File | Purpose |
|------|---------|
| `README.md` | Problem, solution, architecture, files changed |
| `TODO.md` | Checkbox tracker grouped by feature/category |

**README.md structure:**
- `## Overview` — one paragraph, stack context
- `## Problem` — what issue this solves
- `## Solution` — architecture, components, data flow
- `## Files Changed` — table of files and what changed
- `## Testing` — how to verify (manual steps or test commands)

**TODO.md structure:**
- Progress summary table at top
- Per-feature/category sections with `- [ ]` checkboxes
- Each item is independently verifiable

**Exit criteria:** README and TODO reviewed; plan indexed in `README.md` with status `Draft`.

### 2. READY — Plan approved, agents assigned

- Decompose work into agent-safe groups (no overlapping file writes)
- Write self-contained prompt files in `temp/prompt-<name>.md`
- Create tracking tasks in the task manager (if applicable)
- Update plan status to `In Progress` in the index

**Exit criteria:** Prompts written, agent grouping documented in execution log.

### 3. EXECUTING — Agents working

Log all execution in `EXECUTION.md` inside the plan directory:

```markdown
## Execution Log

### Wave 1 — <date>

| Agent | Branch | Profile | Scope | Status |
|-------|--------|---------|-------|--------|
| name  | branch | profile | bugs/features | Running/Done/Failed |

#### Agent: <name>
- **Started**: HH:MM
- **Finished**: HH:MM
- **Changes**: summary of what was changed
- **Issues**: any surprises or blockers
```

Each wave is a set of parallel agents. Multiple waves are fine (e.g., wave 1 fixes bugs, wave 2 does integration testing).

**Commit verification (L005):** When an agent reports completion, verify a commit exists before marking it Done:
```bash
cd ~/.claude-squad/worktrees/jmeireles/<name> && git log -1 --oneline
```
If no new commit, escalate to L3 monitoring — attach and commit manually. Never assume "finished = committed".

**Metrics to capture per agent:**

| Field | Example |
|-------|---------|
| Predicted time | 5-10m |
| Actual time | 6m |
| Context usage | 10% (33.7k/1M) |
| Complexity | Low / Medium / High |
| LOC changed | +42/-8 |

**Exit criteria:** All agents finished, commits verified, diffs reviewed.

### 4. REVIEW — Verify and merge

- Review each agent's diff (`cs-agent diff <name>`)
- Run tests / manual verification
- Push branches and create PRs (`cs-agent push <name>`)
- Log review notes in `EXECUTION.md`
- Update `TODO.md` checkboxes with dates and resolution notes

**Exit criteria:** All PRs approved and merged (or changes applied directly).

### 5. DONE — Document and hand off

- Update plan status to `Completed` in index
- Update `docs/ai/backlog.md` — strike completed items, add new ones
- Update CHANGELOG (if exists)
- Send Telegram summary (per orchestrator protocol)
- Clean up: remove `temp/prompt-*.md` files, kill worktrees

**Exit criteria:** Index updated, backlog current, summary sent.

## File Reference

```
docs/implementation-plans/NNN-slug-name/
  README.md        # Plan definition (problem, solution, architecture)
  TODO.md          # Progress tracker (checkboxes)
  EXECUTION.md     # Execution log (agents, waves, diffs, notes)
```

## Conventions

- Plan numbers are sequential 3-digit codes (001, 002, ...). Gaps are OK.
- Slug names are lowercase-kebab-case.
- Agent prompts go in `temp/prompt-<name>.md` (ephemeral, not committed).
- Dates use ISO format (YYYY-MM-DD). Times use HH:MM local.
- Status values: `Draft`, `In Progress`, `Completed`, `Abandoned`.
- Each TODO item gets a date stamp and optional `> **Resolved:** ...` note when done.
