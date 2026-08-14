import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// auth_tokens schema is created by infra/postgres/init/01-schemas.sql.
// pgSchema() here scopes the tables to it WITHOUT emitting a CREATE SCHEMA.
export const authTokensSchema = pgSchema("auth_tokens");

export const guestTable = authTokensSchema.table(
  "guest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    locale: text("locale").notNull(),
    optInFlags: jsonb("opt_in_flags").notNull().$type<{ marketing: boolean; analytics: boolean }>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("guest_locale_check", sql`${t.locale} IN ('en','pt-PT','es','fr')`),
    check("guest_display_name_non_empty", sql`char_length(${t.displayName}) > 0`),
  ],
);

export const reservationTable = authTokensSchema.table(
  "reservation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // no FK — cross-schema (catalog.guesthouse, owned by catalog_svc)
    guesthouseId: uuid("guesthouse_id").notNull(),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guestTable.id, { onDelete: "restrict" }),
    checkin: date("checkin").notNull(),
    checkout: date("checkout").notNull(),
    partySize: integer("party_size").notNull(),
    locale: text("locale").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("reservation_party_size_positive", sql`${t.partySize} > 0`),
    check("reservation_locale_check", sql`${t.locale} IN ('en','pt-PT','es','fr')`),
    check(
      "reservation_status_check",
      sql`${t.status} IN ('confirmed','checked_in','checked_out','cancelled')`,
    ),
    check("reservation_checkout_after_checkin", sql`${t.checkout} > ${t.checkin}`),
    index("reservation_guest_checkin_idx").on(t.guestId, t.checkin),
    index("reservation_checkout_idx").on(t.checkout),
  ],
);

export const tokenGrantTable = authTokensSchema.table(
  "token_grant",
  {
    jti: varchar("jti", { length: 64 }).primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservationTable.id, { onDelete: "cascade" }),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("token_grant_reservation_active_idx").on(t.reservationId, t.revokedAt),
    index("token_grant_expires_idx").on(t.expiresAt),
  ],
);

// Type exports — inferred from the table schemas. T-1.0.1 imports these.
export type Guest = typeof guestTable.$inferSelect;
export type NewGuest = typeof guestTable.$inferInsert;
export type Reservation = typeof reservationTable.$inferSelect;
export type NewReservation = typeof reservationTable.$inferInsert;
export type TokenGrant = typeof tokenGrantTable.$inferSelect;
export type NewTokenGrant = typeof tokenGrantTable.$inferInsert;

// Re-export the locale/status union types from shared-types' enums so
// downstream callers can constrain inserts to the valid set without us
// duplicating the strings. (drizzle-orm's type inference returns `string`
// for our `text + CHECK` columns; the application layer narrows.)
export type { Locale, ReservationStatus } from "@daily-tour/shared-types";
