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
  // ioredis-compatible connection URL. Used for the JTI revocation cache —
  // the BFF reads `jti:revoked:<jti>` on every authed request.
  REDIS_URL: z.string().default("redis://dt_redis:6379/0"),
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
