ALTER TABLE "analytics"."tour_event" ADD COLUMN IF NOT EXISTS "is_beta" boolean DEFAULT false NOT NULL;
