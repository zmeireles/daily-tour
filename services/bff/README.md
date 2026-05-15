# @daily-tour/bff

Fastify v5 BFF (Backend-For-Frontend) for the Daily Tour PWA. Single ingress for browser traffic: aggregates calls to downstream services, terminates auth (token-svc handles the real exchange — see T-1.0.2), and will own the WebSocket multiplex in T-4.1.0.

**Skeleton scope (T-0.4.2)** — `/health` is the only route. No business logic, no downstream-service clients yet. Phase 1 tasks own real endpoints.

## Stack

- Node 22.22.3 LTS, ESM-native
- [Fastify `^5.8.5`](https://fastify.dev) — CVE floor per [`docs/exploration/04-tech-stack.md §4`](../../docs/exploration/04-tech-stack.md) (fixes CVE-2026-33806, -3419, -3635)
- Plugins: `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/jwt`
- Validation: `zod` (consistent with `@daily-tour/shared-types`)
- Tracing: `@daily-tour/shared-otel` — `initOtel({ serviceName: "bff" })` runs as the first import
- Build: `tsup` → `dist/index.js` (ESM, target node22)
- Test: `vitest` (`fastify.inject()` smoke)

## Commands

```bash
# Dev (watch mode — needs shared-types/shared-otel built once first)
pnpm --filter @daily-tour/shared-types build
pnpm --filter @daily-tour/shared-otel build
pnpm --filter @daily-tour/bff dev

# Verify it's up
curl -s http://localhost:8080/health
# → {"status":"ok","service":"bff","version":"0.0.0"}

# Test
pnpm --filter @daily-tour/bff test

# Typecheck + lint
pnpm --filter @daily-tour/bff typecheck
pnpm --filter @daily-tour/bff lint

# Production build
pnpm --filter @daily-tour/bff build
pnpm --filter @daily-tour/bff start
```

## Docker

Multi-stage Alpine build. Build context is the **repo root** (the Dockerfile needs `pnpm-workspace.yaml` and the sibling packages to bundle workspace deps).

**Current image size: ~216 MB** — slightly over the 200 MB target the task spec asked for. The OTel auto-instrumentation stack (`@opentelemetry/auto-instrumentations-node` + transitive `@grpc/grpc-js`, `protobufjs`, `web-streams-polyfill`) accounts for ~80 MB of `node_modules` that **cannot be bundled into `dist/`** — OTel's `require-in-the-middle` machinery does dynamic `require()` lookups that a static ESM bundler can't preserve. Three trade-offs were considered:

| Option                                                       | Size   | OTel works                          | Decision                                                                            |
| ------------------------------------------------------------ | ------ | ----------------------------------- | ----------------------------------------------------------------------------------- |
| Bundle everything (`noExternal: [/.*/]`)                     | 180 MB | ❌ runtime crash on dynamic require | rejected                                                                            |
| Bundle most, keep OTel external + strip non-OTel deps        | 206 MB | ✅ (minified, no source maps)       | rejected — minified bundle still crashed on bundled internals doing dynamic require |
| Keep fastify + OTel + zod external, bundle only shared-types | 216 MB | ✅                                  | **chosen** — known-good pattern, debuggable, source maps preserved                  |

Phase 1 work that adds real services can revisit: removing unused OTel exporters from shared-otel (we don't use gRPC; ~10 MB win), or switching the base to `gcr.io/distroless/nodejs22-debian12` (~60 MB win, but loses shell access).

```bash
# From the repository root:
docker build -f services/bff/Dockerfile -t daily-tour/bff:dev .
docker images daily-tour/bff:dev --format "{{.Size}}"

# Run (maps container :8080 → host :8081 to avoid clashing with `pnpm dev`)
docker run -d --rm --name bff_smoke -p 127.0.0.1:8081:8080 daily-tour/bff:dev
curl -s http://127.0.0.1:8081/health
docker stop bff_smoke
```

> **`.dockerignore` note**: BuildKit reads `Dockerfile.dockerignore` next to the referenced Dockerfile when the build context is elsewhere — so the file that actually filters the repo-root context is `services/bff/Dockerfile.dockerignore`. A `services/bff/.dockerignore` is also committed as a fallback for context-from-here invocations.

## Env vars

| Var                           | Default                 | Notes                                                                                                                                    |
| ----------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                        | `8080`                  | HTTP listener port                                                                                                                       |
| `HOST`                        | `0.0.0.0`               | Listener host                                                                                                                            |
| `NODE_ENV`                    | `development`           | `test` disables OTel traces (shared-otel contract)                                                                                       |
| `JWT_PUBLIC_KEY`              | _(unset)_               | T-1.0.2 wires the real key from token-svc. While unset, the auth plugin falls back to an HS256 dev secret and logs a warning at startup. |
| `LOG_LEVEL`                   | `info`                  | pino log level                                                                                                                           |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP collector — see shared-otel README                                                                                                  |

## Architecture notes

- **OTel boot order**: `src/instrumentation.ts` is the first import in `src/index.ts`. Any module that needs to be instrumented (Fastify, HTTP clients) is loaded after `initOtel()` returns.
- **Auth is a stub**: `src/plugins/auth.ts` registers `@fastify/jwt` and exposes `fastify.authenticate` as a decorator, so future routes can wire `{ preHandler: fastify.authenticate }` without rework. **T-1.0.2 replaces the dev secret + simple verify with token-svc's opaque-→-JWT exchange + Redis JTI cache + asymmetric key.**
- **No DB client**: the BFF is an aggregator only. Drizzle ORM / pg / ioredis / amqplib are installed in the services that actually own those resources (token-svc, catalog-svc, etc.).
- **CORS in dev**: `origin: true` echoes the request origin. The real allowlist is configured in Phase 5 once the PWA's public hostname is set.
- **Rate limit on `/health`**: explicitly disabled (`config: { rateLimit: false }`) so probes from Docker/Kubernetes/Traefik are never throttled.

## What lands here next

| Task    | Adds                                                                                  |
| ------- | ------------------------------------------------------------------------------------- |
| T-0.4.3 | Compose overlay (`infra/compose/bff.yml`) wiring the BFF into `dt_internal`           |
| T-1.0.2 | Real auth: opaque token → JWT exchange via token-svc, Redis JTI cache, asymmetric key |
| T-1.2.0 | `GET /v1/discover` → catalog-svc client                                               |
| T-1.3.0 | `GET /v1/places/:id` → search-svc / catalog-svc aggregate                             |
| T-3.0.3 | `POST /v1/plan` → planner-svc proxy                                                   |
| T-4.1.0 | `WS /v1/chat` multiplexed chat-hub                                                    |
