import { z } from "zod";

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Shared HS256 secret with token-svc. The BFF only verifies — token-svc signs.
  // Rotation: env-var swap + restart on both services. ≥32 bytes of entropy
  // required by HS256.
  JWT_SIGNING_KEY: z.string().min(32),
  // Internal HTTP base URL for the token-svc on dt_internal. The BFF calls
  // /v1/tokens/:opaque/exchange to mint a JWT from a URL-borne opaque token.
  TOKEN_SVC_URL: z.string().url().default("http://dt_token_svc:8088"),
  // Internal HTTP base URL for catalog-svc on dt_internal. Called by the
  // discover aggregator and future place-detail route.
  CATALOG_SVC_URL: z.string().url().default("http://dt_catalog_svc:8081"),
  // Internal HTTP base URL for search-svc on dt_internal (T-2.1.1).
  SEARCH_SVC_URL: z.string().url().default("http://dt_search_svc:8082"),
  // Internal HTTP base URL for media-svc on dt_internal (T-1.4.0).
  MEDIA_SVC_URL: z.string().url().default("http://dt_media_svc:8087"),
  // Internal HTTP base URL for planner-svc on dt_internal (T-3.1.0).
  PLANNER_SVC_URL: z.string().url().default("http://dt_planner_svc:8083"),
  // Internal HTTP base URL for chat-hub on dt_internal (T-4.0.0).
  CHAT_HUB_URL: z.string().url().default("http://dt_chat_hub:8084"),
  // Shared secret forwarded as X-Internal-Token to media-svc. Temporary auth
  // posture until T-1.6.x wires Authentik OIDC (see media-svc/src/plugins/internal-auth.ts).
  MEDIA_SVC_INTERNAL_TOKEN: z.string().default("change-me-please-media-svc-internal-token-min-32c"),
  // ioredis-compatible connection URL. Used for the JTI revocation cache —
  // the BFF reads `jti:revoked:<jti>` on every authed request.
  REDIS_URL: z.string().default("redis://dt_redis:6379/0"),
  // Authentik JWKS endpoint for owner-app RS256 verification (T-1.6.0). Path
  // derives from the application slug declared in
  // infra/authentik/blueprints/owner-app.yaml — rename in lockstep.
  AUTHENTIK_JWKS_URL: z
    .string()
    .url()
    .default("http://dt_authentik_server:9000/application/o/owner-app/jwks/"),
  // Required token claim for owner-route access. The BFF accepts the value
  // in either `aud` or the `groups` array — Authentik puts the group name
  // in `groups` when the staff-only policy fires (see owner-app.yaml).
  AUTHENTIK_OWNER_AUDIENCE: z.string().default("staff"),
  // Postgres connection for analytics writes (T-3.4.1). The bff role owns
  // INSERT on analytics.tour_event via ALTER DEFAULT PRIVILEGES in 02-roles.sql.
  ANALYTICS_DATABASE_URL: z
    .string()
    .default("postgres://bff:change-me-please-bff@dt_postgres:5432/dailytour"),
});

export type BffConfig = z.infer<typeof ConfigSchema>;

let cached: BffConfig | undefined;

export function loadConfig(): BffConfig {
  cached ??= ConfigSchema.parse(process.env);
  return cached;
}

// Test-only: reset the cached config so a test can swap env vars between cases.
export function resetConfigCache(): void {
  cached = undefined;
}
