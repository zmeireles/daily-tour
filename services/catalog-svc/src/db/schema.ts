import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  check,
  index,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// catalog schema is created by infra/postgres/init/01-schemas.sql.
// pgSchema() scopes tables to it WITHOUT emitting CREATE SCHEMA.
//
// Geometry decision: lat/lng stored as two double precision columns.
// PostGIS not required; haversine SQL expression handles the geo-filter
// in T-1.2.0. Revisit for Phase 3+ when OSRM integration lands.
export const catalogSchema = pgSchema("catalog");

export const actionTable = catalogSchema.table("action", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  i18n: jsonb("i18n").notNull().$type<Record<string, string>>(),
  sortOrder: integer("sort_order").notNull(),
  icon: varchar("icon", { length: 64 }).notNull(),
});

export const wishTable = catalogSchema.table(
  "wish",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actionTable.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    i18n: jsonb("i18n").notNull().$type<Record<string, string>>(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [
    // slug unique within action (not globally — "sea-view" can exist under both Eat and Drink)
    unique("wish_action_slug_uniq").on(t.actionId, t.slug),
    index("wish_action_sort_idx").on(t.actionId, t.sortOrder),
  ],
);

export const guesthouseTable = catalogSchema.table("guesthouse", {
  id: uuid("id").primaryKey().defaultRandom(),
  // no FK — cross-service join would be needed; bare UUID suffices
  ownerId: uuid("owner_id").notNull(),
  name: jsonb("name").notNull().$type<Record<string, string>>(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  address: text("address").notNull(),
  geomLat: doublePrecision("geom_lat").notNull(),
  geomLng: doublePrecision("geom_lng").notNull(),
  media: jsonb("media")
    .notNull()
    .default(sql`'[]'::jsonb`)
    .$type<string[]>(),
  // Plan-006 6.A: opt-out scoping. Global places (place.guesthouse_scope = all)
  // that this guesthouse's owner has hidden from their guests. The effective
  // visible set = {all} minus hidden_place_ids, plus places scoped to this gh.
  hiddenPlaceIds: uuid("hidden_place_ids")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const ownerProfileTable = catalogSchema.table("owner_profile", {
  // PK is owner_id (mirrors OwnerProfileSchema.owner_id — no separate id field)
  ownerId: uuid("owner_id").primaryKey(),
  bio: jsonb("bio").$type<Record<string, string>>(),
  // UUID of the media asset (not a URL); media-svc is the authority
  photo: uuid("photo"),
  phone: varchar("phone", { length: 32 }),
  callEnabled: boolean("call_enabled").notNull().default(false),
  dmChannels: jsonb("dm_channels").notNull().$type<{
    in_app: boolean;
    telegram: boolean;
    whatsapp_link: boolean;
    whatsapp_cloud: boolean;
  }>(),
  email: text("email"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const placeTable = catalogSchema.table(
  "place",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // {"all": true} = visible to all guesthouses; {"guesthouse_ids": [...]} = scoped
    guesthouseScope: jsonb("guesthouse_scope")
      .notNull()
      .$type<{ all: true } | { guesthouse_ids: string[] }>(),
    name: jsonb("name").notNull().$type<Record<string, string>>(),
    description: jsonb("description").notNull().$type<Record<string, string>>(),
    geomLat: doublePrecision("geom_lat").notNull(),
    geomLng: doublePrecision("geom_lng").notNull(),
    address: text("address").notNull(),
    contacts: jsonb("contacts").notNull().$type<{
      phone?: string;
      email?: string;
      website?: string;
      social?: Array<{ kind: string; handle: string }>;
    }>(),
    hours: jsonb("hours")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<Array<{ dow: number; open: string; close: string }>>(),
    status: text("status").notNull(),
    isHostsPick: boolean("is_hosts_pick").notNull().default(false),
    sourceKind: text("source_kind").notNull(),
    sourceRef: text("source_ref"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "place_status_check",
      sql`${t.status} IN ('draft','owner_approved','published','archived')`,
    ),
    check(
      "place_source_kind_check",
      sql`${t.sourceKind} IN ('manual','google_places','osm','crawl')`,
    ),
    index("place_status_idx").on(t.status),
    // Composite geo index for haversine-based proximity filtering (T-1.2.0)
    index("place_geom_idx").on(t.geomLat, t.geomLng),
  ],
);

// place_action_wish — M:N join linking places to action+wish pairs.
// PK decision: composite (place_id, action_id, wish_id) with wish_id NOT NULL.
// Rationale: places must have at least one explicit wish per action tag
// (semantic rule); a serial surrogate key adds no query benefit here.
export const placeActionWishTable = catalogSchema.table(
  "place_action_wish",
  {
    placeId: uuid("place_id")
      .notNull()
      .references(() => placeTable.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actionTable.id, { onDelete: "restrict" }),
    wishId: uuid("wish_id")
      .notNull()
      .references(() => wishTable.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.placeId, t.actionId, t.wishId] })],
);

export const placeMediaTable = catalogSchema.table(
  "place_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => placeTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    url: text("url").notNull(),
    alt: jsonb("alt").$type<Record<string, string>>(),
    // Licence credit for externally-sourced media (e.g. Wikimedia Commons
    // CC-BY-SA). NULL for owner-provided or public-domain assets (#135).
    attribution: jsonb("attribution").$type<{
      author: string;
      license: string;
      source_url: string;
    }>(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("place_media_kind_check", sql`${t.kind} IN ('image','video')`)],
);

export const placeCandidateTable = catalogSchema.table(
  "place_candidate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawPayload: jsonb("raw_payload").notNull().$type<Record<string, unknown>>(),
    sourceKind: text("source_kind").notNull(),
    sourceRef: text("source_ref").notNull(),
    dedupeHash: text("dedupe_hash").notNull(),
    status: text("status").notNull(),
    proposedPlace: jsonb("proposed_place").$type<Record<string, unknown>>(),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "place_candidate_source_kind_check",
      sql`${t.sourceKind} IN ('google_places','osm','crawl','manual')`,
    ),
    check(
      "place_candidate_status_check",
      sql`${t.status} IN ('new','reviewed','approved','rejected')`,
    ),
  ],
);

// Type exports — inferred from the table schemas. T-1.1.1 imports these.
export type Action = typeof actionTable.$inferSelect;
export type NewAction = typeof actionTable.$inferInsert;
export type Wish = typeof wishTable.$inferSelect;
export type NewWish = typeof wishTable.$inferInsert;
export type Guesthouse = typeof guesthouseTable.$inferSelect;
export type NewGuesthouse = typeof guesthouseTable.$inferInsert;
export type OwnerProfile = typeof ownerProfileTable.$inferSelect;
export type NewOwnerProfile = typeof ownerProfileTable.$inferInsert;
export type Place = typeof placeTable.$inferSelect;
export type NewPlace = typeof placeTable.$inferInsert;
export type PlaceActionWish = typeof placeActionWishTable.$inferSelect;
export type NewPlaceActionWish = typeof placeActionWishTable.$inferInsert;
export type PlaceMedia = typeof placeMediaTable.$inferSelect;
export type NewPlaceMedia = typeof placeMediaTable.$inferInsert;
export type PlaceCandidate = typeof placeCandidateTable.$inferSelect;
export type NewPlaceCandidate = typeof placeCandidateTable.$inferInsert;
