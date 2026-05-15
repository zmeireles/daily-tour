# `infra/` — operator runbook

Docker Compose definitions for the Daily Tour platform. Per-environment overlays compose on top of the base stack.

| File | Purpose |
|------|---------|
| [`compose/docker-compose.base.yml`](./compose/docker-compose.base.yml) | Postgres 17 + pgvector · Redis 7 · RabbitMQ 4.3 · MinIO · MinIO bucket bootstrap |
| `compose/docker-compose.traefik.yml` | Traefik v3 + ACME (lands in T-0.3.1) |
| `compose/docker-compose.authentik.yml` | Authentik 2026.2.2+ behind Traefik forward-auth (T-0.3.2) |
| `compose/docker-compose.n8n.yml` | n8n LTS behind Authentik (T-0.3.3) |
| `compose/docker-compose.app.yml` | bff + pwa-static (T-0.4.3) |
| `postgres/` | Dockerfile + init SQL (extensions, schemas, roles) |
| `rabbitmq/` | Server config + declarative exchanges/queues |
| `redis/` | Server config (password passed via Compose argv) |
| `minio/` | Bucket bootstrap script |

## Quick start

**Base stack only** (Postgres, Redis, RabbitMQ, MinIO):

```bash
cp .env.example .env       # then edit
docker compose -f infra/compose/docker-compose.base.yml up -d
docker compose -f infra/compose/docker-compose.base.yml ps
```

**Base + Traefik** (adds reverse proxy + dashboard):

```bash
cp .env.example dev-environment  # then edit
docker compose --env-file dev-environment \
  -f infra/compose/docker-compose.base.yml \
  -f infra/compose/docker-compose.traefik.yml \
  up -d
```

> **Local hostname resolution**: To reach `traefik.localhost` from your browser or curl, add `127.0.0.1 traefik.localhost` to `/etc/hosts`.

All five services + Traefik should report `healthy` within ~60 seconds.

## Healthcheck verification

```bash
# Postgres
docker compose -f infra/compose/docker-compose.base.yml exec -T postgres \
  pg_isready -U postgres -d dailytour

# Redis
docker compose -f infra/compose/docker-compose.base.yml exec -T redis \
  redis-cli -a "$REDIS_PASSWORD" ping
# → PONG

# RabbitMQ — exchanges + queues loaded from definitions.json
curl -s -u dailytour:"$RABBITMQ_PASSWORD" http://localhost:15672/api/exchanges/%2F | jq -r '.[].name'
# → ... dt.dlx, dt.events, ...

# MinIO — buckets created
curl -s http://localhost:9000/minio/health/live
docker compose -f infra/compose/docker-compose.base.yml run --rm minio-init mc ls dailytour/
# → media-owner, media-place, media-tour
```

## What each service does

- **Postgres** — single cluster, single logical DB `dailytour`, nine schemas (one per service plus `audit`). pgvector + pg_trgm + unaccent + pgcrypto extensions enabled. Each service has its own DB role with least-privilege grants on its own schema.
- **Redis** — session cache, JTI revocation, future WS pub/sub fan-out. AOF persistence on (everysec), 256 MB ceiling, allkeys-lru eviction.
- **RabbitMQ** — `dt.events` topic exchange with day-1 queues (`place.*`, `tour.*`, `message.*`, `notification.*`, `reservation.*`). `dt.dlx` dead-letter exchange. Definitions loaded declaratively from `rabbitmq/definitions.json`.
- **MinIO** — object storage for media. Three buckets seeded by `minio-init` one-shot service: `media-place`, `media-owner`, `media-tour`. The `public/` prefix is anonymously readable so the PWA can pull place hero images without signed URLs.
- **Traefik** — reverse proxy and TLS terminator (v3.2). Routes incoming HTTP/HTTPS traffic to application services by hostname (e.g. `app.localhost`) using Docker label discovery (`traefik.enable=true`). ACME staging issuer handles certificate provisioning in dev/QA; the live issuer activates in Phase 5 with a real public domain. The dashboard (`:8080`) is protected by basic-auth and is **dev/QA only — never expose it in production**. Future services opt in by adding `traefik.http.*` labels; existing base-stack services (Postgres, Redis, RabbitMQ, MinIO) stay internal-only.
- **Authentik** — OIDC identity provider for the owner backoffice. Has its own dedicated Postgres container (`dt_authentik_postgres`) for clean separation from the project's main cluster. Server + worker containers share the same image (`ghcr.io/goauthentik/server:2026.2.2`). Reachable via Traefik at `http://auth.localhost`. The `authentik-forward-auth@file` middleware is **defined-but-commented** in Traefik's dynamic config — it activates when T-0.3.4 or T-1.6.x creates the required Proxy Provider binding on the embedded outpost (the bare server returns 404 on `/outpost.goauthentik.io/auth/traefik` until that binding exists).
- **n8n** — workflow automation. Owns the ingest scheduling, owner-approval reminders, daily digests, and low-code integrations described in [`03-architecture.md §2`](../docs/exploration/03-architecture.md). Pinned to LTS line `>=1.123.26` per the CVE floor in [`04-tech-stack.md §6`](../docs/exploration/04-tech-stack.md). Runs SQLite-backed in dev/QA (single container, no separate DB). Reachable via Traefik at `http://n8n.localhost`. **Auth via n8n's built-in User Management** — first boot serves the owner-setup wizard at `http://n8n.localhost/setup` where the first user becomes the instance owner (`N8N_BASIC_AUTH_*` env vars were removed upstream in v0.184 and are silently ignored). Authentik forward-auth integration lands in a follow-up task once the Authentik Proxy Provider is wired to the embedded outpost. Never expose n8n's UI to the public internet — even with Authentik, keep host bindings on `127.0.0.1`.

