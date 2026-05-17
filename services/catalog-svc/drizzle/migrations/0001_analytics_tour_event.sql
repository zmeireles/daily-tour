-- analytics schema is created by infra/postgres/init/01-schemas.sql.
-- This migration runs under catalog_svc (schema owner); catalog_svc also owns
-- analytics per 02-roles.sql. bff INSERT grant is via ALTER DEFAULT PRIVILEGES.
CREATE TABLE "analytics"."tour_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"plan_id" uuid,
	"guest_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
