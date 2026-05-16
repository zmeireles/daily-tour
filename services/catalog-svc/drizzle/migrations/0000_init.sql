-- catalog schema created by infra/postgres/init/01-schemas.sql
-- This migration creates tables only; no CREATE SCHEMA here.
-- (drizzle-kit always emits a CREATE SCHEMA for pgSchema() targets; we
-- hand-strip it because the schema is shared infra. Re-strip after every
-- `db:generate`.)
CREATE TABLE "catalog"."action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"i18n" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"icon" varchar(64) NOT NULL,
	CONSTRAINT "action_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."guesthouse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"slug" varchar(100) NOT NULL,
	"address" text NOT NULL,
	"geom_lat" double precision NOT NULL,
	"geom_lng" double precision NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guesthouse_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."owner_profile" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"bio" jsonb,
	"photo" uuid,
	"phone" varchar(32),
	"call_enabled" boolean DEFAULT false NOT NULL,
	"dm_channels" jsonb NOT NULL,
	"email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guesthouse_scope" jsonb NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"geom_lat" double precision NOT NULL,
	"geom_lng" double precision NOT NULL,
	"address" text NOT NULL,
	"contacts" jsonb NOT NULL,
	"hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"is_hosts_pick" boolean DEFAULT false NOT NULL,
	"source_kind" text NOT NULL,
	"source_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_status_check" CHECK ("catalog"."place"."status" IN ('draft','owner_approved','published','archived')),
	CONSTRAINT "place_source_kind_check" CHECK ("catalog"."place"."source_kind" IN ('manual','google_places','osm','crawl'))
);
--> statement-breakpoint
CREATE TABLE "catalog"."wish" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"i18n" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "wish_action_slug_uniq" UNIQUE("action_id","slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."place_action_wish" (
	"place_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"wish_id" uuid NOT NULL,
	CONSTRAINT "place_action_wish_place_id_action_id_wish_id_pk" PRIMARY KEY("place_id","action_id","wish_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."place_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"alt" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_media_kind_check" CHECK ("catalog"."place_media"."kind" IN ('image','video'))
);
--> statement-breakpoint
CREATE TABLE "catalog"."place_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"source_kind" text NOT NULL,
	"source_ref" text NOT NULL,
	"dedupe_hash" text NOT NULL,
	"status" text NOT NULL,
	"proposed_place" jsonb,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_candidate_source_kind_check" CHECK ("catalog"."place_candidate"."source_kind" IN ('google_places','osm','crawl','manual')),
	CONSTRAINT "place_candidate_status_check" CHECK ("catalog"."place_candidate"."status" IN ('new','reviewed','approved','rejected'))
);
--> statement-breakpoint
ALTER TABLE "catalog"."wish" ADD CONSTRAINT "wish_action_id_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "catalog"."action"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."place_action_wish" ADD CONSTRAINT "place_action_wish_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "catalog"."place"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."place_action_wish" ADD CONSTRAINT "place_action_wish_action_id_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "catalog"."action"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."place_action_wish" ADD CONSTRAINT "place_action_wish_wish_id_wish_id_fk" FOREIGN KEY ("wish_id") REFERENCES "catalog"."wish"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."place_media" ADD CONSTRAINT "place_media_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "catalog"."place"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_status_idx" ON "catalog"."place" USING btree ("status");--> statement-breakpoint
CREATE INDEX "place_geom_idx" ON "catalog"."place" USING btree ("geom_lat","geom_lng");--> statement-breakpoint
CREATE INDEX "wish_action_sort_idx" ON "catalog"."wish" USING btree ("action_id","sort_order");
