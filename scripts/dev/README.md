# Dev Bring-up Scripts

Idempotent smoke scripts for bringing up the full Daily Tour stack locally. Run after a fresh clone, or whenever you need to fix-and-retry a stack issue.

## TL;DR

```bash
# First time: cold bring-up + smoke test + PWA
bash scripts/dev/dev-up.sh           # brings up infra + services
bash scripts/dev/dev-smoke.sh        # exercises guest journey end-to-end
pnpm --filter @daily-tour/pwa dev    # → http://localhost:5173

# Something failed?
bash scripts/dev/dev-up.sh           # re-run; idempotent — passes skip

# Reset when truly wedged
bash scripts/dev/dev-down.sh --clean # drops Docker volumes
bash scripts/dev/dev-up.sh           # cold bring-up again
```

## Files

| Script         | Purpose                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev-up.sh`    | Idempotent bring-up: preflight → install → infra → migrations → seed → required services → optional services → PWA hint. Stops on first FAIL. |
| `dev-smoke.sh` | Post-bring-up smoke: mint token → exchange → discover → place detail. Run after `dev-up.sh` returns 0.                                        |
| `dev-down.sh`  | Teardown. `--clean` drops volumes. `--hard` also removes `node_modules` + `dist` + `.turbo`.                                                  |
| `PLAN.md`      | Strategic plan + decision tree for handling failures.                                                                                         |

## Idempotency

Re-running `dev-up.sh` after a fix is the **fast path**. Each stage detects whether it's already up:

- Stage 2 (install): skipped if `node_modules/.pnpm` is newer than `pnpm-lock.yaml`
- Stage 3 (infra): docker compose `up -d` is a no-op for running containers
- Stage 4 (migrations): Drizzle tracks applied migrations
- Stage 5 (seed): catalog-svc seed is idempotent (UUID-keyed upserts)
- Stage 6-7 (services): docker compose `up -d` re-builds only changed images

## Stages (`dev-up.sh`)

| #   | Stage             | What it does                                                     | Common failures                                                 |
| --- | ----------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | PREFLIGHT         | Node 22, pnpm 9, Docker daemon, `.env` exists, JWT key ≥32 chars | Missing `.env` (copies from example), JWT too short             |
| 2   | INSTALL           | `pnpm install --frozen-lockfile` (or skip if cached)             | Lockfile drift → re-run without `--frozen-lockfile`             |
| 3   | INFRA             | postgres + redis + rabbitmq + minio via Compose base             | Port already in use → adjust `DT_HOST_PORT_*` in .env           |
| 4   | MIGRATIONS        | catalog-svc → token-svc → media-svc Drizzle migrations           | Schema mismatch from old volumes → `dev-down --clean`           |
| 5   | SEED              | 28 São Miguel places into catalog                                | Catalog migration not applied yet                               |
| 6   | REQUIRED SERVICES | bff + token-svc + catalog-svc + media-svc with `/health` probes  | Build failure → `pnpm --filter @daily-tour/<svc> run typecheck` |
| 7   | OPTIONAL SERVICES | search-svc + planner-svc + chat-hub + notif-svc                  | Missing API keys (warns, continues); uv missing (warns, skips)  |
| 8   | PWA HINT          | Prints command to run vite dev server                            | (not run automatically; foreground process)                     |

## Flags

```bash
bash scripts/dev/dev-up.sh --skip-pwa         # backend only
bash scripts/dev/dev-up.sh --skip-optional    # skip search/planner/chat/notif
bash scripts/dev/dev-up.sh --from 4           # resume from stage N
```

## Decision tree when something fails

```
dev-up.sh fails at stage N
    │
    ├─ "missing tool"        → install + re-run
    ├─ "config mismatch"     → fix .env + re-run
    ├─ "service won't start" → docker compose logs <svc> | tail -30
    │      ├─ lockfile drift  → pnpm install (no --frozen-lockfile) + re-run
    │      ├─ type error      → pnpm --filter @daily-tour/<svc> run typecheck
    │      └─ migration       → bash scripts/dev/dev-down.sh --clean && re-run (LAST RESORT — drops postgres data)
    └─ "health endpoint times out" → docker compose logs <svc>
```

## Smoke test (`dev-smoke.sh`)

Run after `dev-up.sh` returns 0. Exercises:

1. Asserts 28 places in catalog
2. Mints a test token via token-svc `/v1/tokens/issue`
3. Exchanges via BFF `/r/:token` (asserts JWT received)
4. GET `/v1/discover?action=eat&loc=37.74,-25.67&km=10` (asserts ≥1 group)
5. GET `/v1/places/:id/hydrated` (asserts media + actions)
6. POST `/v1/tour-plans` → polls until the plan leaves `queued` (asserts the planner consumer is wired — T-3.0.3; `ready` with steps when `ANTHROPIC_API_KEY` is set, else `rejected` with a warn)
7. Chat: sends a WS frame to chat-hub, then GET `/v1/chat/history` (asserts the message persisted + survives reload — T-4.0.1)
8. POST `/v1/telemetry/tour` (asserts 2xx — BFF can INSERT into `analytics.tour_event`, GRANT #166)

Steps 6-8 are the cross-service journeys the Plan-001 accounting retro found CI never exercised (P2): a regression here fails the smoke gate instead of surfacing mid-UAT.

If it returns 0, the full guest journey works.

## Teardown (`dev-down.sh`)

| Flag      | Behavior                                                                  |
| --------- | ------------------------------------------------------------------------- |
| (none)    | Stops containers; volumes retained (postgres + minio data persists)       |
| `--clean` | Stops containers + drops volumes (postgres + minio + rabbitmq state LOST) |
| `--hard`  | All of `--clean` + removes `node_modules`, `dist`, `.turbo` directories   |

## When to commit fixes

If `dev-up.sh` fails due to a real bug in the codebase, fix the code in a normal PR. The scripts themselves should rarely change.

If `dev-up.sh` fails due to a configuration drift (e.g., new env var added), update `.env.example` AND consider whether the script needs to check for that var in preflight.

## NOT in scope

- **Authentik realm import** — manual UI step or `ak export blueprint`. `/admin` routes return 401 until imported.
- **Traefik + ACME** — separate overlay; not needed for local dev (services bind directly to localhost ports).
- **OSRM PBF download** — overlay handles it, but first build takes minutes. Use `--skip-optional` until ready.

## Related docs

- `docs/operations/lessons-learned-plan-001.md` — patterns that informed this script
- `docs/operations/hotfix-rollback-playbook.md` — what to do when prod (not dev) breaks
- `docs/security/backup-recovery-runbook.md` — full recovery (different scope; this script is for dev only)
- `infra/README.md` — Compose architecture + secrets rotation

---

_Scripts authored during the autonomous orchestration session that shipped Plan-001. See `CHANGELOG.md` for context._
