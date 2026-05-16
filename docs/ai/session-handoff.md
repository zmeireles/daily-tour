# Session Handoff — 2026-05-17 00:00 → next session

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).

## TL;DR — first task of next session

T-1.0.3 (PWA token-URL router + Zustand) and T-1.1.1 (catalog-svc Fastify CRUD) are **launched in parallel** (or queued via [`temp/prompt-t-1.0.3.md`](../../temp/prompt-t-1.0.3.md) + [`temp/prompt-t-1.1.1.md`](../../temp/prompt-t-1.1.1.md) if not yet launched). First task: `cs-agent status | grep -E "t1-0-3|t1-1-1"` and inspect each.

**Profile choice for both: claude-sonnet-yolo.** This session's data:

- Sonnet: 3/3 clean self-commits (t0-4-3 corrected: was claude-yolo per earlier handoff but committed clean anyway; t1-0-0, t1-1-0 confirmed Sonnet, both clean).
- Opus: 2/4 crashed at autocommit-fallback (t1-0-1 ~40%, t1-0-2 ~70%; t0-4-3 was the earlier one too — handoff said clean self-commit, recheck).

Net: Sonnet is the safer default. Opus stays for genuinely hard reasoning (the IPv4-pin discovery on T-0.4.3 and the custom-migrator design on T-1.0.1 were Opus wins).

After T-1.0.3 closes, **Slice 1.0 fully done** (4/4). After T-1.1.1 closes, T-1.1.2 (28-place seed) unblocks. The discover endpoint (T-1.2.0, BFF aggregator) is unlocked by T-1.0.2 ✅ + T-1.1.1, so it becomes the next critical-path item once T-1.1.1 ships.

## Where we are

| Slice                              | Status                            | Tasks                                                               |
| ---------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS) | All slices ✅                                                       |
| 1.0 — Reservation token & access   | 🟡 3/4 done                       | **T-1.0.0 ✅ · T-1.0.1 ✅ · T-1.0.2 ✅** · T-1.0.3 🟢 (in flight)   |
| 1.1 — Catalog data model           | 🟡 1/3 done                       | **T-1.1.0 ✅** · T-1.1.1 🟢 (in flight) · T-1.1.2 🔒 (deps T-1.1.1) |
| 1.2 — Discover (6-action grid)     | 🔒                                | T-1.2.0 unblocks when T-1.1.1 ships (deps T-1.0.2 ✅ + T-1.1.1)     |
| 1.3 — Place detail                 | 🔒                                | depends on Slice 1.1                                                |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                | depends on T-1.6.x for OIDC                                         |
| 1.5 — Ingest skeleton              | 🟢 ready (parallel candidate)     | Python service, deps T-0.2.2 ✅ + T-0.3.0 ✅ — could run alongside  |
| 1.6 — Authentik integration        | 🔒                                | clears 2 deferrals (OIDC provider + forward-auth)                   |

**Phase 1 progress**: 4/25 done. After T-1.0.3 + T-1.1.1 close: 6/25, Slice 1.0 fully done, T-1.2.0 + T-1.1.2 unblock.

## Open PRs / in-flight

- **None on GitHub** at session end (PRs #20-#27 + this docs PR #28 all merged).
- **`cs-agent t1-0-3`**: PWA token-URL router + Zustand session store. Profile: `claude-sonnet-yolo`. Est. 45-60 min.
- **`cs-agent t1-1-1`**: catalog-svc Fastify CRUD (places + guesthouses + owner-profile). Profile: `claude-sonnet-yolo`. Est. 75-100 min (5 entity REST surfaces with i18n + soft-delete + Testcontainers Vitest).

## Auto-merge counter

**0/3.** Reset on the `continue` ack between t1-0-2 + t1-1-0 cycle and the t1-0-3 + t1-1-1 launches. This burst's accounting:

| #   | PR                                         | Type                                   | Counter         |
| --- | ------------------------------------------ | -------------------------------------- | --------------- |
| 1   | #26 — T-1.0.2 BFF auth + Redis             | human-merged (auth + crypto escalates) | 0/3 (unchanged) |
| 2   | #27 — T-1.1.0 catalog schema               | human-merged (schema escalates)        | 0/3 (unchanged) |
| 3   | #28 (this docs PR) — Waves 11+12 + handoff | auto-merged                            | 1/3             |

T-1.0.3 + T-1.1.1 land NEXT and will both escalate (frontend auth state interacts with the JWT verify path → escalate; CRUD with i18n + soft-delete + permissions → escalate). Counter likely stays 1/3.

## Deferrals tracked across the session

Document these as P0 follow-ups when their unlock task arrives. Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md):

