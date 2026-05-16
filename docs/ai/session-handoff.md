# Session Handoff — 2026-05-15 22:00 → next session

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).

## TL;DR — first task of next session

**Run `cs-agent status` and inspect `t0-4-2`**:

```bash
cs-agent status | grep -E "t0-4-2|AGENT"
cd /home/jmeireles/.claude-squad/worktrees/jmeireles/t0-4-2
git log --oneline -3                                   # confirm 93a35b3 is the tip
git diff --name-only $(git merge-base main HEAD) HEAD  # 20 files in services/bff/* + lockfile
```

The agent self-committed cleanly (`93a35b3 — feat(bff): scaffold Fastify v5.8.5 service with OTel + helmet/cors/rate-limit/jwt`) but cs-agent's tmux session was still showing `running` at session end. Probably idle at the end-of-work prompt.

### Suspect: `services/bff/Dockerfile.dockerignore`

The diff includes a file named `Dockerfile.dockerignore` — that's wrong. Likely the agent meant `.dockerignore`. **Verify first**: read the file's contents; if it looks like Docker-ignore patterns, rename it to `services/bff/.dockerignore` (and remove the misnamed one). Then re-run the verification suite:

```bash
source ~/.nvm/nvm.sh && nvm use            # 22.22.3
pnpm install --frozen-lockfile
pnpm exec turbo run lint typecheck test build --filter=@daily-tour/bff
# Smoke: dev server
pnpm --filter @daily-tour/bff dev &
sleep 4
curl -sf http://localhost:8080/health | jq -e '.status == "ok"'
pkill -f "tsx" || true
# Docker (sub-200 MB target)
docker build -f services/bff/Dockerfile -t daily-tour/bff:dev .
docker images daily-tour/bff:dev --format "{{.Size}}"
docker run -d --rm --name bff_smoke -p 127.0.0.1:8081:8080 daily-tour/bff:dev
sleep 4 && curl -sf http://127.0.0.1:8081/health | jq -e '.service == "bff"' && docker stop bff_smoke
# Gitleaks (git history)
gitleaks detect --redact -v --config .gitleaks.toml
```

