# token-svc

Token service — issues, exchanges, and revokes reservation-scoped JWTs over the `auth_tokens` schema (guest, reservation, token_grant tables). Listens on `:8088`.

## Endpoints

| Verb   | Path                          | Purpose                                                                              |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/health`                     | Liveness probe (no auth, no rate-limit).                                             |
| POST   | `/v1/reservations/:id/token`  | Generate an opaque token + persist a `token_grant`. Returns `{token, expires_at}`.   |
| GET    | `/v1/tokens/:opaque/exchange` | Exchange the opaque token for a short-lived JWT. Returns `{jwt, exp}` or 401.        |
| DELETE | `/v1/tokens/:jti`             | Revoke a grant (idempotent: 204 on re-revoke, 404 only if the jti was never issued). |

### JWT contract (per [`docs/exploration/03-architecture.md §7`](../../docs/exploration/03-architecture.md))

Claims:

- `sub` — guest UUID
- `rid` — reservation UUID
- `gh` — guesthouse UUID
- `locale` — guest locale (en, pt-PT, …)
- `jti` — `base64url(sha256(opaque-token))` (one identifier for both lookup and revoke)
- `exp` — `min(reservation.checkout + 24h, now + 1h)` as a unix timestamp

Algorithm: **HS256** (Phase 1). T-1.6.0 may switch to RS256/ES256 + a JWKS endpoint for Authentik consistency.

### Security notes

- **Opaque tokens never land in logs** — the Fastify pino serializer replaces `/v1/tokens/<opaque>/exchange` URL segments with `[redacted]` before logging.
- **Stored token_grant rows hold `sha256(opaque)`, not the raw token.** A leaked DB doesn't grant the attacker exchange power.
- **`/v1/reservations/:id/token` is rate-limited** to 10/min per IP (issue flood mitigation).
- **`/v1/tokens/:opaque/exchange` is rate-limited** to 30/min per IP (brute-force mitigation).
- The **revoke endpoint is currently open** — the service runs on the internal `dt_internal` Docker network. Wrap in mTLS / API-key when n8n's auto-revoke flow lands (see session-handoff deferrals).

## Required env vars

| Var                           | Required | Notes                                                                                 |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `TOKEN_SVC_DATABASE_URL`      | yes      | Postgres connection string for the `token_svc` role.                                  |
| `JWT_SIGNING_KEY`             | yes      | HS256 secret, **≥32 chars**. Rotation = env-var swap + service restart. Never logged. |
| `PORT`                        | no       | Default `8088`.                                                                       |
| `HOST`                        | no       | Default `0.0.0.0`.                                                                    |
| `LOG_LEVEL`                   | no       | One of `fatal`/`error`/`warn`/`info`/`debug`/`trace`. Default `info`.                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no       | Empty → SDK no-op. Phase 5 wires the collector.                                       |

## Migration on boot

The drizzle migrator runs at service startup (`src/db/client.ts → runMigrations()`). It's idempotent (tracks state in `drizzle.__drizzle_migrations`), so re-running on every container start is safe.

In production the migrations folder ships at `/app/drizzle/migrations` inside the Docker image; in dev it resolves relative to the source file (`services/token-svc/drizzle/migrations`).

## Drizzle schema

## Drizzle schema

Schema is defined in `src/db/schema.ts`. Tables are scoped to the `auth_tokens` Postgres schema via `pgSchema("auth_tokens")` — the schema itself is created by `infra/postgres/init/01-schemas.sql`, not by this service.

## Generating a new migration

Edit `src/db/schema.ts`, then:

```bash
pnpm --filter @daily-tour/token-svc db:generate
```

This diffs the schema against the previous snapshot and writes a new SQL file to `drizzle/migrations/`. **Hand-review the generated SQL** before committing — check for destructive ops, unexpected `CREATE SCHEMA`, and FK correctness.

## Why there is no `db:push` script

`drizzle-kit push` applies schema changes directly to a database without generating a reviewable SQL file. This is banned in production and in this repo. See [`docs/exploration/04-tech-stack.md`](../../docs/exploration/04-tech-stack.md) for the migration doctrine. Production migration apply runs from T-1.0.1's service entrypoint with the hand-reviewed SQL set.

## Applying the migration locally

Migration apply happens automatically at service startup. For ad-hoc inspection:

```bash
cp .env.example dev-environment
docker compose --env-file dev-environment -f infra/compose/docker-compose.base.yml up -d postgres
sleep 10

# Run the service natively — migrations apply on first request to the boot.
TOKEN_SVC_DATABASE_URL="postgres://token_svc:change-me-please-token@localhost:27432/dailytour" \
JWT_SIGNING_KEY="test-key-do-not-use-min-32-chars-long-please" \
  pnpm --filter @daily-tour/token-svc dev
```

To apply the raw SQL manually (bypassing the migrator):

```bash
docker exec -i dt_postgres psql -U token_svc -d dailytour \
  < services/token-svc/drizzle/migrations/0000_init.sql
```

## Running the dev seed

The seed is idempotent (`ON CONFLICT DO NOTHING`) and inserts 2 guests + 2 reservations with fixed UUIDs for deterministic test references.

```bash
# Against the default dev DB (token_svc role)
pnpm --filter @daily-tour/token-svc seed

# Against a custom URL
TOKEN_SVC_DATABASE_URL="postgres://token_svc:password@host:27432/dailytour" \
  pnpm --filter @daily-tour/token-svc seed
```

## Cross-schema note

`reservation.guesthouse_id` is a bare UUID with no FK. The actual `catalog.guesthouse` rows belong to catalog-svc (T-1.1.0). The seed uses a fixed placeholder UUID (`bbb00001-0000-4000-b000-000000000001`).

## What's NOT in this service (intentional)

- **BFF token-exchange middleware + Redis JTI cache** — T-1.0.2 owns it.
- **PWA `/r/:token` route + Zustand session store** — T-1.0.3.
- **n8n auto-revoke flow on `reservation.cancelled`** — follow-up after RabbitMQ event wiring lands.
- **Authentik OIDC for owner-side reservation CRUD** — T-1.6.0; until then the issue/revoke endpoints are open inside the `dt_internal` network.
- **Refresh cookie issuance** — the BFF (T-1.0.2) sets the `dt_refresh` HttpOnly cookie; this service just returns the JWT.
- **Compose overlay** — likely added in T-1.0.2 alongside Redis wiring (so BFF can reach token-svc via `dt_internal`).
