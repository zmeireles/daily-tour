-- 0001_chat_core.sql — T-4.0.1
--
-- Ownership: chat_svc owns the `chat` schema (infra/postgres/init/02-roles.sql).
-- The in-app WS driver persists every inbound guest frame here; the BFF
-- history route (GET /v1/chat/history) reads them back so messages survive
-- a page reload (UAT-G08 step 5). bff has default-privilege SELECT on this
-- schema (02-roles.sql), so no extra GRANT is needed.
--
-- Identity: `chat_thread.guest_id` is a *logical* reference to the guest
-- behind a reservation token (auth_tokens.guest.id == JWT `sub`). No
-- cross-schema FK by design (D-? — services own their schema; refs across
-- schema boundaries stay logical). One thread per guest for v1; the JWT
-- also carries `rid` (reservation_id) but the BFF chat-ws bridge forwards
-- only `sub`, so reservation-scoped threads wait on that contract change
-- (tracked alongside daily-tour Riff #147's reservation_id propagation).
--
-- `message.direction`: 'inbound'  = guest → platform (what the guest typed)
--                      'outbound' = platform → guest (host/system replies)
-- text, not enum, so new directions need no migration.
--
-- `channel_binding` maps an external channel identity (e.g. a Telegram
-- chat id) to a thread; unused by in_app (the WS path IS the identity) but
-- created now per the T-4.0.1 acceptance — Telegram/WhatsApp (T-4.2/T-4.3)
-- populate it.
CREATE TABLE IF NOT EXISTS "chat"."chat_thread" (
    "id" uuid PRIMARY KEY NOT NULL,
    "guest_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "chat_thread_guest_id_key" UNIQUE ("guest_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat"."message" (
    "id" uuid PRIMARY KEY NOT NULL,
    "thread_id" uuid NOT NULL REFERENCES "chat"."chat_thread" ("id") ON DELETE CASCADE,
    "channel" text NOT NULL,
    "sender_id" text NOT NULL,
    "direction" text NOT NULL,
    "body" text NOT NULL,
    "external_message_id" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_thread_id_created_at_idx"
    ON "chat"."message" ("thread_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat"."channel_binding" (
    "id" uuid PRIMARY KEY NOT NULL,
    "thread_id" uuid NOT NULL REFERENCES "chat"."chat_thread" ("id") ON DELETE CASCADE,
    "channel" text NOT NULL,
    "external_id" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "channel_binding_channel_external_id_key" UNIQUE ("channel", "external_id")
);
