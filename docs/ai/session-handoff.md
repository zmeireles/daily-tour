# Session Handoff — 2026-05-17 00:20 → next session (CLOSEOUT)

> Read this file first on next session, alongside [`CLAUDE.md`](../../CLAUDE.md), [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md), and [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).
>
> **This session ran out of token budget mid-cycle.** Two PRs (#29 + #30) are open and CI-green but **NOT yet merged** by the user. The handoff below tells you exactly how to pick up.

## TL;DR — exactly what to do next session

1. **Verify the two pending PRs are still CI-green:**
   ```bash
   gh pr checks 29   # T-1.1.1 catalog-svc CRUD
   gh pr checks 30   # T-1.0.3 PWA /r/:token + Zustand
   ```
2. **Merge BOTH** (they are escalated per doctrine — auth surface (#30) + CRUD with permissions (#29) + new Compose entry (#29)). User-explicit ack already given last session for the burst.
   ```bash
   gh pr merge 30 --squash --delete-branch    # T-1.0.3 first (closes Slice 1.0)
   # When #29 lands BEHIND main after #30, use:
   gh pr update-branch 29
   # Wait for CI re-run, then:
   gh pr merge 29 --squash --delete-branch
   ```
3. **Kill the worktrees:**
   ```bash
   cs-agent kill t1-0-3
   cs-agent kill t1-1-1
   ```
4. **Pull main + run the post-cycle docs** (TODO ticks + Waves 13+14 in EXECUTION + handoff rewrite + open docs PR with auto-merge). The full text for the Wave 13 + Wave 14 entries is included below in the **"Pre-written EXECUTION.md entries for Waves 13 + 14"** section — paste those into EXECUTION.md.
5. **Next launches** (after the docs cycle): T-1.1.2 (28-place seed) + T-1.2.0 (BFF discover aggregator), both unblocked once #29 lands. Both Sonnet-appropriate. See "Next launches" section below for prompts to draft.

## Where we are

| Slice                              | Status                                   | Tasks                                                             |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| **Phase 0 — Foundation**           | ✅ closed (15/16; T-0.4.4 🔒 VPS)        | All slices ✅                                                     |
| 1.0 — Reservation token & access   | 🟡 3/4 done · **4/4 once #30 merges**    | T-1.0.0 ✅ · T-1.0.1 ✅ · T-1.0.2 ✅ · **T-1.0.3 🟡 in PR #30**   |
| 1.1 — Catalog data model           | 🟡 1/3 done · **2/3 once #29 merges**    | T-1.1.0 ✅ · **T-1.1.1 🟡 in PR #29** · T-1.1.2 🔒 (deps T-1.1.1) |
| 1.2 — Discover (6-action grid)     | 🔒 → 🟢 ready **once #29 merges**        | T-1.2.0 deps T-1.0.2 ✅ + T-1.1.1                                 |
| 1.3 — Place detail                 | 🔒                                       | depends on Slice 1.1                                              |
| 1.4 — Owner CRUD (Authentik-gated) | 🔒                                       | depends on T-1.6.x for OIDC                                       |
| 1.5 — Ingest skeleton              | 🟢 ready (parallel candidate; unchanged) | Python service, deps T-0.2.2 ✅ + T-0.3.0 ✅                      |
| 1.6 — Authentik integration        | 🔒                                       | clears 2 deferrals                                                |

**Phase 1 progress**: 4/25 done. After both PRs merge: **6/25**, Slice 1.0 fully closed, T-1.1.2 + T-1.2.0 + T-1.5.0 all ready.

## Open PRs (pending your merge)

### PR #30 — T-1.0.3 (PWA `/r/:token` + Zustand session store)

- **State**: OPEN · all 6 CI checks GREEN
- **Branch**: `jmeireles/t1-0-3`
- **Profile**: claude-sonnet-yolo
- **Commit**: `1787cce feat(pwa): add /r/:token route + Zustand session store + auth lib`
- **Type**: Clean Sonnet self-commit. No orchestrator rescue.
- **Files**: 10 new files in `apps/pwa/src/` (routes/r.$token.tsx, routes/index.tsx, store/session.ts, lib/auth/exchange.ts, lib/i18n.ts, 3 test files + setup, package.json + main.tsx tweaks). +543/−142.
- **Escalation reason**: Frontend auth state interacts with JWT verify path per doctrine.
- **PR body**: written; on GitHub.

### PR #29 — T-1.1.1 (catalog-svc Fastify CRUD)

- **State**: OPEN · all 6 CI checks GREEN
- **Branch**: `jmeireles/t1-1-1`
- **Profile**: claude-sonnet-yolo
- **Commits**:
  - `b0e51a3 feat: agent work on t1-1-1 (auto-committed by closer)` — agent crash at ~50% (Fastify scaffold + places route, 321 LOC clean).
  - `f98807e feat(catalog-svc): complete T-1.1.1 — guesthouses/owner-profiles routes, Testcontainers tests, Dockerfile, compose entry` — orchestrator manual completion: 2 more route files (200 + 160 LOC), 4 Testcontainers test files (13 tests pass), Dockerfile + dual `.dockerignore`, tsup + vitest configs, compose-app.yml catalog-svc entry, READMEs. Plus 2 fix-ups to agent code: replaced `as ReturnType<typeof eq>` casts with proper typed array (imports `SQL` from drizzle-orm); fixed `isUniqueViolation()` to also check `err.cause.code` (drizzle wraps pg errors in DrizzleQueryError — without this, dup-slug test got 500 instead of 409).
- **Type**: **First Sonnet crash this session** (prior: 0/3). Crash class is real and not profile-specific.
- **Escalation reason**: CRUD with permissions surface + new Compose entry per doctrine.
- **PR body**: written; on GitHub.
- **Will need `gh pr update-branch 29`** if #30 merges first (pnpm-lock.yaml conflict).

## Open in-flight cs-agent worktrees

- `t1-0-3` at `/home/jmeireles/.claude-squad/worktrees/jmeireles/t1-0-3` (branch `jmeireles/t1-0-3`)
- `t1-1-1` at `/home/jmeireles/.claude-squad/worktrees/jmeireles/t1-1-1` (branch `jmeireles/t1-1-1`)

Both committed + pushed. Safe to `cs-agent kill` after merging.

## Auto-merge counter

**1/3.** Last session burned:

- #28 (Waves 11+12 docs) — auto-merged → 1/3

Pending:

- #29 (T-1.1.1) — will be human-merged (escalates) → counter unchanged
- #30 (T-1.0.3) — will be human-merged (escalates) → counter unchanged
- Next docs PR (Waves 13+14) — auto-mergeable → counter 1/3 → 2/3

## Pre-written EXECUTION.md entries for Waves 13 + 14

Paste these into `docs/implementation-plans/001-roadmap/EXECUTION.md` ABOVE the existing Waves 11+12 entry, in the same format. Adjust SHAs if any rebase changes them on merge.

### Wave 13 — 2026-05-16 — T-1.0.3 (parallel half) — closes Slice 1.0

| Agent  | Task ID | Branch           | Profile            | Scope                                                  | Status                   |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------ | ------------------------ |
| t1-0-3 | T-1.0.3 | jmeireles/t1-0-3 | claude-sonnet-yolo | PWA /r/:token route + Zustand session store + auth lib | Done (clean self-commit) |

#### Agent: t1-0-3 (T-1.0.3) — clean Sonnet self-commit

- **Started**: 2026-05-16 23:53
- **Finished**: agent ~13 min (clean self-commit `1787cce`); orchestrator verify + push ~5 min
- **Predicted time**: 45–60 min
- **Actual time**: ~18 min total (significantly under estimate)
- **Complexity**: Medium (auth lib + Zustand + react-router 7 + i18next + 3 vitest cases)
- **LOC changed**: 10 new files (+543 / −142 across the agent's commit; existing App.tsx + main.tsx modified)
- **Commit**: ✅ `1787cce` — clean Sonnet self-commit. No orchestrator rescue.
- **PR**: [#30](https://github.com/zmeireles/daily-tour/pull/30) (merged as `<sha>`, all 6 CI checks green; human-merged per doctrine)
- **Acceptance**: 5/5 criteria met. `/r/:token` consumes opaque + calls BFF exchange + stores JWT in Zustand (memory-only, no localStorage); `useSession()` selector exposes `{jwt, exp, reservation, guest}`; refresh-cookie flow deferred per prompt; expired → sonner toast + redirect to `/?reason=expired`; 3 vitest cases (happy, expired, network error) using React Testing Library + mocked exchange client.
- **Issues**: None on this branch. (T-1.1.1 sibling-parallel run had a Sonnet autocommit-fallback crash — first this session.)
- **New lessons**:
  - **`fetch` with `redirect: "manual"`** is the right pattern for detecting upstream graceful-degrade redirects. The PWA's exchange client throws `TokenExpiredError` on `res.type === "opaqueredirect"` so the route handler can show a toast + soft-redirect.
  - **react-router 7's `navigate({ replace: true })`** prevents back-button into a stale `/r/:token` after exchange. Use replace for any "consumed" URL.
  - **`Storage.prototype.setItem` spy in tests** is the simplest way to assert "this code never touches localStorage" — important for token hygiene (D15).
- **Decisions made on the fly**:
  - Used `createBrowserRouter` + `<RouterProvider>` (react-router 7's data-router API) over the legacy `<BrowserRouter>` — agent's choice. Cleaner.
  - i18next defaultValue fallback in `t()` so tests don't need full i18n init.

### Wave 14 — 2026-05-16 — T-1.1.1 (parallel half, recovery) — first Sonnet autocommit-fallback this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                                             | Status                  |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------- | ----------------------- |
| t1-1-1 | T-1.1.1 | jmeireles/t1-1-1 | claude-sonnet-yolo | catalog-svc Fastify CRUD (places + guesthouses + owner-profiles) + Testcontainers + compose entry | Crashed @ ~50%; rescued |

#### Agent: t1-1-1 (T-1.1.1) — partial agent + orchestrator rescue

- **Started**: 2026-05-16 23:54
- **Finished**: agent ~10 min before crash (autocommit `b0e51a3`); orchestrator manual completion ~25 min; verification + push ~5 min
- **Predicted time**: 75–100 min
- **Actual time**: ~40 min total
- **Complexity**: High (3 REST surfaces + Testcontainers harness + Dockerfile + compose entry + i18n jsonb handling + cursor pagination)
- **LOC changed**: ~16 files (+~1100 / −5 across 2 commits)
- **Commits**:
  - ⚠️ `b0e51a3` — cs-agent autocommit-fallback. Fastify scaffold (app, config, index, instrumentation, version, health), full places route (321 LOC with zod validation, base64 cursor pagination, idempotent soft-delete, 409 on unique conflict).
  - ✅ `f98807e` — orchestrator manual completion: guesthouses route (200 LOC, hard-delete, 409 on dup slug), owner-profiles route (160 LOC, POST = upsert by PK), `__tests__/helpers.ts` (Testcontainers-pg with inline migrator), 4 test files (13 tests total), Dockerfile + dual `.dockerignore`, tsup + vitest configs, package.json scripts/deps restored + Fastify/OTel/Testcontainers added, tsconfig.eslint.json fix, compose-app.yml catalog-svc entry, infra/README + svc README. Plus 2 fix-ups to agent's places.ts: replaced `as ReturnType<typeof eq>` casts with `(SQL | undefined)[]` typed array; fixed `isUniqueViolation()` to check `err.cause.code` (drizzle wraps pg errors so SQLSTATE 23505 lives there, not on the direct error).
- **PR**: [#29](https://github.com/zmeireles/daily-tour/pull/29) (merged as `<sha>`, all 6 CI checks green; human-merged per doctrine). Title needed lowercase-subject fix (agent's "Fastify CRUD endpoints" violated the subject-case rule).
- **Acceptance**: all 5/5 criteria met. 3 REST surfaces (places + guesthouses + owner-profiles); i18n jsonb; soft-delete on places + hard-delete on the others (no status columns); 13/13 vitest pass in ~11s (Testcontainers-pg on pgvector:pg17); listens on :8081.
- **Issues**:
  1. **First Sonnet autocommit-fallback this session.** Crash class is real and NOT Opus-specific. Updated session-wide stat: Sonnet 1/4 (25%) vs Opus 2/4 (50%). Sonnet still has lower crash rate but neither is reliable.
  2. **`isUniqueViolation` indirection** — drizzle-orm 0.45.x wraps `pg.DatabaseError` in `DrizzleQueryError`. The error code (SQLSTATE 23505 for unique violation) lives on `.cause`, not directly on `.code`. Without checking both shapes, 409 conflicts return 500. Likely affects any drizzle-orm project that needs to handle pg error codes.
  3. **`build: "tsup"` script copy-paste** — agent restored the build script from token-svc's template (T-1.0.0 had dropped it for the schema-only state). Now correct.
  4. **PR title subject-case** — "feat(catalog-svc): Fastify CRUD endpoints (...)" started with capital F. pr-title.yml's `subjectPattern: ^(?![A-Z]).+$` rejected. Renamed to "feat(catalog-svc): add CRUD endpoints (...)". **Lesson**: orchestrator PR titles must follow the same lowercase-subject rule as commit messages.
- **New lessons**:
  - **drizzle-orm wraps pg errors** — any code checking pg SQLSTATE codes must check `err.cause.code`, not just `err.code`. Cross-cut to cc-platform-feedback as a Drizzle gotcha (3rd entry: in addition to the CREATE-SCHEMA emit + the bundled-migrator-vs-least-privilege, now the wrapped-pg-error pattern).
  - **Sonnet's reliability advantage shrinks at higher complexity tasks.** T-1.1.1's spec was the most complex Sonnet has handled this session (3 REST surfaces + Testcontainers + Dockerfile + compose). Sonnet handled the first ~50% cleanly then crashed. Pattern: complexity affects crash rate independent of profile.
- **Decisions made on the fly (orchestrator)**:
  - Hard-delete on guesthouses + owner-profiles (no status column on those tables; T-1.4.x may add via migration if soft-delete becomes a requirement).
  - POST upsert semantics on owner-profiles (PK is owner_id, caller provides). 201 on insert, 200 on update.

## Pre-written TODO.md tick text (paste into the existing 🟢 entries to flip them ✅)

### Replace `#### 🟢 T-1.0.3` block with:

```
#### ✅ T-1.0.3 — PWA: token-URL router + auth state (Zustand)

> **Resolved 2026-05-17 via [PR #30](https://github.com/zmeireles/daily-tour/pull/30).** 10 new files (+~543 LOC). Profile: claude-sonnet-yolo. **Clean Sonnet self-commit** (`1787cce`) — no orchestrator rescue. `/r/:token` route via react-router 7's data-router API; Zustand session store (no `persist`, no localStorage — D15 hygiene); `jose.decodeJwt` for claim extraction (server already verified); `redirect: "manual"` to detect BFF's 302 graceful-degrade; i18next + sonner toaster; `navigate({ replace: true })` prevents back-button-to-stale; 3 vitest cases (happy + expired + network error) mocking the exchange client at the boundary. **Slice 1.0 closes** with this merge.
```

### Replace `#### 🟢 T-1.1.1` block with:

```
#### ✅ T-1.1.1 — `catalog-svc` Fastify CRUD: places, guesthouses, owner-profile

> **Resolved 2026-05-17 via [PR #29](https://github.com/zmeireles/daily-tour/pull/29).** 2 commits (~16 files, +~1100/−5). Profile: claude-sonnet-yolo. **First Sonnet autocommit-fallback this session** at ~50% (`b0e51a3` — Fastify scaffold + places route, 321 LOC clean with full zod + cursor pagination + idempotent soft-delete + 409 on unique conflict). Orchestrator wrote remaining ~50% (`f98807e`): guesthouses route (200 LOC, hard-delete since no status column — Phase 1 trade-off), owner-profiles route (160 LOC, POST = upsert by owner_id PK), Testcontainers-pg harness with inline migrator, 13 vitest tests (4 files), Dockerfile + dual `.dockerignore`, tsup + vitest configs, compose-app.yml catalog-svc entry (internal-only, IPv4-pinned healthcheck, depends_on bff), `infra/README.md` updates (12→13 services), service README. Plus 2 fix-ups: `(SQL \| undefined)[]` typed conditions array replacing `as ReturnType<typeof eq>` casts; `isUniqueViolation()` now checks `err.cause.code` (drizzle wraps pg errors in DrizzleQueryError so SQLSTATE 23505 lives on `.cause`). PR title needed lowercase-subject fix ("Fastify" → "add CRUD"). Per [doctrine](../../operations/auto-merge-doctrine.md), CRUD with permissions surface + new Compose entry both escalate — human-merged.
```

### Update Progress Summary table:

```
| 0 — Foundation                  | 4      | 16      | 15     | 0           | 0     | 1       |
| 1 — Guest Landing & Catalog v1  | 7      | 25      | 6      | 0           | 3     | 16      |
| 2 — Discovery & Search          | 4      | 11      | 0      | 0           | 0     | 11      |
| 3 — Daily Tour Planner          | 5      | 16      | 0      | 0           | 0     | 16      |
| 4 — Chat & Reservation Drafting | 5      | 15      | 0      | 0           | 0     | 15      |
| 5 — Hardening & Growth          | 6      | 17      | 0      | 0           | 0     | 17      |
| **Total**                       | **31** | **100** | **21** | **0**       | **3** | **76**  |
```

Plus flip these to 🟢 in the body:

- `#### ⬜ T-1.1.2 — 28-place seed fixture loader` → `#### 🟢 T-1.1.2`
- `#### ⬜ T-1.2.0 — BFF aggregator: GET /v1/discover...` → `#### 🟢 T-1.2.0`

## Deferrals tracked across the session

Mirrored in [`docs/ai/backlog.md "Engineering follow-ups"`](./backlog.md). **No new deferrals from Waves 13 + 14** (all in-scope work shipped).

| Deferral                                                                | Owner task                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **BFF Docker image: 216 MB vs 200 MB target**                           | Phase 0 / 5 — distroless / OTel sidecar split.                               |
| **token-svc Docker image: 227 MB**                                      | Same investigation as BFF.                                                   |
| **catalog-svc Docker image** (size TBD when first compose-up done)      | Same investigation as BFF.                                                   |
| **Authentik OIDC provider creation**                                    | T-1.6.0.                                                                     |
| **Authentik forward-auth Proxy Provider binding + outpost wiring**      | T-0.3.4 or T-1.6.x.                                                          |
| **Stitch MCP mockup generation**                                        | T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat.        |
| **n8n on dedicated Postgres**                                           | Phase 5 hardening.                                                           |
| **CI deploy gate to QA VPS** (T-0.4.4)                                  | Unblocked when QA Ubuntu 24 VPS exists.                                      |
| **Docs/design tokens-light.svg + tokens-dark.svg**                      | Generate when Stitch mockups land.                                           |
| **n8n auto-revoke flow on `reservation.cancelled`**                     | Follow-up after RabbitMQ event wiring.                                       |
| **token-svc revoke endpoint authorization gate**                        | Wrap in mTLS / API-key when n8n auto-revoke lands.                           |
| **token-svc asymmetric JWT signing (RS256 / ES256) + JWKS endpoint**    | T-1.6.0.                                                                     |
| **tsx watch + initOtel() startup ordering bug**                         | Native dev workaround: direct `tsx` invocation.                              |
| **BFF refresh-cookie consumer** (re-issue JWT when expired)             | T-1.0.3 deferred; PWA flow may surface the need — could be a follow-up here. |
| **catalog-svc Authentik wrap for owner-side write endpoints**           | T-1.4.x (Owner CRUD slice) + T-1.6.0.                                        |
| **Soft-delete on guesthouses + owner-profiles** (currently hard-delete) | T-1.4.x may add status columns via new migration if business needs it.       |

## Pattern observations (orchestrator) — updated through Wave 14

1. **Agent crash rate this session: Sonnet 1/4 (25%), Opus 2/4 (50%).** Sonnet has the lower crash rate but **neither is reliable** at the autocommit-fallback closer. Budget orchestrator recovery time (~30-45 min) for any task estimated >60 min.
2. **Complexity drives crash rate independent of profile.** T-1.1.1 was Sonnet's most complex task this session (3 REST surfaces + Testcontainers + Dockerfile + compose) — and it crashed. Simpler tasks (T-0.4.3 compose overlay, T-1.0.0 schema, T-1.1.0 schema, T-1.0.3 PWA) all succeeded cleanly.
3. **Parallel-launch works.** Two waves of parallel launches (Waves 11+12, Waves 13+14) succeeded. Different worktrees + disjoint file scopes. Only `pnpm-lock.yaml` shared — resolves cleanly via `gh pr update-branch` on the 2nd-merged PR.
4. **Compose tasks need ≤4 orchestrator fix-ups**: image-tag drift, healthcheck command vs image contents, deprecated env vars, **IPv4 pinning for healthchecks on alpine images**.
5. **Cross-project host-port collisions = class of bug.** Doctrine fix in cc-platform-feedback.
6. **`drizzle-kit generate` always re-emits `CREATE SCHEMA` for `pgSchema()` targets.** Hand-strip after every regen.
7. **drizzle-orm bundled migrator is incompatible with least-privilege roles.** Custom ~50-line migrator routes tracking into the owned schema.
8. **drizzle-orm wraps pg errors in DrizzleQueryError.** SQLSTATE codes (like 23505 for unique violation) live on `err.cause.code`, NOT directly on `err.code`. **3rd Drizzle gotcha worth a cc-platform-feedback append.**
9. **Seed idempotency requires fixed UUIDs on every row.** Lesson learned T-1.0.0; applied cleanly in T-1.1.0.
10. **Pre-push CVE recurrence is the new normal.** 2/4 wave starts this session surfaced fresh HIGH/CRITICAL on agent-picked dep versions.
11. **Branch protection + `gh pr update-branch`** is the standard pattern for required-up-to-date branches on linear-history repos.
12. **CVE bumps + schema + auth surface + cryptographic primitives all escalate per doctrine.** Half the session's PRs escalated; counter preserved for legitimate auto-merge wins (docs).
13. **Fastify v5 dropped `req.remoteAddress`** in favor of `req.ip`.
14. **`tsx watch` + `initOtel()` has a startup ordering bug** — direct `tsx` works; `node dist/index.js` works. Avoid `tsx watch` for services that initOtel() at module load.
15. **Secure-by-default `onRoute` hook** is the right pattern for Fastify auth (T-1.0.2). New routes opt-out explicitly.
16. **Mock downstream-service HTTP clients at the test boundary.** Already-covered E2E in the downstream's own tests.
17. **Mid-session cc-platform-feedback append → agent reads on launch.** Doctrine queue → reference pattern.
18. **PR title lowercase-subject rule trips orchestrators too.** `feat(scope): Fastify ...` → must be `feat(scope): add fastify ...` (lowercase first word of subject). Pre-PR-create title check would catch this faster.
19. **`Storage.prototype.setItem` spy in tests** is the cheap way to assert "code never persists to localStorage" — important for token hygiene (D15).
20. **`fetch` with `redirect: "manual"`** is the right pattern for detecting upstream graceful-degrade redirects from client code.

## Next launches (T-1.1.2 + T-1.2.0)

Both unblock once PR #29 merges. Both Sonnet-appropriate.

### T-1.1.2 — 28-place seed fixture loader

- **owns**: `services/catalog-svc/seeds/places-sao-miguel.sql`, `services/catalog-svc/seeds/load.ts`
- **deps**: T-1.1.0 ✅, T-1.1.1 (pending merge)
- **acceptance**:
  - All 28 places from [`docs/exploration/05-tourism-domain.md §2`](../exploration/05-tourism-domain.md) loaded with action+wish tags, EN + pt-PT description placeholders, hours where known, geom, status='published'.
  - Hero photo URLs reference seeded MinIO objects (or stable Unsplash for dev — flagged for replacement).
  - `pnpm --filter @daily-tour/catalog-svc seed:places` is idempotent (fixed UUIDs per the T-1.0.0 lesson).
- **Prompt template**: Model on `temp/prompt-t-1.1.0.md`. Sonnet profile. Estimate 60-75 min (data entry from the tourism doc + the SQL + the loader). Recommend reading `05-tourism-domain.md §2` first to verify the 28-place list is complete.

### T-1.2.0 — BFF aggregator: `GET /v1/discover?action=<>&loc=...&km=...`

- **owns**: `services/bff/src/routes/discover.ts`, `services/bff/src/lib/catalog-client.ts`
- **deps**: T-1.0.2 ✅, T-1.1.1 (pending merge)
- **acceptance**:
  - Query params validated by zod from `shared-types`.
  - Filters by action; geo-filters by haversine; returns top 30 grouped by wish.
  - Response hydrates place-card payload (signed media URLs via T-1.4.x or stable Unsplash placeholder).
  - p95 < 300 ms with 28-place seed (needs T-1.1.2 to test).
  - First real authed feature route — exercises the auth decorator from T-1.0.2 (the `onRoute` hook auto-attaches `authenticate`).
- **Prompt template**: Model on `temp/prompt-t-1.0.2.md` for the BFF + auth interaction patterns; reference `services/catalog-svc/src/routes/places.ts` for the catalog-client shape (BFF calls `GET /v1/places?...` on catalog-svc via `dt_internal`). Sonnet profile. Estimate 75-100 min.

## Repo settings reminder

Already configured per the [auto-merge doctrine](../operations/auto-merge-doctrine.md). Nothing to change on GitHub.

## How to resume (step-by-step)

1. **Read this doc.** That's the whole context dump.
2. **Verify the two PRs are still CI-green.** `gh pr checks 29 && gh pr checks 30`.
3. **Merge `#30` first** (closes Slice 1.0). `gh pr merge 30 --squash --delete-branch`.
4. **Update-branch + merge `#29`.** `gh pr update-branch 29` → wait CI → `gh pr merge 29 --squash --delete-branch`.
5. **Kill worktrees.** `cs-agent kill t1-0-3 && cs-agent kill t1-1-1`.
6. **Pull main.** `git checkout main && git pull --ff-only origin main`.
7. **Run docs cycle**: tick T-1.0.3 + T-1.1.1 in TODO (use the pre-written text in this doc); append Waves 13 + 14 to EXECUTION (use the pre-written entries); flip T-1.1.2 + T-1.2.0 to 🟢; rewrite this handoff for the post-merge state; commit + push + auto-merge docs PR (counter goes 1/3 → 2/3).
8. **Append the 3rd Drizzle gotcha to cc-platform-feedback.md** — the `err.cause.code` wrapping pattern (template at the end of this doc would help; or paste from Pattern Observation #8 above).
9. **Draft T-1.1.2 + T-1.2.0 prompts** at `temp/prompt-t-1.1.2.md` and `temp/prompt-t-1.2.0.md`. Use the templates referenced above.
10. **Launch both in parallel** (Sonnet profile for both, disjoint worktrees). Same pattern as Waves 11+12 + 13+14.

## Session ending state checklist (CLOSEOUT)

- [x] PRs #26 + #27 + #28 merged (in prior cycle); main at `6323ba3` before this session-end docs commit
- [x] PRs #29 + #30 open, both CI-green, awaiting your merge
- [x] Worktrees `t1-0-3` + `t1-1-1` still alive — kill after merge
- [x] `cc-platform-feedback.md` has 2 doctrine items from this session (host-port template + Drizzle CREATE SCHEMA + bundled-migrator); the 3rd one (Drizzle wraps pg errors) is queued for next session
- [x] This handoff doc captures Waves 13 + 14 verbatim so next session has zero context-loss recovery to do
- [x] Telegram channel paired (chat_id `2031690099`); reports continue inline per user instruction at msg #22

The bus number for this session's work is now 1 (you). All in-flight state is on origin (the 2 open PRs) + on this handoff doc. Next session can pick up cleanly from main + the PR queue.
