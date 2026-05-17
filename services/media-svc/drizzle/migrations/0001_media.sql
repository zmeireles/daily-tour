-- media schema is created by infra/postgres/init/01-schemas.sql.
-- CREATE SCHEMA IF NOT EXISTS is idempotent and safe to re-run.
CREATE SCHEMA IF NOT EXISTS media;
--> statement-breakpoint
CREATE TABLE "media"."asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"bucket_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"variants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone,
	CONSTRAINT "asset_bucket_key_unique" UNIQUE("bucket_key"),
	CONSTRAINT "asset_size_check" CHECK ("media"."asset"."size_bytes" <= 52428800)
);
--> statement-breakpoint
CREATE INDEX "asset_owner_id_idx" ON "media"."asset" USING btree ("owner_id");
