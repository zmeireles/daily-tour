import { z } from "zod";

const ConfigSchema = z.object({
  CATALOG_SVC_DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(8081),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type CatalogSvcConfig = z.infer<typeof ConfigSchema>;

let cached: CatalogSvcConfig | undefined;

export function loadConfig(): CatalogSvcConfig {
  cached ??= ConfigSchema.parse(process.env);
  return cached;
}

export function resetConfigCache(): void {
  cached = undefined;
}