## Ports (host bindings, all on 127.0.0.1)

| Service | Container | Host | Notes |
|---------|-----------|------|-------|
| Traefik HTTP | 80 | 127.0.0.1:80 | redirects to HTTPS |
| Traefik HTTPS | 443 | 127.0.0.1:443 | TLS termination |
| Traefik Dashboard | 8080 | 127.0.0.1:8080 | dev/QA only; basic-auth protected |
| Postgres | 5432 | 127.0.0.1:5432 | dev access |
| Redis | 6379 | 127.0.0.1:6379 | requires password |
| RabbitMQ AMQP | 5672 | 127.0.0.1:5672 | clients |
| RabbitMQ Management | 15672 | 127.0.0.1:15672 | admin UI |
| MinIO S3 API | 9000 | 127.0.0.1:9000 | service-to-service |
| MinIO Console | 9001 | 127.0.0.1:9001 | admin UI |
| Authentik | 9000 (internal) | — | No host bind; Traefik routes `http://auth.localhost` → `authentik-server:9000` |
| authentik-postgres | 5432 (internal) | — | No host bind; internal to `dt_internal` network only |
| n8n | 5678 (internal) | — | No host bind; Traefik routes `http://n8n.localhost` → `dt_n8n:5678` |

All bound to `127.0.0.1` deliberately — dev exposes nothing on `0.0.0.0`. Production reaches these through Traefik (T-0.3.1) with auth.

## Authentik on first boot

**Add to `/etc/hosts`** (needed for browser and curl to resolve local service hostnames):

```
127.0.0.1 auth.localhost n8n.localhost app.localhost api.localhost traefik.localhost
```

**Bring up the full stack**:

```bash
cp .env.example dev-environment  # fill in secrets
docker compose --env-file dev-environment \
  -f infra/compose/docker-compose.base.yml \
  -f infra/compose/docker-compose.traefik.yml \
  -f infra/compose/docker-compose.authentik.yml \
  -f infra/compose/docker-compose.n8n.yml \
  up -d
```

**Wait ≥3 min** for Authentik to migrate its DB on first boot and n8n to initialize:

```bash
docker compose --env-file dev-environment -f ... ps  # wait until all 9 services healthy
```

**Verify health**:

```bash
curl -sH "Host: auth.localhost" -o /dev/null -w "%{http_code}\n" http://127.0.0.1:80/-/health/live/
# → 200
```

**Open the UI**: `http://auth.localhost` → login with `akadmin` / `$AUTHENTIK_BOOTSTRAP_PASSWORD`.

### OIDC provider (owner-app) — manual setup until T-1.6.0

T-0.3.2 originally shipped a blueprint to auto-create the `owner-app` OIDC provider on first boot, but the blueprint apply failed opaquely on Authentik 2026.2.2 (no error column on `authentik_blueprints_blueprintinstance`, no traceback in the worker logs — only a `status='error'` flag). Rather than spend more cycles debugging the YAML against a moving Authentik schema, **T-1.6.0** (BFF + Authentik JWKS integration) owns OIDC provider creation via the Authentik API at the moment it's actually needed.

Until then, to bring up the provider manually:

1. Log in to `http://auth.localhost` as `akadmin`.
2. **Applications → Providers → Create → OAuth2/OpenID Provider**:
   - Name: `owner-app`
   - Client type: `Confidential`
   - Client ID: `daily-tour-bff`
   - Client secret: paste from `AUTHENTIK_OWNER_APP_CLIENT_SECRET` in `.env`.
   - Authorization flow: `default-provider-authorization-implicit-consent`
   - Signing key: `authentik Self-signed Certificate`
   - Redirect URIs (strict): `http://localhost:8080/callback`, `http://localhost:5173/auth/callback`, `https://app.localhost/auth/callback`.
   - Scope mappings: openid, email, profile.
3. **Applications → Applications → Create**: name `Owner Backoffice`, slug `owner-app`, provider `owner-app`.
4. **Directory → Groups → Create**: `owners`. Add `akadmin` as a member.

### Forward-auth (currently 404)

