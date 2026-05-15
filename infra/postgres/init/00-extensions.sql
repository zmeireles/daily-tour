-- 00-extensions.sql
-- Bootstrap Postgres extensions required by every service.
-- Runs once on first boot via /docker-entrypoint-initdb.d/.
--
-- Extensions:
--   vector    — pgvector 0.8.2+ for embedding search (catalog/search/planner RAG)
--   pg_trgm   — trigram similarity for fuzzy place-name search
--   unaccent  — accent-insensitive matching for pt/es/fr place names
--   pgcrypto  — gen_random_uuid() for UUIDv4 PKs across schemas

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
