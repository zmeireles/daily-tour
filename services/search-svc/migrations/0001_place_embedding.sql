-- 0001_place_embedding.sql — T-2.0.1
--
-- Ownership decision:
--   The `search` schema is created by infra/postgres/init/01-schemas.sql and
--   owned by `search_svc` per infra/postgres/init/02-roles.sql. The bootstrap
--   comment in 01-schemas.sql explicitly notes `search` is for
--   "place_embedding (pgvector) + RAG indexes". The T-2.0.1 task brief mentioned
--   placing the migration in catalog-svc, but doing so would (a) cross schema
--   ownership (catalog_svc has no CREATE on `search`), and (b) duplicate the
--   media-svc precedent — each service that OWNS a schema also owns its
--   migrations. We follow the media-svc pattern: raw SQL files in
--   services/search-svc/migrations/, applied by search-svc on startup.
--
-- Embedding model decision:
--   v1 uses OpenAI text-embedding-3-small with dimensions=1024 (default 1536
--   downprojected to 1024 via the OpenAI API's `dimensions` param). Rationale:
--   - Anthropic doesn't yet ship a first-party embedding API (recommends Voyage
--     for production RAG). OpenAI's small model is the path-of-least-friction
--     for v1 — swap to Voyage in Phase 2 if recall is insufficient.
--   - 1024 dims sits in the HNSW sweet spot: smaller index, ~similar recall to
--     1536 per OpenAI's MTEB measurements.
--   `model_version` column is intentionally text (not enum) so we can swap
--   providers without a migration; backfill worker (T-2.0.2) filters by it.
--
-- Index decision: HNSW on cosine ops.
--   - HNSW gives better recall than IVFFlat at the cost of slower index build.
--     For v1 (<100k places per guesthouse) the build cost is negligible.
--   - vector_cosine_ops matches OpenAI's recommended distance metric for
--     text-embedding-3-*.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search"."place_embedding" (
	"place_id" uuid PRIMARY KEY NOT NULL,
	"vec" vector(1024) NOT NULL,
	"model_version" text NOT NULL,
	"embedded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "place_embedding_hnsw_idx"
	ON "search"."place_embedding"
	USING hnsw ("vec" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "place_embedding_model_version_idx"
	ON "search"."place_embedding" ("model_version");
