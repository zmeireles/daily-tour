import { pgSchema, uuid, text, bigint, jsonb, timestamp, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// media schema is created by infra/postgres/init/01-schemas.sql.
// pgSchema() scopes tables to it WITHOUT emitting CREATE SCHEMA.
export const mediaSchema = pgSchema("media");

export const assetTable = mediaSchema.table(
  "asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Authentik subject (placeholder until T-1.6.0 wires real ownership)
    ownerId: uuid("owner_id").notNull(),
    // "{owner_id}/{asset_id}.{ext}"
    bucketKey: text("bucket_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    // max 50 MB enforced at the DB level and in the route handler
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    // populated by T-1.4.1 transcode worker
    variants: jsonb("variants")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    // NULL until the client confirms PUT completed (out-of-band for v1; assume PUT succeeds)
    uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    check("asset_size_check", sql`${t.sizeBytes} <= 52428800`),
    index("asset_owner_id_idx").on(t.ownerId),
  ],
);

export type Asset = typeof assetTable.$inferSelect;
export type NewAsset = typeof assetTable.$inferInsert;
