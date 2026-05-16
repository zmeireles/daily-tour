# Session Handoff — 2026-05-16 23:00 → next session

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).

## TL;DR — first task of next session

Auto-merge counter is at **3/3 → orchestrator paused** per [doctrine](../operations/auto-merge-doctrine.md). Wait for explicit `continue` / `merged` / `ack` before launching anything.

When you're ready, the next launch is **T-1.0.2** — BFF token-exchange middleware + Redis JTI cache. This is the consumer side of the token contract:

- Receives `/r/:token` first-load from the PWA (T-1.0.3 wires the PWA route)
- Calls `token-svc /v1/tokens/:opaque/exchange` → gets the JWT
- Sets `dt_refresh` HttpOnly cookie (1h refresh cycle)
- On subsequent JWT-bearing requests: validates the JWT signature, checks `jti` against Redis cache (1-min TTL on misses to honor token-svc's revocation window)
- Returns 401 within 1 min of revocation

Suggested launch:

```bash
# Draft the prompt at temp/prompt-t-1.0.2.md (model on temp/prompt-t-1.0.1.md scope-fence pattern)
cs-agent launch \
  --name    t1-0-2 \
  --prompt  temp/prompt-t-1.0.2.md \
  --profile claude-yolo \
  --base    HEAD
```

Use `claude-yolo` (Opus) — T-1.0.2 has the Redis side-effect surface, the WebSocket auth handshake interaction, and the JWT verify path. Opus's careful reasoning was clearly worth it on T-0.4.3 (IPv4-pin discovery) and T-1.0.1 (custom migrator design). Sonnet would also work but Opus is safer for the auth surface.

After T-1.0.2 closes, Slice 1.0 is fully done; only **T-1.0.3** (PWA token-URL router + Zustand session store) remains in the slice. T-1.0.3 is small (single PWA route + Zustand store) and likely Sonnet-appropriate.

Parallel candidate: **T-1.1.0** (Drizzle schema for `catalog.*`) — deps T-0.2.0 + T-0.3.0 (both done), no Slice 1.0 dependency. Same shape as T-1.0.0; Sonnet profile. Could run alongside T-1.0.2 in a separate worktree without scope overlap.

## Where we are

| Slice                              | Status                            | Tasks                                                                                |
| ---------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS) | All slices ✅                                                                        |
| 1.0 — Reservation token & access   | 🟡 2/4 done                       | **T-1.0.0 ✅** · **T-1.0.1 ✅** · T-1.0.2 🟢 (next) · T-1.0.3 🔒                     |
| 1.1 — Catalog data model           | 🟢 ready (parallel candidate)     | T-1.1.0 unblocked (deps T-0.2.0 + T-0.3.0 both ✅) — could parallel-run with T-1.0.2 |
| 1.2 — Discover (6-action grid)     | 🔒                                | depends on Slice 1.0 + 1.1                                                           |
| 1.3 — Place detail                 | 🔒                                | depends on Slice 1.1                                                                 |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                | depends on T-1.6.x for OIDC                                                          |
| 1.5 — Ingest skeleton              | 🟢 ready (parallel candidate)     | deps T-0.2.2 ✅ + T-0.3.0 ✅ — Python service, no Phase 1 lock                       |
| 1.6 — Authentik integration        | 🔒                                | clears 2 deferrals (OIDC provider + forward-auth)                                    |

**Phase 1 progress**: 2/25 done. Slice 1.0 will close on T-1.0.2 + T-1.0.3.

## Open PRs / in-flight

- **None on GitHub**: as of session end, PRs #20 / #21 / #22 / #23 / #24 are all merged.
- **No cs-agent worktrees running.** Worktrees from t1-0-0 and t1-0-1 killed cleanly. (One unrelated `plan-028-slice-a` worktree from another project lives in the same dir — not daily-tour scope.)

## Auto-merge counter

**3/3 → paused.** Send the digest before any further auto-merges.

This session's burst (after the prior `continue` ack):

| #   | PR                                                    | Type                                     | Counter         |
| --- | ----------------------------------------------------- | ---------------------------------------- | --------------- |
| 1   | #20 — docs(plan-001) post-T-0.4.3                     | auto-merged                              | 1/3             |
| 2   | #21 — chore(infra) port + hostname remap              | human-merged (infra escalates)           | 1/3 (unchanged) |
| 3   | #22 — feat(token-svc) Drizzle schema                  | human-merged (schema escalates)          | 1/3 (unchanged) |
| 4   | #23 — docs(plan-001) Wave 9 + handoff                 | auto-merged                              | 2/3             |
| 5   | #24 — feat(token-svc) Fastify endpoints               | human-merged (schema + crypto escalates) | 2/3 (unchanged) |
| 6   | #25 (this docs PR) — docs(plan-001) Wave 10 + handoff | auto-merged                              | **3/3 → pause** |