If everything passes (after the rename fix-up), commit the rename, push, open PR, arm auto-merge. **Counter is at 1 / 3** (PR #15 was the last auto-merge), so this would be 2 / 3 — still in budget, no digest yet.

## Where we are

| Slice                    | Status                      | Tasks                                                                                               |
| ------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------- |
| 0.1 — Repo skeleton / CI | ✅ done                     | T-0.1.1/2/3/4                                                                                       |
| 0.2 — Shared packages    | ✅ done                     | T-0.2.0/1/2                                                                                         |
| 0.3 — Compose infra      | ✅ done                     | T-0.3.0/1/2/3                                                                                       |
| 0.4 — PWA + BFF + Stitch | 🟡 2/5 done (3/5 in flight) | T-0.4.0 ✅ T-0.4.1 ✅ **T-0.4.2 🟡 in worktree, unpushed**; T-0.4.3 next; T-0.4.4 🔒 blocked on VPS |

**Phase 0**: 12 of 14 done. T-0.4.2 brings it to 13 once pushed + merged. T-0.4.3 (compose app overlay) is the last unblocked task in Phase 0.

After Phase 0 closes (12 + T-0.4.2 + T-0.4.3 = 14 with T-0.4.4 deferred), we open **Phase 1**. The plan is to start at **T-1.0.0** (Drizzle schema for `auth_tokens.*`). Slice 1.0 (token + access) is the gate everything else feeds through.

## Open PRs / in-flight

- **None on GitHub** — clean queue at session end. T-0.4.2 is local only (branch `jmeireles/t0-4-2` exists in worktree but not yet pushed).

## Auto-merge counter

**1 / 3.** PR #15 (T-0.4.1) was the last auto-merge after the previous `continue`. T-0.4.2 push will be 2 / 3. T-0.4.3 will be 3 / 3 → Telegram digest + pause.

## Deferrals tracked across the session

Document these as P0 follow-ups when their unlock task arrives:

| Deferral                                                                     | Owner task                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentik OIDC provider creation** (blueprint failed opaquely on 2026.2.2) | T-1.6.0 owns it via the Authentik API at BFF + JWKS integration time                                                                  |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**           | New T-0.3.4 _or_ rolled into T-1.6.x — uncomments the middleware in `infra/traefik/dynamic/middlewares.yml` and adds the label to n8n |
| **Stitch MCP mockup generation** (project created but mockups deferred)      | Per-implementation task — T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat                                        |
| **n8n on dedicated Postgres** (SQLite in dev)                                | Phase 5 hardening                                                                                                                     |
| **CI deploy gate to QA VPS** (T-0.4.4)                                       | Unblocked when QA Ubuntu 24 VPS exists                                                                                                |
| **Docs/design tokens-light.svg + tokens-dark.svg**                           | Derived artefact; generate when Stitch mockups land                                                                                   |

## Pattern observations (orchestrator)

These should inform future prompts:

1. **Agent autocommit fallback is the norm.** Sonnet sessions ship via auto-commit ~100% of the time; Opus ~50%. T-0.4.2 was a clean Opus self-commit — counter-example, but don't expect it. PR-title squash-merge cleans the conventional-message gap.
2. **Compose tasks consistently need 3 orchestrator fix-ups**: image-tag drift (MinIO RELEASE.2026… → RELEASE.2025), healthcheck command vs image contents (wget vs curl), deprecated env vars (N8N*BASIC_AUTH*\* was removed in v0.184). For future infra prompts: add a "verify-against-running-image" step.
3. **Auth integrations are recursive scope.** OIDC blueprints + forward-auth Proxy Providers depend on multiple Authentik primitives existing first. The pragmatic move was to defer both to T-1.6.x when there's an actual consumer (BFF + JWKS). Don't try to wire forward-auth in isolation.
4. **Branch protection works.** Direct `git push origin main` is rejected by the `protect-main` ruleset — every change goes through a PR. The orchestrator's "commit doc updates to main directly" shortcut died at T-0.1.4; doc-tick PRs are now the pattern.
5. **The `dt_` namespace tripped gitleaks** when used for Compose resource names (`dt_authentik_postgres_data`). Added `infra/.*` to the `daily-tour-test-token` rule's allowlist in PR #12.
6. **n8n's `N8N_BASIC_AUTH_*` removal in v0.184** is a class of issue worth flagging: pinning a recent CVE-floor version doesn't guarantee old env-var contracts work. Always do a `curl` smoke check, not just healthcheck-passes.

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md):

- ✅ Allow auto-merge
- ✅ Squash merging
- ✅ Auto-delete head branches
- ✅ Ruleset `protect-main` requiring all 6 CI checks + 0 approvals + linear history + block force-push + block deletions

Nothing to change on the GitHub side.

## Session ending state checklist

- [x] All committed work pushed to `main` via PRs #1–#15 (15 merged)
- [x] T-0.4.2 work is on a local branch in cs-agent worktree, **not pushed** (deliberate — needs orchestrator verification first)
- [x] cs-agent `t0-4-2` left running (worktree intact); next session decides whether to kill or push
- [x] Riff hierarchy populated (6 epics + 32 slices + 86 leaf tasks); statuses current through T-0.4.1
- [x] Telegram channel paired with this orchestrator (chat_id `2031690099`); message id 11 was the last digest

## How to resume

1. Read this doc + `CLAUDE.md` + the auto-merge doctrine.
2. **Check `cs-agent status` for `t0-4-2`** — the explicit first task.
3. Fix the `Dockerfile.dockerignore` naming if confirmed.
4. Run the verification suite from § "Where we are".
5. Push + open PR + arm auto-merge.
6. Continue to T-0.4.3 (final Phase 0 task before VPS unblocks T-0.4.4).
