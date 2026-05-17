# @daily-tour/bff

Fastify v5 BFF (Backend-For-Frontend) for the Daily Tour PWA. Single ingress for browser traffic: aggregates calls to downstream services, terminates auth, and will own the WebSocket multiplex in T-4.1.0.

**Current scope (T-0.4.2 + T-1.0.2 + T-1.2.0)** — `/health` probe, the reservation-token exchange flow, and the action-grid discover aggregator. Place detail and chat land in T-1.3.x+.

## Auth flow (T-1.0.2)

The BFF is the **verify** side of the JWT contract; [`token-svc`](../token-svc/) signs. The HS256 `JWT_SIGNING_KEY` env var MUST match across both services.

| Endpoint              | Auth     | Purpose                                                                                                       |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /health`         | public   | Liveness probe; never rate-limited                                                                            |
| `GET /r/:token`       | public   | First-load: opaque token → JWT (calls `token-svc /exchange`) + sets `dt_refresh` HttpOnly cookie              |
| `GET /v1/discover`    | required | Action-grid aggregator: places grouped by wish, geo-filtered, top 30 (T-1.2.0)                                |
| `*` (everything else) | required | Global `onRoute` hook attaches `fastify.authenticate` unless route opts out with `config: { auth: 'public' }` |

**Secure by default** — new feature routes get authenticated automatically. Only `/health` and `/r/:token` opt out. The authenticate handler verifies the JWT signature (via `@fastify/jwt`) and then checks `payload.jti` against the Redis revocation cache; revoked tokens fail within ~1 min of the revocation event.

### Required env vars

| Var                           | Required | Notes                                                                                                 |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `JWT_SIGNING_KEY`             | yes      | HS256 secret, **≥32 chars**. **Must match `token-svc`**. Rotate both simultaneously.                  |
| `TOKEN_SVC_URL`               | no       | Default `http://dt_token_svc:8088` (the compose-internal hostname).                                   |
| `CATALOG_SVC_URL`             | no       | Default `http://dt_catalog_svc:8081`. Called by `/v1/discover` (catalog-client.ts).                   |
| `REDIS_URL`                   | no       | Default `redis://dt_redis:6379/0`. Reads `jti:revoked:<jti>` keys; writes `jti:active:<jti>` markers. |
| `PORT`                        | no       | Default `8080`.                                                                                       |
| `LOG_LEVEL`                   | no       | One of `fatal`/`error`/`warn`/`info`/`debug`/`trace`. Default `info`.                                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no       | Empty → OTel SDK no-op. Phase 5 wires the collector.                                                  |

## Discover aggregator (T-1.2.0)

`GET /v1/discover?action=<slug>&loc=<lat,lng>&km=<n>` is the first real authed feature route. It aggregates catalog-svc data for the PWA's Home screen action grid.

**Design decision**: catalog-svc exposes `GET /v1/places-by-action?action_slug=<slug>` (added in T-1.2.0). The BFF calls this endpoint, which JOINs `place_action_wish` + `action` + `wish` tables and returns places with their wish slugs for the given action. This avoids a slug→UUID map in the BFF and a separate round-trip to look up wish slugs.

**Response shape**:

```json
{
  "action": "eat",
  "count": 5,
  "groups": [
    { "wish": "sea-view",    "places": [{ "id": "...", "name": {...}, "description": {...}, "hero_image_url": null, "distance_km": 1.2, "wishes": ["sea-view", "traditional"] }] },
    { "wish": "traditional", "places": [...] }
  ]
}
```

- `count`: unique places in the result (before wish-grouping); capped at 30.
- `groups`: one entry per wish slug that appears in the result set. A place with two wishes appears in two groups.
- `hero_image_url`: `null` in v1 — signed media URLs land in T-1.4.x.
- `distance_km`: only present when `loc` is provided. Haversine distance from the query lat/lng.
- **Geo filter**: if `loc=<lat>,<lng>&km=<n>` is provided, only places within `km` km (haversine) are returned. Default `km=20`. Omitting `loc` returns all published places for the action.
- **Sorting**: `is_hosts_pick` desc, then distance asc (or catalog-svc insertion order when no loc).

**catalog-client.ts** (`src/lib/catalog-client.ts`): typed HTTP client mirroring `token-svc-client.ts`. Exports `CatalogError` and `fetchPlacesByAction(actionSlug)`. Uses platform `fetch` (Node 22 built-in).

### Security notes

- **Opaque tokens never land in logs** — `app.ts`'s pino serializer replaces `/r/<opaque>` URL segments with `/r/[redacted]`.
- **`dt_refresh` cookie**: HttpOnly, SameSite=Lax, Secure in production (set when `NODE_ENV === 'production'`). Value is the opaque token itself; consumed by a future refresh handler when the JWT expires (out of scope for T-1.0.2).
- **Rate-limit on `/r/:token`**: 30/min per IP (brute-force mitigation).
- **Graceful degrade**: token-svc 401/404 → `302 /?reason=expired` (no PII leak per FR-AC-05).

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

| Task    | Adds                                                                                    |
| ------- | --------------------------------------------------------------------------------------- |
| T-0.4.3 | Compose overlay (`infra/compose/bff.yml`) wiring the BFF into `dt_internal`             |
| T-1.0.2 | Real auth: opaque token → JWT exchange via token-svc, Redis JTI cache, asymmetric key   |
| T-1.2.0 | ✅ `GET /v1/discover` — action-grid aggregator (catalog-client, geo-filter, wish-group) |
| T-1.3.0 | `GET /v1/places/:id` → search-svc / catalog-svc aggregate                               |
| T-3.0.3 | `POST /v1/plan` → planner-svc proxy                                                     |
| T-4.1.0 | `WS /v1/chat` multiplexed chat-hub                                                      |
