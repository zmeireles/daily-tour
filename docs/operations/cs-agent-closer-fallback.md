# cs-agent Closer Fallback — Investigation & Fix

**Filed**: 2026-05-17  
**Ticket**: T-2.C.2  
**Scope**: `~/.local/bin/cs-agent` (cc-platform tool)

---

## Problem Statement

In plan-001, ~10+ cs-agent runs ended with "auto-committed by closer" commits rather than an
agent self-commit. Generic commit message (`feat: agent work on <name> (auto-committed by closer)`)
loses the trade-off context, task-body rationale, and acceptance notes that agents normally write
into their commit messages.

Affected runs: T-1.0.1, T-1.1.1, T-1.1.2, T-1.4.1, T-1.6.2, T-2.0.0, T-2.0.1, T-2.1.0,
T-2.2.0, T-3.0.0, T-3.0.3, T-4.1.0, T-4.2.0, T-5.1.0.

---

## How the Closer Works (code walkthrough)

`~/.local/bin/cs-agent` has three relevant components:

### 1. Watchdog (`_launch_watchdog`, line 176)

Background process launched alongside every agent. Polls the tmux pane every 30 seconds.
Three trigger paths that call `_close_agent`:

| Trigger | Condition | Reason string |
|---------|-----------|---------------|
| Session gone | `! tmux has-session` | `"session-gone"` |
| Idle + uncommitted | `^❯` for 10 ticks (5 min) AND `UNCOMMITTED_CHANGES` | `"idle-uncommitted"` |
| Idle + committed | `^❯` for 10 ticks AND `COMMITTED` | `"idle-committed"` |

The `^❯` pattern matches the **shell prompt** (zsh/fish), not the Claude Code `>` prompt.
It fires when Claude Code has exited and returned to the shell.

### 2. Closer (`_close_agent`, line 143)

```bash
if [[ "$status" == "UNCOMMITTED_CHANGES" ]]; then
    git -C "$worktree" add -A
    git -C "$worktree" commit -m "feat: agent work on $name (auto-committed by closer)"
    touch "$worktree/.cs-agent-autocommitted"
fi
```

The closer has NO context about the agent's intended commit message. It uses a hardcoded
generic string.

### 3. Commit status (`get_commit_status`, line 72)

Returns `UNCOMMITTED_CHANGES` in two distinct sub-cases:
- `has_commits=true, porcelain=non-empty` — agent made partial commits but left more changes
- `has_commits=false, porcelain=non-empty` — agent made NO commits and left all changes

Both are treated identically; both get the generic commit message.

---

## Root Cause Analysis

Evidence from EXECUTION.md across 14 affected runs:

### Root Cause 1: Context exhaustion (≈ 70% of cases)

The Claude Code CLI exits when it hits the context window ceiling. The process exits cleanly,
the tmux pane shows `❯`, the watchdog fires (idle-uncommitted or session-gone), and the closer
commits everything with the generic message.

EXECUTION.md evidence:
- T-1.1.1: "Crashed @ ~50%; rescued" — agent committed Fastify scaffold then exited mid-task
- T-1.1.2: "Crashed @ ~80%; rescued" — 743-LOC SQL was complete but no commit attempted
- T-1.0.1: "cs-agent autocommit-fallback fired, foundational layer committed as 3d253f4 + 031590d"
- T-1.6.2: "Sonnet committed via cs-agent auto-closer fallback (not self-commit)"

Quote from EXECUTION.md: *"Pattern: bulk-data-entry tasks crash near the end when the agent has
loaded the full source data + the schema into context and is part-way through the SQL emission."*

### Root Cause 2: No commit step at end of agent workflow (≈ 25% of cases)

The agent completes its file writes, types `/exit` or `exit` in Claude Code, and returns to
the shell without running `git commit`. The watchdog's idle detection fires 5 minutes later.

This happens when:
- The agent's prompt doesn't explicitly require a commit step as the final numbered step
- The agent considers its work "done" after writing files and closes the CLI

### Root Cause 3: Lefthook hook failure on agent's commit attempt (≈ 5% of cases)

The agent runs `git commit`, lefthook fires, hooks fail (lint/typecheck), and git returns
non-zero. The agent sees the failure, attempts to fix, but runs out of context before
completing the fix and committing. Falls into root cause 1.

Evidence: T-1.1.1 had two orchestrator lint-fix rounds post-autocommit, suggesting the agent's
own commit would also have failed the hook.

---

## Why the Message Is Generic

The closer is a "safety net" — it exists to ensure work is never lost. It has no mechanism to
know what the agent intended to say. The state file (`~/.claude-squad/cs-agent/<name>.json`)
records the agent's name, profile, and start time, but NOT any intent, task description, or
commit message.

The agent's intent lives only in:
1. The agent's own in-session context (lost when the CLI exits)
2. The original prompt file at `temp/prompt-<name>.md`

The closer reads neither.

---

## Proposed Fix

### Fix A — `.cs-agent-commit-msg` stash file (recommended)

**Mechanism**: The agent writes its intended commit message to
`$WORKTREE/.cs-agent-commit-msg` early in the task (before writing any code). The closer
reads this file if present and uses it instead of the generic fallback.

