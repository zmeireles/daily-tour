CREATE SCHEMA IF NOT EXISTS "catalog";

CREATE TABLE "catalog"."guest_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid,
	"rating" integer NOT NULL,
	"text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_feedback_rating_check" CHECK (rating BETWEEN 1 AND 5)
);