So this session's auto-merge counter went 0 → 3 over 6 PRs because half were escalated. CVE/schema/crypto escalations preserve auto-merge headroom while keeping the security-relevant diffs under human review — the doctrine is working as designed.

## Deferrals tracked across the session

Document these as P0 follow-ups when their unlock task arrives. Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md):

| Deferral                                                                     | Owner task                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **BFF Docker image: 216 MB vs 200 MB target**                                | Phase 0 / 5 — investigate distroless / OTel sidecar split. Not blocking; structural ceiling, not a regression.                        |
| **token-svc Docker image: 227 MB**                                           | Same investigation as BFF; similar profile (+11 MB for drizzle-orm + jose vs BFF).                                                    |
| **Authentik OIDC provider creation** (blueprint failed opaquely on 2026.2.2) | T-1.6.0 owns it via the Authentik API at BFF + JWKS integration time                                                                  |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**           | New T-0.3.4 _or_ rolled into T-1.6.x — uncomments the middleware in `infra/traefik/dynamic/middlewares.yml` and adds the label to n8n |
| **Stitch MCP mockup generation** (project created but mockups deferred)      | Per-implementation task — T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat                                        |
| **n8n on dedicated Postgres** (SQLite in dev)                                | Phase 5 hardening                                                                                                                     |
| **CI deploy gate to QA VPS** (T-0.4.4)                                       | Unblocked when QA Ubuntu 24 VPS exists                                                                                                |
| **Docs/design tokens-light.svg + tokens-dark.svg**                           | Derived artefact; generate when Stitch mockups land                                                                                   |
| **n8n auto-revoke flow on `reservation.cancelled`**                          | Follow-up after RabbitMQ event wiring lands (Phase 1.4 or later)                                                                      |
| **token-svc Compose overlay**                                                | Likely added in T-1.0.2 alongside Redis wiring (so BFF can reach it via `dt_internal`)                                                |
| **token-svc revoke endpoint authorization gate**                             | Internal-only for Phase 1; mTLS / API-key wrap when n8n auto-revoke lands                                                             |
| **token-svc asymmetric JWT signing (RS256 / ES256) + JWKS endpoint**         | T-1.6.0 may switch for Authentik consistency; HS256 fine for Phase 1                                                                  |
| **tsx watch + initOtel() startup ordering bug**                              | Native dev workaround: use `./node_modules/.bin/tsx src/index.ts` directly. Investigate or switch dev script to nodemon if friction.  |

## Pattern observations (orchestrator)

These should inform future prompts:

1. **Agent self-commit is NOT yet 100% reliable.** Earlier this session showed 3 clean self-commits in a row (t0-4-3, t1-0-0, t0-4-2's Opus); t1-0-1 crashed at ~40% via the cs-agent autocommit-fallback closer. Tighten: when launching an Opus task estimated >60 min, budget ~45 min of orchestrator recovery time as a worst-case. Two-autocommit pattern (vs one) is the tell that the agent was working but got truncated — preserve both for attribution.
2. **Compose tasks need ≤4 orchestrator fix-ups**: image-tag drift, healthcheck command vs image contents, deprecated env vars, **IPv4 pinning for healthchecks on alpine images**. Future compose prompts should include all four as preflight checks.
3. **Cross-project host-port collisions are a class of bug.** Doctrine fix: scaffold every new project's Compose stack with `${<PROJECT>_HOST_PORT_<SERVICE>:-default}` env vars + a project-specific 10xxx-block AND a project-specific `*.localhost` suffix. Cross-cut to `~/.claude/docs/cc-platform-feedback.md`.
4. **`drizzle-kit generate` always re-emits `CREATE SCHEMA "name"` for `pgSchema()` targets.** Hand-strip required after every `db:generate` when the schema is infra-managed. Cross-cut to cc-platform-feedback.
5. **drizzle-orm's bundled migrator is incompatible with infra-managed schemas.** It unconditionally emits `CREATE SCHEMA IF NOT EXISTS` for both data + tracking schemas, requiring DB-level CREATE. For services with least-privilege grants, write a ~50-line custom migrator that routes the tracking table into the schema you already own. Cross-cut to cc-platform-feedback.
6. **Seed idempotency requires fixed UUIDs on every row, not just "most".** `onConflictDoNothing` is a no-op against `defaultRandom()` PKs. Always write the assertion (run twice, expect equal counts) FIRST.
7. **Pre-push CVE recurrence is the new normal.** 2/4 wave starts this session surfaced fresh HIGH/CRITICAL on agent-picked dep versions (T-0.4.2 `@fastify/jwt`, T-1.0.0 `drizzle-orm`). Fix is mechanical; budget ~5 min per occurrence.
8. **Branch protection works** — direct `git push origin main` rejected by `protect-main`; doc-tick PRs are the established pattern.
9. **`gh pr update-branch` is the right tool for required-up-to-date branches on linear-history repos**.
10. **CVE bumps + schema + cryptographic primitives all escalate per doctrine** — even when CI is green. Half the session's PRs escalated; counter preserved for legitimate auto-merge wins.
11. **The `dt_` namespace + `dt.localhost` suffix isolate daily-tour from sibling dev stacks** (PR #21 made this structural).
12. **Fastify v5 dropped `req.remoteAddress`** in favor of `req.ip`. Pattern for future Fastify v5 services.
13. **`tsx watch` + `initOtel()` has a startup ordering bug** — health responds but main() side-effects skip. Direct `tsx` and `node dist/index.js` both work. Avoid `tsx watch` for services that initialize OTel at module load.

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md):

- ✅ Allow auto-merge
- ✅ Squash merging
- ✅ Auto-delete head branches
- ✅ Ruleset `protect-main` requiring all 6 CI checks + 0 approvals + linear history + block force-push + block deletions

Nothing to change on the GitHub side.

## Session ending state checklist

- [x] PRs #20, #21, #22, #23, #24 merged. Local main at `792eaa6` (about to be `<this PR>` once #25 docs lands).
- [x] All cs-agent worktrees for this project killed (`t0-4-3`, `t1-0-0`, `t1-0-1`). One unrelated worktree (`plan-028-slice-a`) lives in the same dir but belongs to another project.
- [x] T-1.0.2 prompt NOT yet drafted — that's the next session's first task (or this session's if you `continue`).
- [x] cc-platform-feedback.md appended this session with 2 cross-project doctrine candidates (host-port collision template, Drizzle CREATE SCHEMA re-emit). The custom migrator pattern from T-1.0.1 is another candidate — could append at start of next session.
- [x] EXECUTION.md has Wave 10 entry; TODO.md reflects 17/100 done with T-1.0.2 🟢; this handoff doc rewritten.
- [x] Telegram channel paired (chat_id `2031690099`); message ids 15, 17, 18 are this session's last 3; **3/3 digest sends as part of this turn**.

## Pending Telegram digest (sends after this docs PR opens)

```
Slice 1.0 is half done.

Five PRs landed in this burst:
- #20 (docs post-T-0.4.3) — auto-merged.
- #21 (port + hostname remap, *.dt.localhost) — human-merged. Avoids
  collisions with cc-dev, po-platform, fit, supabase. 27xxx host-port
  block.
- #22 (T-1.0.0 Drizzle schema) — human-merged. 3 tables in auth_tokens,
  bundled @fastify/jwt CVE bump → drizzle-orm CVE bump on top (^0.36 →
  ^0.45.2), reservation-seed idempotency bug fix.
- #23 (docs Wave 9) — auto-merged.
- #24 (T-1.0.1 token-svc HTTP) — human-merged. 3 endpoints +
  Testcontainers tests + Dockerfile + custom migrator (drizzle's
  bundled one is incompatible with infra-managed schemas at
  least-privilege). Agent crashed at ~40%; orchestrator recovery wrote
  the rest. ~60 min total.

Auto-merge counter: 3/3 → paused per doctrine.
Slice 1.0 status: 2/4 done. T-1.0.2 (BFF middleware + Redis JTI cache)
is next. T-1.1.0 (catalog schema) is also unblocked and parallel-able.

Reply `continue` to launch T-1.0.2 (and optionally parallel T-1.1.0),
or `pause` to take a beat.
```

## How to resume

1. Read this doc + `CLAUDE.md` + the auto-merge doctrine.
2. Confirm Telegram digest sent (this session's #25 docs PR triggers it).
3. On `continue`: draft `temp/prompt-t-1.0.2.md`. Modelled on the T-1.0.1 prompt's scope-fence pattern. Key acceptance from [`TODO.md T-1.0.2`](../implementation-plans/001-roadmap/TODO.md): `/r/:token` first-load exchanges + sets `dt_refresh` HttpOnly cookie + caches JTI in Redis with 1-min TTL; revoked JTI returns 401 within 1 min of revocation; integration test uses Testcontainers for both PG and Redis.
4. Optionally parallel-launch T-1.1.0 (catalog Drizzle schema). Same shape as T-1.0.0 → use the Sonnet profile, lean on the existing T-1.0.0 prompt as template.
5. Verify on the dev infra. token-svc isn't compose-orchestrated yet — T-1.0.2 will add the overlay (so the BFF can reach `dt_token_svc:8088` via `dt_internal`).
6. Push, open PR — **schema + auth surface = escalate**. Counter stays at 0/3 (counter resets on your `continue`).