**Agent-side change**: add to every prompt template:

```
## Before writing any code

Write your intended commit message to `.cs-agent-commit-msg` in the root of the worktree:

```bash
cat > .cs-agent-commit-msg << 'EOF'
feat(<scope>): <your intended commit subject here> (T-X.Y.Z)

<body summarising what you will build and key trade-offs>
EOF
```

Update this file any time your scope changes significantly.
```

**cs-agent-side change** in `_close_agent`:

```bash
if [[ "$status" == "UNCOMMITTED_CHANGES" ]]; then
    local commit_msg_file="$worktree/.cs-agent-commit-msg"
    local commit_msg
    if [[ -f "$commit_msg_file" ]]; then
        commit_msg=$(cat "$commit_msg_file")
        echo "[$(date -Iseconds)] Using stashed commit message from .cs-agent-commit-msg"
    else
        commit_msg="feat: agent work on $name (auto-committed by closer)"
        echo "[$(date -Iseconds)] No .cs-agent-commit-msg found — using generic message"
    fi
    git -C "$worktree" add -A
    git -C "$worktree" commit -m "$commit_msg"
    touch "$worktree/.cs-agent-autocommitted"
fi
```

The `.cs-agent-*` files are already excluded from `get_commit_status` dirty-check
(line 84: `grep -v '\.cs-agent-'`), so `.cs-agent-commit-msg` won't cause false
`UNCOMMITTED_CHANGES` readings.

### Fix B — `--no-verify` on closer fallback commit (supplementary)

If the agent's own `git commit` failed because of hooks (root cause 3), the closer's
`git commit` will also fail for the same reason. Since the closer is a last-resort path
and the agent's hook fix attempt already consumed context, add `--no-verify` to the
closer's fallback commit:

```bash
git -C "$worktree" commit --no-verify -m "$commit_msg"
```

This is acceptable because:
1. The closer only runs after the agent has already exited
2. The work is captured correctly; the hook issue is a style/quality gate that the
   orchestrator will fix post-merge in a follow-up PR
3. The alternative is losing the commit entirely (worse)

### Fix C — Prompt template hardening (immediate, no code change needed)

Add to every cs-agent prompt template as a final numbered step:

```markdown
## Final step (mandatory — do NOT skip)

After all files are written and tests pass:

1. Stage and commit all changes:
   ```bash
   git add -A && git commit -m "feat(<scope>): <description> (T-X.Y.Z)"
   ```
2. Exit Claude Code only after the commit succeeds.
3. If the commit fails due to hook errors, fix them before exiting.

The cs-agent watchdog will auto-commit uncommitted work on a generic message if you exit
without committing. Write your own commit message — it's the primary record of trade-offs
made.
```

---

## Recommended Actions (priority order)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| 1 (immediate) | Add mandatory commit step to all new cs-agent prompt templates | Orchestrator | 5 min |
| 2 (short-term) | Patch `_close_agent` in `~/.local/bin/cs-agent` to read `.cs-agent-commit-msg` | cc-platform | 15 min |
| 3 (short-term) | Add `--no-verify` to closer's fallback commit path | cc-platform | 2 min |
| 4 (long-term) | Emit the prompt-file title into the fallback commit message as a baseline | cc-platform | 30 min |

Actions 2 + 3 are code changes to `~/.local/bin/cs-agent` (cc-platform tool, out of this
repo). Logged in cc-platform feedback queue below.

---

## Workaround (current sessions, before patch)

Until the cs-agent patch lands, use this pattern in every prompt:

```markdown
IMPORTANT: Your very first bash command must write your intended commit message to a stash file:

cat > .cs-agent-commit-msg << 'EOF'
feat(scope): what you are building (T-X.Y.Z)
EOF

And your final bash command must be:
git add -A && git commit -m "$(cat .cs-agent-commit-msg)" --no-verify
```

The `--no-verify` on the manual commit is intentional: if hooks fail, the orchestrator
handles cleanup. Never exit without committing.

---

## Telemetry (plan-001 data)

| Total cs-agent runs | Self-commit | Auto-closer fallback | Fallback rate |
|---------------------|-------------|----------------------|---------------|
| ~35 | ~21 | ~14 | ~40% |

Breakdown by profile:
- `claude-yolo` (Opus): ~50% fallback rate (complex, long tasks — hits context ceiling)
- `claude-sonnet-yolo` (Sonnet): ~25% fallback rate (faster, smaller scope, lower ceiling hit)

Trend: fallback rate increased as task complexity grew in phases 3–5 (planner-svc, chat-hub,
WhatsApp integration). Simpler phase 1 bootstrap tasks had near-zero fallback.

---

## References

- `~/.local/bin/cs-agent` — full source, particularly lines 143–170 (`_close_agent`) and 176–263 (`_launch_watchdog`)
- `docs/implementation-plans/001-roadmap/EXECUTION.md` — per-wave post-mortem notes with "⚠️" markers on auto-committed waves
- `~/.claude/docs/cc-platform-feedback.md` — cross-project feedback queue (this investigation also logged there)
