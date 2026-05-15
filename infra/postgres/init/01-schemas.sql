-- 01-schemas.sql
-- Schema-per-service layout (docs/exploration/03-architecture.md §4).
-- Cross-schema reads are forbidden by convention; cross-service joins go through
-- service APIs or projections. One Postgres cluster, one logical database
-- (`dailytour`), nine isolated schemas.

CREATE SCHEMA IF NOT EXISTS catalog;       -- places, owners, guesthouses, tags
CREATE SCHEMA IF NOT EXISTS chat;          -- threads, messages, channel bindings
CREATE SCHEMA IF NOT EXISTS planner;       -- tour_plan, tour_step
CREATE SCHEMA IF NOT EXISTS ingest;        -- place_candidate, raw payloads
CREATE SCHEMA IF NOT EXISTS auth_tokens;   -- token_grant, reservation tokens
CREATE SCHEMA IF NOT EXISTS media;         -- media_asset references to MinIO objects
CREATE SCHEMA IF NOT EXISTS notif;         -- notification_log, outbound queue state
CREATE SCHEMA IF NOT EXISTS audit;         -- append-only audit trail (read by all)
CREATE SCHEMA IF NOT EXISTS search;        -- place_embedding (pgvector) + RAG indexes
