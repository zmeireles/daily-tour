# token-svc

Token service — owns the `auth_tokens` schema (guest, reservation, token_grant tables).

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

## Applying the migration locally (dev only)

Migration apply is deferred to T-1.0.1. For manual verification:

```bash
# Bring up postgres
cp .env.example dev-environment
docker compose --env-file dev-environment -f infra/compose/docker-compose.base.yml up -d postgres
sleep 10

# Apply the SQL as token_svc
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
