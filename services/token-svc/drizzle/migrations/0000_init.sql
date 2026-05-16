-- auth_tokens schema created by infra/postgres/init/01-schemas.sql
-- This migration creates tables only; no CREATE SCHEMA here.
-- (drizzle-kit always emits a CREATE SCHEMA for pgSchema() targets; we
-- hand-strip it because the schema is shared infra. Re-strip after every
-- `db:generate`.)
CREATE TABLE "auth_tokens"."guest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"locale" text NOT NULL,
	"opt_in_flags" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_locale_check" CHECK ("auth_tokens"."guest"."locale" IN ('en','pt-PT','pt-BR','de','es','fr')),
	CONSTRAINT "guest_display_name_non_empty" CHECK (char_length("auth_tokens"."guest"."display_name") > 0)
);
--> statement-breakpoint
CREATE TABLE "auth_tokens"."reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guesthouse_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"checkin" date NOT NULL,
	"checkout" date NOT NULL,
	"party_size" integer NOT NULL,
	"locale" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_party_size_positive" CHECK ("auth_tokens"."reservation"."party_size" > 0),
	CONSTRAINT "reservation_locale_check" CHECK ("auth_tokens"."reservation"."locale" IN ('en','pt-PT','pt-BR','de','es','fr')),
	CONSTRAINT "reservation_status_check" CHECK ("auth_tokens"."reservation"."status" IN ('confirmed','checked_in','checked_out','cancelled')),
	CONSTRAINT "reservation_checkout_after_checkin" CHECK ("auth_tokens"."reservation"."checkout" > "auth_tokens"."reservation"."checkin")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens"."token_grant" (
	"jti" varchar(64) PRIMARY KEY NOT NULL,
	"reservation_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_tokens"."reservation" ADD CONSTRAINT "reservation_guest_id_guest_id_fk" FOREIGN KEY ("guest_id") REFERENCES "auth_tokens"."guest"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens"."token_grant" ADD CONSTRAINT "token_grant_reservation_id_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "auth_tokens"."reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservation_guest_checkin_idx" ON "auth_tokens"."reservation" USING btree ("guest_id","checkin");--> statement-breakpoint
CREATE INDEX "reservation_checkout_idx" ON "auth_tokens"."reservation" USING btree ("checkout");--> statement-breakpoint
CREATE INDEX "token_grant_reservation_active_idx" ON "auth_tokens"."token_grant" USING btree ("reservation_id","revoked_at");--> statement-breakpoint
CREATE INDEX "token_grant_expires_idx" ON "auth_tokens"."token_grant" USING btree ("expires_at");