| Deferral                                                             | Owner task                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **BFF Docker image: 216 MB vs 200 MB target**                        | Phase 0 / 5 — investigate distroless / OTel sidecar split. Structural ceiling.                               |
| **token-svc Docker image: 227 MB**                                   | Same investigation as BFF.                                                                                   |
| **Authentik OIDC provider creation** (blueprint failed on 2026.2.2)  | T-1.6.0 owns it via the Authentik API at BFF + JWKS integration time.                                        |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**   | T-0.3.4 or T-1.6.x.                                                                                          |
| **Stitch MCP mockup generation**                                     | T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat.                                        |
| **n8n on dedicated Postgres**                                        | Phase 5 hardening.                                                                                           |
| **CI deploy gate to QA VPS** (T-0.4.4)                               | Unblocked when QA Ubuntu 24 VPS exists.                                                                      |
| **Docs/design tokens-light.svg + tokens-dark.svg**                   | Generate when Stitch mockups land.                                                                           |
| **n8n auto-revoke flow on `reservation.cancelled`**                  | Follow-up after RabbitMQ event wiring.                                                                       |
| **token-svc revoke endpoint authorization gate**                     | Wrap in mTLS / API-key when n8n auto-revoke lands.                                                           |
| **token-svc asymmetric JWT signing (RS256 / ES256) + JWKS endpoint** | T-1.6.0 may switch for Authentik consistency.                                                                |
| **tsx watch + initOtel() startup ordering bug**                      | Native dev workaround: use `./node_modules/.bin/tsx src/index.ts` directly. Or switch dev script to nodemon. |
| **BFF refresh-cookie consumer** (re-issue JWT when expired)          | T-1.0.3 (PWA) may surface the need; deferred from T-1.0.2.                                                   |
| **catalog-svc compose overlay**                                      | T-1.1.1 will add it.                                                                                         |
| **catalog-svc Authentik wrap for owner-side write endpoints**        | T-1.6.0 + T-1.4.x (Owner CRUD slice).                                                                        |

## Pattern observations (orchestrator)

These should inform future prompts:

