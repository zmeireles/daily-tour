# Daily Tour — Project-local Lessons

> Cross-project lessons live in `~/.claude/docs/agent-playbook.md`. This directory holds lessons that are specific to **this repo** (its services, its tooling, its operational quirks).

Each lesson is an atomic markdown file named `L<NNN>-<slug>.md`. Codes continue from the global playbook's sequence — see the table below + the playbook's "Current Lessons" section.

## Current Lessons (project-local)

| Code | Rule                                                                                                                                                                                      | Source                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| L019 | Layout-wrapper changes must audit every route that shares the visual surface, not just the obviously-related one                                                                          | dt-tests UAT #19 → PR #156 (2026-05-29)                       |
| L020 | Source nvm + `nvm use` before any `pnpm` command; `.nvmrc` pins 22.22.3 but PATH defaults to Node 25                                                                                      | session 2026-05-28 (Vite startup ERR_PNPM_UNSUPPORTED_ENGINE) |
| L021 | tasks-prod MCP shows tool schemas reconnected but the underlying SSH tunnel to VPS Postgres on :15432 can be down — verify `ss -tlnp \| grep 15432` before assuming MCP failures are bugs | session 2026-05-28/29                                         |
| L022 | "Marked done" in TODO.md is code-merged, not feature-works — bundled-task PRs need per-task acceptance evidence before each ✅, not just per-PR CI                                        | Plan-001 accounting retro (2026-05-30)                        |

## How to add a new lesson

1. Pick the next `L<NNN>` code (global + project-local share a sequence — check both)
2. Create `L<NNN>-<short-slug>.md` here
3. Use the template below
4. Add a row to the table above
5. If the lesson is cross-project, also append to `~/.claude/docs/agent-playbook.md`'s "Current Lessons" section

## Template

```markdown
# L<NNN> — <One-line rule>

**Source**: <plan / PR / session / incident>
**Date**: <YYYY-MM-DD>

## The rule

<Single declarative sentence — what to do or not do>

## Why it matters

<The cost of getting it wrong; what we observed when we did>

## What happened

<Concrete account: file paths, PR numbers, command outputs, decisions made>

## How to apply

<Specific guidance for future situations — where this kicks in>

## Related

- [[L<NNN>-other]] — if linked
```
