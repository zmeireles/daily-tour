-- 0001_tour_plan.sql — T-3.0.3
--
-- Ownership: planner_svc owns the `planner` schema (infra/postgres/init/02-roles.sql).
-- The API persists a queued row on POST /v1/tour-plans, publishes
-- `tour-plan.requested`, returns 202 + id. The worker reads the same row,
-- runs RAG + LLM + validators, and updates it to ready (plan_payload set)
-- or rejected (plan_payload contains {error}).
--
-- Status lifecycle (text, not enum — Phase 3 may add intermediate
-- 'retrieving'/'planning' tracing without a migration):
--     queued    → initial state on insert; the worker hasn't picked it up.
--     ready     → worker successfully produced a validated plan_payload.
--     rejected  → worker errored or a validator (provenance/travel-time)
--                 refused the candidate plan; plan_payload carries the reason.
--
-- request_payload mirrors the POST body verbatim (loc, action_wishes, …).
-- plan_payload is the final TourPlan-shaped document or {error: "…"} on reject.
-- Both are jsonb so the worker can write structured failure context without
-- a separate column per failure mode (FR-TUR observability).
CREATE TABLE IF NOT EXISTS "planner"."tour_plan" (
    "id" uuid PRIMARY KEY NOT NULL,
    "guest_id" uuid NOT NULL,
    "status" text NOT NULL DEFAULT 'queued',
    "request_payload" jsonb NOT NULL,
    "plan_payload" jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_plan_guest_id_idx"
    ON "planner"."tour_plan" ("guest_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_plan_status_created_at_idx"
    ON "planner"."tour_plan" ("status", "created_at" DESC);