1. **Opus crash rate this session = 2/4 (50%) at autocommit-fallback closer**; Sonnet = 0/3 (100% clean). The pattern is stable. **Default to Sonnet** for mechanical Phase 1 tasks. Reserve Opus for genuinely hard reasoning (the T-0.4.3 IPv4-pin discovery and the T-1.0.1 custom-migrator design were Opus wins — both required cold reading of runtime image behavior and tool semantics).
2. **Parallel-launch works** when file scope is disjoint (different services / different worktrees). Only `pnpm-lock.yaml` is contested — resolves cleanly via `gh pr update-branch` on the 2nd-merged PR.
3. **Compose tasks need ≤4 orchestrator fix-ups**: image-tag drift, healthcheck command vs image contents, deprecated env vars, **IPv4 pinning for healthchecks on alpine images**.
4. **Cross-project host-port collisions = class of bug.** Doctrine fix in cc-platform-feedback.
5. **`drizzle-kit generate` always re-emits `CREATE SCHEMA` for `pgSchema()` targets.** Hand-strip after every regen.
6. **drizzle-orm's bundled migrator is incompatible with least-privilege roles.** Custom ~50-line migrator routes tracking into the owned schema. **Reference impl**: `services/token-svc/src/db/client.ts` (also copied into `services/catalog-svc/src/db/client.ts`).
7. **Seed idempotency requires fixed UUIDs on every row.** Lesson learned T-1.0.0; applied cleanly in T-1.1.0.
8. **Pre-push CVE recurrence is the new normal.** 2/4 wave starts this session surfaced fresh HIGH/CRITICAL on agent-picked dep versions (`@fastify/jwt`, `drizzle-orm`).
9. **Branch protection + `gh pr update-branch`** is the standard pattern for required-up-to-date branches on linear-history repos. Used 5 times this session.
10. **CVE bumps + schema + auth surface + cryptographic primitives all escalate per doctrine** — preserves auto-merge counter for legitimate auto-merge wins (docs, infra-additive, low-risk renames).
11. **Fastify v5 dropped `req.remoteAddress`** in favor of `req.ip`.
12. **`tsx watch` + `initOtel()` has a startup ordering bug** — direct `tsx` works; bundled `node dist/index.js` works. Avoid `tsx watch` for services that initOtel() at module load.
13. **Secure-by-default `onRoute` hook** is the right pattern for Fastify auth (T-1.0.2). New routes opt-out via `config.auth = "public"` explicitly.
14. **Mock downstream-service HTTP clients at the test boundary** rather than spinning them up in-process. Already-covered E2E in the downstream's own tests; mocking keeps the consumer's test fast + focused.
15. **Mid-session cc-platform-feedback append → agent reads on launch.** The custom-migrator doctrine note I added between T-1.0.1 and T-1.1.0 was visible (via the prompt's link) and applied by t1-1-0 without prompting. The queue → reference pattern works for cross-task knowledge transfer within a session.

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md):

- ✅ Allow auto-merge
- ✅ Squash merging
- ✅ Auto-delete head branches
- ✅ Ruleset `protect-main` requiring all 6 CI checks + 0 approvals + linear history + block force-push + block deletions

Nothing to change on the GitHub side.

## Session ending state checklist

- [x] PRs #26 + #27 merged. Local main at `e054530` (about to be `<this PR>` once #28 docs lands).
- [x] cs-agent worktrees `t1-0-2` + `t1-1-0` killed cleanly. New worktrees `t1-0-3` + `t1-1-1` launched (or queued, check status).
- [x] Both prompts at `temp/prompt-t-1.0.3.md` + `temp/prompt-t-1.1.1.md`.
- [x] EXECUTION.md has Waves 11+12 entry; TODO.md reflects 19/100 done (Phase 1 at 4/25) with 3 ready (T-1.0.3, T-1.1.1, T-1.5.0); this handoff rewritten.
- [x] Telegram channel paired (chat_id `2031690099`); messages going to TUI per user's instruction at msg #22.

## How to resume

1. Read this doc + `CLAUDE.md` + the auto-merge doctrine.
2. `cs-agent status | grep -E "t1-0-3|t1-1-1"` — verify both states. Either should commit cleanly given Sonnet's 100% rate this session.
3. On commit: verify each via the prompt's verification suite (PWA: build + vitest + Playwright if added; catalog: install + lint/typecheck/test/build + Testcontainers tests).
4. Push, open PRs. **T-1.0.3 escalates** (auth state in browser surface) and **T-1.1.1 escalates** (REST CRUD with permissions surface even before Authentik wraps it). No `--auto`.
5. Decide next launches:
   - **T-1.1.2** (28-place seed) — unblocks once T-1.1.1 ships. Sonnet, mechanical fixture loader.
   - **T-1.2.0** (BFF discover aggregator) — unblocks once T-1.1.1 ships. Sonnet or Opus (it's the first real authed feature route, exercises the auth decorator from T-1.0.2).
   - **T-1.5.0** (Python ingest skeleton) — already unblocked, parallel-able with the above.
