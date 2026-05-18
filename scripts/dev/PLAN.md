# Dev Bring-up Plan

> Idempotent smoke approach. Run `temp/dev-up.sh` → fix what breaks → re-run. Earlier stages are no-ops once they pass.

## Strategy

Don't manually progress through stages. Instead:

1. **One script (`temp/dev-up.sh`)** brings up everything in dependency order. Each stage prints PASS/FAIL with the exact command that failed.
2. **Idempotency**: re-running after a fix skips already-up stages (uses `docker compose ps` + `pg_isready`-style probes).
3. **Smoke (`temp/dev-smoke.sh`)**: separate script that exercises a real guest journey (mint → exchange → discover). Runs only after `dev-up.sh` returns 0.
4. **Teardown (`temp/dev-down.sh`)**: clean reset when needed (drops volumes, kills containers).

## Stages in `dev-up.sh`

1. **PREFLIGHT** — Node 22 via nvm? pnpm 9? Docker daemon? `.env` exists + has required keys? Stop with explicit instructions on any missing piece.
2. **INSTALL** — `pnpm install --frozen-lockfile`. Skip if `node_modules/.pnpm` newer than `pnpm-lock.yaml`.
3. **INFRA** — `docker compose -f infra/compose/docker-compose.base.yml up -d`. Wait for postgres `pg_isready`, redis `PING`, rabbitmq `rabbitmqctl status`, minio `mc alias set` probe.
4. **MIGRATIONS** — `pnpm --filter @daily-tour/catalog-svc run migrate`, then token-svc, then media-svc. Each is idempotent (drizzle tracks applied migrations).
5. **SEED** — `pnpm --filter @daily-tour/catalog-svc run seed` (28 places). Idempotent.
6. **SERVICES** — `docker compose -f base.yml -f app.yml up -d --build bff token-svc catalog-svc media-svc`. Wait for `/health` 200 on each.
7. **OPTIONAL SERVICES** — search-svc, planner-svc, chat-hub, notif-svc. Print warning if their API keys missing (ANTHROPIC, OPENAI) — bring them up anyway, but mark them with degraded status.
8. **PWA** — bring up via `pnpm --filter @daily-tour/pwa dev &` in background OR `docker compose ... pwa-static`. Print the URL.

After all stages pass, run `temp/dev-smoke.sh` for the guest-journey check.

## Failure modes I expect to surface

Ordered by probability:

| Likely-issue | Stage | Fix |
|---|---|---|
| `.env` missing or `JWT_SIGNING_KEY` too short | 1 | Copy `.env.example` to `.env`, edit |
| `docker compose ports already in use` | 3 | Adjust `DT_HOST_PORT_*` in `.env` |
| `pg_isready` times out (postgres init slow) | 3 | Increase timeout, document |
| Migration order wrong / missing service init | 4 | Document correct order |
| OSRM PBF download hangs | 6/7 | Document → skip OSRM for first bring-up |
| `ANTHROPIC_API_KEY` empty → planner-svc crashes | 7 | Skip planner-svc if key missing |
| `@types/pg` / `@fastify/websocket` lockfile drift | 2 | `pnpm install` (without `--frozen-lockfile`) |
| Build failures from agent-introduced lint/type issues | 6/7 | `pnpm --filter X run typecheck` for diagnosis |
| Authentik realm not imported → owner routes 401 | 7 | Documented as expected; skip /admin smoke for v1 |
| PWA dev server port collision with Vite default 5173 | 8 | `--port` flag override |

## Decision tree when something fails

```
dev-up.sh fails at stage N
    │
    ├─ If "missing tool" → install + re-run
    ├─ If "config mismatch" → fix .env + re-run
    ├─ If "service won't start" → check logs via `docker compose logs <svc> | tail -30`
    │    └─ If "lockfile drift" → `pnpm install` (no --frozen-lockfile) + re-run
    │    └─ If "type error in build" → `pnpm --filter @daily-tour/<svc> run typecheck`, fix, re-run
    │    └─ If "migration mismatch" → drop volumes + re-run (last resort)
    └─ If "health endpoint times out" → service log inspection
```

## After dev-up passes

Run `temp/dev-smoke.sh` — exercises:
1. Mint a test token via token-svc CLI
2. Exchange via BFF `/r/:token` (asserts 200 + Set-Cookie)
3. GET `/v1/discover?action=eat` (asserts ≥1 wish group)
4. GET `/v1/places/:id/hydrated` (asserts media + actions)
5. POST `/v1/tour-plans` (skip if ANTHROPIC_API_KEY missing)

Each step prints PASS/FAIL. Failures point at the specific contract violated.

## Reset

`temp/dev-down.sh` — `docker compose down -v` (drops volumes), removes `dist/` + `node_modules/.cache`, leaves git working tree alone.

## Why this is better than manual progressive

- **Reproducible** — script captures the order; humans forget
- **Diagnosable** — every failure prints the exact reproduction command
- **Re-runnable** — fix-and-re-run loop is the fast path
- **Self-documenting** — the script IS the bring-up doc

## When to consider committing

Once `dev-up.sh` returns 0 cleanly on a fresh clone, consider promoting `temp/` files to `scripts/` + commit. Until then they live local-only.
