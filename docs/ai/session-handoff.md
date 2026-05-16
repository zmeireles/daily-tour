# Session Handoff — 2026-05-16 01:30 → next session

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).

## TL;DR — first task of next session

**Phase 0 is closed.** Last action this session was PR #19 (T-0.4.3) merging at the 3/3 auto-merge boundary; per doctrine the orchestrator is **paused** until you say `continue`. There is no in-flight cs-agent worktree.

When you're ready, the next launch is **T-1.0.0** — Drizzle schema for `auth_tokens.reservation`, `auth_tokens.guest`, `auth_tokens.token_grant`. Slice 1.0 (token + access) is the gate everything else in Phase 1 feeds through:

- T-1.0.0 (this) → opens
- T-1.0.1 (`token-svc` Fastify endpoints) → blocked on T-1.0.0
- T-1.0.2 (BFF token-exchange middleware + Redis JTI cache) → blocked on T-1.0.1
- T-1.0.3 (PWA token-URL router + Zustand) → blocked on T-1.0.2

Suggested launch:

```bash
# Draft the prompt at temp/prompt-t-1.0.0.md (model on temp/prompt-t-0.4.2.md scope-fence pattern)
cs-agent launch \
  --name    t1-0-0 \
  --prompt  temp/prompt-t-1.0.0.md \
  --profile claude-sonnet-yolo \
  --base    HEAD
```

`claude-sonnet-yolo` is enough — the Drizzle schema task is largely mechanical (table definitions + migration SQL + seed). Reserve `claude-yolo` (Opus) for tasks with the kind of subtle reasoning Wave 8's IPv4-pin discovery showed.

## Where we are

| Slice                    | Status                            | Tasks                                           |
| ------------------------ | --------------------------------- | ----------------------------------------------- |
| 0.1 — Repo skeleton / CI | ✅ done                           | T-0.1.1/2/3/4                                   |
| 0.2 — Shared packages    | ✅ done                           | T-0.2.0/1/2                                     |
| 0.3 — Compose infra      | ✅ done                           | T-0.3.0/1/2/3                                   |
| 0.4 — PWA + BFF + Stitch | ✅ done (modulo T-0.4.4 deferred) | T-0.4.0/1/2/3 ✅ · T-0.4.4 🔒 blocked on QA VPS |
| **Phase 0 — Foundation** | ✅ closed                         | 15 / 16 tasks done; 1 blocked (T-0.4.4)         |
| 1.0 — Reservation token  | 🟢 ready (next)                   | T-1.0.0 🟢 → T-1.0.1/2/3 chain                  |

After Slice 1.0 lands, the next big milestone is **the guest-flow demo** through Phase 1:

- 1.1 — Catalog data model + 28-place seed
- 1.2 — Discover (6-action grid)
- 1.3 — Place detail + map + Call/Navigate/Draft-DM
- 1.4 — Owner CRUD via Authentik-gated backoffice (this is when the Authentik OIDC provider deferral comes due)
- 1.5 — Ingest skeleton
- 1.6 — Authentik integration (BFF + JWKS + forward-auth Proxy Provider) — **clears 2 deferrals at once**

## Open PRs / in-flight

- **None.** Clean queue. No cs-agent worktrees running. Local main is at `1d9a0ce`.

## Auto-merge counter

**3 / 3 — paused.** Per doctrine, after the 3rd consecutive auto-merge the orchestrator stops and waits for an explicit `continue` / `merged` / `ack` from you. This session burned through:

| #   | PR                              | Type                     | Counter           |
| --- | ------------------------------- | ------------------------ | ----------------- |
| 1   | #17 — T-0.4.2 BFF               | CVE-bumped → human merge | 1 / 3 (unchanged) |
| 2   | #18 — docs(plan-001) post-cycle | auto-merged              | 2 / 3             |
| 3   | #19 — T-0.4.3 app overlay       | auto-merged              | **3 / 3 → pause** |

PR #17's CVE escalation preserved auto-merge headroom that would otherwise have been used by T-0.4.2 (the prior session's prediction was 2/3 by now). When you say `continue`, the counter resets and T-1.0.0 launches with a fresh budget.

## Deferrals tracked across the session

Document these as P0 follow-ups when their unlock task arrives. Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md):

| Deferral                                                                     | Owner task                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **BFF Docker image: 216 MB vs 200 MB target**                                | Phase 0 / 5 — investigate distroless / OTel sidecar split. Not blocking; structural ceiling, not a regression.                        |
| **Authentik OIDC provider creation** (blueprint failed opaquely on 2026.2.2) | T-1.6.0 owns it via the Authentik API at BFF + JWKS integration time                                                                  |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**           | New T-0.3.4 _or_ rolled into T-1.6.x — uncomments the middleware in `infra/traefik/dynamic/middlewares.yml` and adds the label to n8n |
| **Stitch MCP mockup generation** (project created but mockups deferred)      | Per-implementation task — T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat                                        |
| **n8n on dedicated Postgres** (SQLite in dev)                                | Phase 5 hardening                                                                                                                     |
| **CI deploy gate to QA VPS** (T-0.4.4)                                       | Unblocked when QA Ubuntu 24 VPS exists                                                                                                |
| **Docs/design tokens-light.svg + tokens-dark.svg**                           | Derived artefact; generate when Stitch mockups land                                                                                   |

## Pattern observations (orchestrator)

These should inform future prompts:

1. **Agent autocommit fallback is the norm.** Sonnet sessions ship via auto-commit ~100% of the time; Opus ~50%. T-0.4.2 + T-0.4.3 were both clean Opus self-commits — counter-evidence, but don't expect it. PR-title squash-merge cleans the conventional-message gap.
2. **Compose tasks consistently need 3 orchestrator fix-ups**: image-tag drift, healthcheck command vs image contents, deprecated env vars. T-0.4.3 added a 4th class: **IPv4 pinning** for healthchecks on alpine images (BusyBox `wget` prefers IPv6, Fastify+nginx-bind-mount only listen IPv4). For future infra prompts: add a "verify-against-running-image" step for healthcheck endpoints AND the IPv4-vs-IPv6 contract.
3. **Auth integrations are recursive scope.** OIDC blueprints + forward-auth Proxy Providers depend on multiple Authentik primitives existing first. The pragmatic move was to defer both to T-1.6.x when there's an actual consumer (BFF + JWKS). Don't try to wire forward-auth in isolation.
4. **Branch protection works.** Direct `git push origin main` is rejected by the `protect-main` ruleset — every change goes through a PR. The orchestrator's "commit doc updates to main directly" shortcut died at T-0.1.4; doc-tick PRs are now the pattern.
5. **The `dt_` namespace tripped gitleaks** when used for Compose resource names (`dt_authentik_postgres_data`). Added `infra/.*` to the `daily-tour-test-token` rule's allowlist in PR #12.
6. **n8n's `N8N_BASIC_AUTH_*` removal in v0.184** is a class of issue worth flagging: pinning a recent CVE-floor version doesn't guarantee old env-var contracts work. Always do a `curl` smoke check, not just healthcheck-passes.
7. **CVE bumps escalate per doctrine even when CI is green.** PR #17 (T-0.4.2) bundled a `@fastify/jwt` ^9 → ^10 bump that patched 4 advisories on `fast-jwt`. Auto-merge counter stayed at 1/3 instead of incrementing. Tradeoff: human review for security mechanics; orchestrator headroom preserved.
8. **`gh pr update-branch` is the right tool for required-up-to-date branches on linear-history repos.** Hit twice this session (PR #17 and PR #19). Cheaper than local rebase + force-push; merge commit on the feature branch gets squashed away on final merge to main.

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md):

- ✅ Allow auto-merge
- ✅ Squash merging
- ✅ Auto-delete head branches
- ✅ Ruleset `protect-main` requiring all 6 CI checks + 0 approvals + linear history + block force-push + block deletions

Nothing to change on the GitHub side.

## Session ending state checklist

- [x] PRs #17, #18, #19 merged. Local main at `1d9a0ce`.
- [x] No cs-agent worktrees running (`t0-4-2`, `t0-4-3` killed cleanly). Stale local merged branches pruned.
- [x] TODO.md, EXECUTION.md (Wave 7 + Wave 8), backlog.md all on main and current.
- [x] 216 MB BFF image-size deviation tracked in `backlog.md "Engineering follow-ups"` with the 4 other deferrals.
- [x] Telegram channel paired with this orchestrator (chat_id `2031690099`); message ids 15 (mid-cycle update) and 17 (mid-verify ping ack) are this session's last 2; the **3/3 digest is the next outbound message**.
- [ ] **Next session sends the 3/3 digest** (drafted in this session — see "Pending Telegram digest" below). Doctrine says: digest before `continue`.

## Pending Telegram digest

Save this for the moment you (or me, on resume) decide it's time to ping the channel — it summarises the burst and asks for `continue` or `pause-for-review`:

```
Phase 0 is closed.

Three PRs landed since the last digest:
- #17 (T-0.4.2 BFF skeleton) — CVE-bumped @fastify/jwt ^9 → ^10 (4 fast-jwt advisories), human-merged. 216 MB image vs 200 MB target tracked as follow-up.
- #18 (docs post-cycle) — TODO ticks for T-0.3.0/1/2/3 + T-0.4.0/1/2 retrofitted, Wave 7 logged, backlog updated. Auto-merged.
- #19 (T-0.4.3 app overlay) — bff + nginx pwa-static behind Traefik, agent-discovered IPv4 healthcheck pin. Auto-merged.

Auto-merge counter: 3/3 → paused per doctrine.
Phase 0 status: 15/16 tasks done. Only T-0.4.4 (CI deploy to QA VPS) remains, blocked on infra.
Next launch: T-1.0.0 (Drizzle schema for auth_tokens.*) — Slice 1.0 is the gate for Phase 1.

Reply `continue` to launch T-1.0.0, or `pause` to take a beat.
```

## How to resume

1. Read this doc + `CLAUDE.md` + the auto-merge doctrine.
2. Send the **pending Telegram digest** above (or confirm I should send it). The 3/3 boundary requires a digest before any further auto-merges.
3. On `continue`: draft `temp/prompt-t-1.0.0.md` modelled on the T-0.4.2 scope-fence pattern. Slice 1.0's full spec is in [`TODO.md`](../implementation-plans/001-roadmap/TODO.md) under `T-1.0.0`. Read [`packages/shared-types/`](../../packages/shared-types/) for the Drizzle column types that should mirror the zod schemas, and [`infra/postgres/init/01-schemas.sql`](../../infra/postgres/init/01-schemas.sql) to confirm the `auth_tokens` schema exists (it does — created in T-0.3.0).
4. Launch with `claude-sonnet-yolo` profile (mechanical schema work; reserve Opus for the harder Phase 1 BFF integration tasks).
5. Verify like usual: drizzle-kit generate doesn't drift, hand-review the SQL, the seed loads without error, no migrations applied to a real DB (those are run during T-1.0.1 setup, not during T-1.0.0 generation).
