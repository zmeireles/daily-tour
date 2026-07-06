ALTER TABLE "catalog"."guesthouse" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."guesthouse" ADD COLUMN "rooms" integer;--> statement-breakpoint
ALTER TABLE "catalog"."guesthouse" ADD CONSTRAINT "guesthouse_status_check" CHECK ("catalog"."guesthouse"."status" IN ('active','archived'));