The Authentik embedded outpost at `/outpost.goauthentik.io/auth/traefik` returns 404 until a **Proxy Provider** is bound to it. T-0.3.4 or T-1.6.x own that wiring + uncommenting the `authentik-forward-auth` middleware block in `traefik/dynamic/middlewares.yml`.

**n8n (T-0.3.3)** ships with built-in basic auth instead of Authentik forward-auth. The integration is deferred to the same follow-up task that creates the Authentik Proxy Provider + binds it to the embedded outpost.

## Nuke + reseed (DATA LOSS)

```bash
docker compose -f infra/compose/docker-compose.base.yml down -v
docker compose -f infra/compose/docker-compose.base.yml up -d
```

Postgres init scripts (`postgres/init/*.sql`) only run on first boot of an empty `dt_postgres_data` volume — `down -v` wipes the volume, the next `up` re-runs them. MinIO bucket creation is idempotent and runs on every `up`.

## Restore from `pg_dump`

```bash
docker compose -f infra/compose/docker-compose.base.yml exec -T postgres \
  psql -U postgres -d dailytour < dump.sql
```

## Secret rotation procedure

The `change-me-please-*` literals in `.env.example` match placeholder passwords in `postgres/init/02-roles.sql`. To rotate (always before any non-local deploy):

1. Generate new secrets (`openssl rand -base64 24` works).
2. Update `.env` with the new values.
3. For Postgres service roles, run `ALTER ROLE <svc> WITH PASSWORD '<new>';` against the live DB. Don't edit `02-roles.sql` — that file only runs on first boot.
4. Restart dependent services so they reconnect with new credentials.

Phase 5 (T-5.4.x observability + sizing) introduces a secrets-manager bootstrap — `.env` becomes a fallback rather than the source of truth.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Traefik dashboard `401` | `TRAEFIK_DASHBOARD_PASSWORD` doesn't match the bcrypt in `dashboard-users` | Regenerate: `htpasswd -nbB admin "<new>"` → update `infra/traefik/dashboard-users` and `.env`. |
| Traefik ACME certificate denied | Let's Encrypt staging rate limit hit, or challenge not reachable | Wait for rate-limit window, or switch to a real public domain + the live ACME server in Phase 5. |
| Service not routable through Traefik | Missing opt-in label on target container | Add `traefik.enable=true` and `traefik.http.routers.<name>.rule=Host(...)` labels to the service. |
| Postgres healthcheck fails | First-boot init scripts erroring (check `docker logs dt_postgres`) | Most often a syntax issue in `02-roles.sql`. `down -v` to wipe and retry. |
| `definitions didn't load` (RabbitMQ) | Missing volume mount or invalid JSON | `curl -u dailytour:$RABBITMQ_PASSWORD http://localhost:15672/api/overview` to inspect; `docker logs dt_rabbitmq` to see load errors. |
| MinIO bucket-init fails after a clean install | Container reached `up` before MinIO was healthy | The `depends_on: condition: service_healthy` guard should prevent this. If it slips, re-run `docker compose up minio-init`. |
| pt_PT.UTF-8 collation missing | `locale-gen` failed in postgres Dockerfile build | Set `LANG=en_US.UTF-8` in `.env` and accept the slightly weaker sort for now. Re-attempt the build with `--no-cache` if you have apt-get connectivity. |
| Containers fight for the same port | Another stack on the host bound 5432/6379/etc | Edit the `ports:` entries in `docker-compose.base.yml` (use `:5432` instead of `:5432:5432` to disable host exposure, or pick a different host port). |
| n8n first-time access | First boot serves the owner-setup wizard at `/setup` | Open `http://n8n.localhost/setup`, create the owner account. The first user becomes the instance admin and unlocks the UI. `N8N_BASIC_AUTH_*` env vars are silently ignored (removed upstream in v0.184). |
| n8n owner password lost | n8n stores users in its SQLite DB | Wipe the volume to start over: `docker compose down -v && docker compose up -d`; then re-do the setup wizard. |
| n8n cannot save credentials | `N8N_ENCRYPTION_KEY` changed between runs | Restore the same key in `dev-environment`, or wipe the volume: `docker compose down -v` + `up -d`. |
| n8n workflow state lost after restart | Volume `dt_n8n_data` was removed | Workflow state persists via named volume `/home/node/.n8n`. Ensure you use `down` not `down -v`. Backups are operator's responsibility (Phase 5 adds automated backup). |

## See also

- [`docs/exploration/03-architecture.md`](../docs/exploration/03-architecture.md) — service decomposition + RabbitMQ exchange design rationale
- [`docs/REQUIREMENTS.md §6-§7`](../docs/REQUIREMENTS.md#6-architecture-summary) — locked stack picks + version pins
- [`docs/exploration/04-tech-stack.md §6`](../docs/exploration/04-tech-stack.md) — the MinIO upstream-archived risk note that motivated the pinned RELEASE tag
- [`docs/operations/auto-merge-doctrine.md`](../docs/operations/auto-merge-doctrine.md) — what the orchestrator may auto-merge
