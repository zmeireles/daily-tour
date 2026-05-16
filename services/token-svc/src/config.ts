import { z } from "zod";

const ConfigSchema = z.object({
  TOKEN_SVC_DATABASE_URL: z.string().url(),
  // HS256 needs ≥32 bytes of entropy. Rotation is env-var swap + restart;
  // see README. Never log this value — keep it inside lib/jwt.ts's closure.
  JWT_SIGNING_KEY: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(8088),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type TokenSvcConfig = z.infer<typeof ConfigSchema>;

let cached: TokenSvcConfig | undefined;

export function loadConfig(): TokenSvcConfig {
  cached ??= ConfigSchema.parse(process.env);
  return cached;
}

// Test-only: reset the cached config so a test can swap env vars between cases.
export function resetConfigCache(): void {
  cached = undefined;
}
