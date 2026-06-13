ALTER TABLE "catalog"."place" ADD COLUMN "season" text;--> statement-breakpoint
ALTER TABLE "catalog"."place" ADD CONSTRAINT "place_season_check" CHECK ("catalog"."place"."season" IS NULL OR "catalog"."place"."season" IN ('summer','winter'));
