# catalog-svc

Drizzle schema for the `catalog` schema (actions, wishes, guesthouses, owner profiles, places, media, candidates). HTTP endpoints land in T-1.1.1.

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
