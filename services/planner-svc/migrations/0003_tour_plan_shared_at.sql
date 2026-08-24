-- dt-tests #40 (option C) — plan sharing becomes explicit and revocable.
--
-- Before this, EVERY plan that reached `ready` was readable by anyone holding
-- its id: `GET /v1/public/tour-plans/:id` gated on status alone, and there was
-- no column to gate on. Tapping "Partilhar" granted nothing, because nothing
-- was ever withheld. `shared_at` is that missing state — NULL means private.
--
-- ⚠️ THE BACKFILL MUST RUN EXACTLY ONCE, AND THAT IS WHY THIS IS A DO BLOCK.
--
-- dev-up.sh re-applies every services/<svc>/migrations/*.sql on EVERY start
-- (see its comment: "each *.sql is idempotent via IF NOT EXISTS, so re-running
-- is safe"). The obvious spelling of this migration —
--
--     ALTER TABLE ... ADD COLUMN IF NOT EXISTS shared_at timestamptz;
--     UPDATE ... SET shared_at = now() WHERE status = 'ready' AND shared_at IS NULL;
--
-- is idempotent as DDL and CORRUPTING as data: a revoked plan has shared_at
-- NULL and status 'ready', so the next dev-up would silently re-share every
-- link a guest had deliberately withdrawn. The revoke button would look like
-- it worked and quietly undo itself.
--
-- Guarding on the column's existence ties the backfill to the one moment it is
-- correct — the migration's first application, when no revocation can yet
-- exist. Re-running is then a genuine no-op rather than a destructive one.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'planner'
          AND table_name = 'tour_plan'
          AND column_name = 'shared_at'
    ) THEN
        ALTER TABLE "planner"."tour_plan"
            ADD COLUMN "shared_at" timestamp with time zone;

        -- Grandfather every plan that is already reachable. Links handed out
        -- before this deploy keep working; only plans created afterwards start
        -- private. This is what makes the change non-breaking, and it is the
        -- reason the decision was deferrable for as long as it was.
        UPDATE "planner"."tour_plan"
        SET "shared_at" = now()
        WHERE "status" = 'ready';
    END IF;
END
$$;
--> statement-breakpoint
-- The public read path filters on shared_at; the guest's own plan list does
-- not. Partial index keeps the public lookup off a full scan as plans grow.
CREATE INDEX IF NOT EXISTS "tour_plan_shared_at_idx"
    ON "planner"."tour_plan" ("shared_at")
    WHERE "shared_at" IS NOT NULL;
