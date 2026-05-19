-- 02-roles.sql
-- Per-service database roles with least-privilege grants.
-- Runs once on first boot via /docker-entrypoint-initdb.d/.
--
-- ROTATION POLICY (dev → QA → prod):
--   The PASSWORD literals below MUST match the SERVICE_DB_PASSWORD_* values in
--   `.env.example` / `.env`. They are intentional dev placeholders. Before any
--   non-local deploy, rotate them in BOTH places:
--     1. Update the literal in this file (or run `ALTER ROLE` post-boot).
--     2. Update the matching env var in `.env`.
--     3. Restart the dependent service so it picks up the new password.
--   Phase 5 (prod hardening) will replace these placeholders with a secrets
--   manager + bootstrap migration. See `infra/README.md` for the procedure.
--
-- Grant model (docs/exploration/03-architecture.md §4):
--   * Each service role OWNS its schema (full DDL+DML).
--   * Cross-schema reads are limited to the few documented exceptions
--     (e.g. chat_svc needs auth_tokens.read for webhook token validation;
--     planner_svc needs catalog+search read for RAG).
--   * Every service has SELECT on `audit` (read-only audit trail).
--   * `bff` is the aggregator: SELECT on everything, INSERT/UPDATE on nothing.
--   * `n8n` only reads `audit` from this database; its own state lives in a
--     separate database created by the T-0.3.3 overlay.

-- ---------------------------------------------------------------------------
-- Catalog service: owns `catalog` + `analytics` (telemetry table migrations)
-- ---------------------------------------------------------------------------
CREATE ROLE catalog_svc WITH LOGIN PASSWORD 'change-me-please-catalog';
ALTER SCHEMA catalog OWNER TO catalog_svc;
ALTER SCHEMA analytics OWNER TO catalog_svc;
GRANT USAGE ON SCHEMA audit TO catalog_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO catalog_svc;

-- ---------------------------------------------------------------------------
-- Chat-hub service: owns `chat`, reads `auth_tokens` (webhook token validation)
-- ---------------------------------------------------------------------------
CREATE ROLE chat_svc WITH LOGIN PASSWORD 'change-me-please-chat';
ALTER SCHEMA chat OWNER TO chat_svc;
GRANT USAGE ON SCHEMA auth_tokens TO chat_svc;
-- FOR ROLE: default privileges only apply to tables created by the named role.
-- Without it, the grant scopes to tables postgres creates — but auth_tokens
-- tables are created by token_svc, so chat_svc would silently lack SELECT.
ALTER DEFAULT PRIVILEGES FOR ROLE token_svc IN SCHEMA auth_tokens
  GRANT SELECT ON TABLES TO chat_svc;
GRANT USAGE ON SCHEMA audit TO chat_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO chat_svc;

-- ---------------------------------------------------------------------------
-- Planner service: owns `planner`, reads `catalog` + `search` (RAG retrieval)
-- ---------------------------------------------------------------------------
CREATE ROLE planner_svc WITH LOGIN PASSWORD 'change-me-please-planner';
ALTER SCHEMA planner OWNER TO planner_svc;
GRANT USAGE ON SCHEMA catalog TO planner_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE catalog_svc IN SCHEMA catalog
  GRANT SELECT ON TABLES TO planner_svc;
GRANT USAGE ON SCHEMA search TO planner_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE search_svc IN SCHEMA search
  GRANT SELECT ON TABLES TO planner_svc;
GRANT USAGE ON SCHEMA audit TO planner_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO planner_svc;

-- ---------------------------------------------------------------------------
-- Search service: owns `search` (pgvector tables), reads `catalog`
-- ---------------------------------------------------------------------------
CREATE ROLE search_svc WITH LOGIN PASSWORD 'change-me-please-search';
ALTER SCHEMA search OWNER TO search_svc;
GRANT USAGE ON SCHEMA catalog TO search_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE catalog_svc IN SCHEMA catalog
  GRANT SELECT ON TABLES TO search_svc;
GRANT USAGE ON SCHEMA audit TO search_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO search_svc;

-- ---------------------------------------------------------------------------
-- Ingest service: owns `ingest`
-- ---------------------------------------------------------------------------
CREATE ROLE ingest_svc WITH LOGIN PASSWORD 'change-me-please-ingest';
ALTER SCHEMA ingest OWNER TO ingest_svc;
GRANT USAGE ON SCHEMA audit TO ingest_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO ingest_svc;

-- ---------------------------------------------------------------------------
-- Notification service: owns `notif`
-- ---------------------------------------------------------------------------
CREATE ROLE notif_svc WITH LOGIN PASSWORD 'change-me-please-notif';
ALTER SCHEMA notif OWNER TO notif_svc;
GRANT USAGE ON SCHEMA audit TO notif_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO notif_svc;

-- ---------------------------------------------------------------------------
-- Media service: owns `media` (MinIO object metadata)
-- ---------------------------------------------------------------------------
CREATE ROLE media_svc WITH LOGIN PASSWORD 'change-me-please-media';
ALTER SCHEMA media OWNER TO media_svc;
GRANT USAGE ON SCHEMA audit TO media_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO media_svc;

-- ---------------------------------------------------------------------------
-- Token service: owns `auth_tokens`
-- ---------------------------------------------------------------------------
CREATE ROLE token_svc WITH LOGIN PASSWORD 'change-me-please-token';
ALTER SCHEMA auth_tokens OWNER TO token_svc;
GRANT USAGE ON SCHEMA audit TO token_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO token_svc;

-- ---------------------------------------------------------------------------
-- BFF: aggregator, READ-ONLY across every schema.
-- Exception: INSERT on analytics (telemetry events, T-3.4.1).
-- ---------------------------------------------------------------------------
CREATE ROLE bff WITH LOGIN PASSWORD 'change-me-please-bff';
GRANT USAGE ON SCHEMA catalog, chat, planner, ingest, auth_tokens,
                       media, notif, audit, search, analytics TO bff;
-- analytics INSERT: catalog_svc creates tables; bff writes telemetry rows.
ALTER DEFAULT PRIVILEGES FOR ROLE catalog_svc IN SCHEMA analytics
  GRANT INSERT ON TABLES TO bff;
-- Default privileges are applied per-schema by the owning service when it
-- creates tables. We pre-declare them here so future CREATE TABLE statements
-- by the owner role automatically grant SELECT to bff.
ALTER DEFAULT PRIVILEGES FOR ROLE catalog_svc IN SCHEMA catalog
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE chat_svc IN SCHEMA chat
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE planner_svc IN SCHEMA planner
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE ingest_svc IN SCHEMA ingest
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE token_svc IN SCHEMA auth_tokens
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE media_svc IN SCHEMA media
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE notif_svc IN SCHEMA notif
  GRANT SELECT ON TABLES TO bff;
ALTER DEFAULT PRIVILEGES FOR ROLE search_svc IN SCHEMA search
  GRANT SELECT ON TABLES TO bff;
-- audit is special: any service may INSERT, but only audit_owner (the postgres
-- superuser for now; promoted to a dedicated audit_writer role in Phase 1)
-- creates its tables. bff still gets SELECT on the audit schema's tables.
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO bff;

-- ---------------------------------------------------------------------------
-- n8n: only reads `audit` from this database. Its application state lives in a
-- dedicated database/role provisioned by the T-0.3.3 overlay.
-- ---------------------------------------------------------------------------
CREATE ROLE n8n WITH LOGIN PASSWORD 'change-me-please-n8n';
GRANT USAGE ON SCHEMA audit TO n8n;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT ON TABLES TO n8n;
