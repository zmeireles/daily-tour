# catalog-svc

Fastify v5.8.5 catalog CRUD service. Owns the `catalog` schema (actions, wishes, guesthouses, owner profiles, places, media, candidates). REST endpoints under `/v1` for places, guesthouses, and owner-profiles. Internal-only — the BFF aggregates on top.

Listens on `:8081`.

## Endpoints

| Verb   | Path                           | Purpose                                                                                         |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| GET    | `/health`                      | Liveness probe (no rate-limit).                                                                 |
| GET    | `/v1/places`                   | List with cursor pagination + filters (`?status`, `?guesthouse_scope_id`, `?include_archived`). |
| GET    | `/v1/places/:id`               | Get by id; 404 if archived unless `?include_archived=true`.                                     |
| POST   | `/v1/places`                   | Create. Validates body against zod; 409 on dup-key.                                             |
| PATCH  | `/v1/places/:id`               | Partial update; 404 if archived.                                                                |
| DELETE | `/v1/places/:id`               | **Soft-delete** (`status='archived'`). Idempotent: 204 even if already archived.                |
| GET    | `/v1/guesthouses`              | List with cursor + `?slug=` filter.                                                             |
| GET    | `/v1/guesthouses/:id`          | Get by id.                                                                                      |
| POST   | `/v1/guesthouses`              | Create. 409 on dup slug.                                                                        |
| PATCH  | `/v1/guesthouses/:id`          | Partial update.                                                                                 |
| DELETE | `/v1/guesthouses/:id`          | **Hard delete** (no status column on this table; Phase 1 trade-off). Idempotent.                |
| GET    | `/v1/owner-profiles/:owner_id` | Get by owner id (PK).                                                                           |
| POST   | `/v1/owner-profiles`           | **Upsert** by owner_id PK: 201 on insert, 200 on update.                                        |
| PATCH  | `/v1/owner-profiles/:owner_id` | Partial update.                                                                                 |
| DELETE | `/v1/owner-profiles/:owner_id` | Hard delete. Idempotent.                                                                        |

### Pagination

`?cursor=<base64>` — opaque to clients. Encodes `(updated_at, id)` so the cursor is stable across rows with identical `updated_at`. `?limit=50` default, `?limit=200` max.

### Auth

**Open at this layer.** catalog-svc trusts its caller (the BFF is the perimeter; `dt_internal` network is isolated). T-1.4.x (owner backoffice slice) + T-1.6.0 (Authentik OIDC) wrap the **write** endpoints with auth; reads stay open since the BFF's auth decorator (T-1.0.2) already gates the public surface.

### Required env vars

| Var                           | Required | Notes                                                                 |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `CATALOG_SVC_DATABASE_URL`    | yes      | Postgres connection string for the `catalog_svc` role.                |
| `PORT`                        | no       | Default `8081`.                                                       |
| `HOST`                        | no       | Default `0.0.0.0`.                                                    |
| `LOG_LEVEL`                   | no       | One of `fatal`/`error`/`warn`/`info`/`debug`/`trace`. Default `info`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no       | Empty → OTel SDK no-op. Phase 5 wires the collector.                  |

### Migration on boot

The custom migrator runs at startup (`src/db/client.ts → runMigrations()`). Idempotent: tracks state in `catalog.__drizzle_migrations` (TABLE-level perm in the owned schema; drizzle-orm's bundled migrator was replaced because it required DB-level CREATE — see token-svc's README for the full rationale).

## Schema

## Schema

8 tables in `pgSchema("catalog")`:

| Table               | Purpose                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `action`            | Top-level discovery intent (Eat, Drink, See, Do, Buy, Move)         |
| `wish`              | Refinement tags per action (unique within action; max 6 per action) |
| `guesthouse`        | Physical property — name, slug, geom, owner reference               |
| `owner_profile`     | Owner bio, contact prefs, DM channels                               |
| `place`             | Curated point of interest with i18n content                         |
| `place_action_wish` | M:N link: places tagged with action+wish pairs                      |
| `place_media`       | Ordered media assets (image/video) per place                        |
| `place_candidate`   | Unreviewed ingest candidates (Google Places, OSM, manual)           |

### Design decisions

**Geometry (lat/lng)**: Two `double precision` columns per table. PostGIS not required — haversine SQL expression handles proximity filtering in T-1.2.0. Revisit for Phase 3+ (OSRM routing) if query complexity demands it.

**`place_action_wish` primary key**: Composite `(place_id, action_id, wish_id)` with `wish_id NOT NULL`. Business rule: every place-action tag must carry at least one wish. Avoids a serial surrogate key that adds no query benefit.

**`wish.slug` uniqueness**: Per-action unique (composite constraint on `action_id, slug`), not global. The same concept (e.g., "sea view") legitimately appears under both Eat and Drink with the same slug.

**`owner_profile.photo`**: UUID referencing a `media` schema asset — not a URL. The media-svc owns bucket/URL resolution.

**`place_candidate.status`**: Follows `PlaceCandidateSchema` in `packages/shared-types`: `new | reviewed | approved | rejected` (4 values).

## Generating migrations

```bash
# From repo root
pnpm --filter @daily-tour/catalog-svc db:generate
# Then strip the first CREATE SCHEMA "catalog"; line + statement-breakpoint
# Rename the generated file to 0000_init.sql (or next sequential name)
```

> Drizzle-kit always emits `CREATE SCHEMA IF NOT EXISTS "catalog"` for `pgSchema()` targets. Strip it — the schema is created by `infra/postgres/init/01-schemas.sql`.

## Applying migrations

Migrations apply automatically via `runMigrations()` in `src/db/client.ts` at startup (T-1.1.1 calls this on boot). For a manual apply:

```bash
docker exec -i dt_postgres psql -U catalog_svc -d dailytour \
  < services/catalog-svc/drizzle/migrations/0000_init.sql
```

## Seed

```bash
# From repo root
pnpm --filter @daily-tour/catalog-svc seed
```

Inserts 6 actions and 36 wishes (6 per action) from `docs/exploration/05-tourism-domain.md §3`. Re-runs are idempotent — `onConflictDoNothing()` on fixed UUIDs.

The raw SQL form (`seeds/actions-wishes.sql`) is regenerated when `seeds/dev.ts` changes.
