import { z } from "zod";

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // T-1.0.2 wires the real verification key from token-svc. Until then this
  // is optional and the auth plugin falls back to a dev-only HS256 secret.
  JWT_PUBLIC_KEY: z.string().optional(),
});

export type BffConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): BffConfig {
  return ConfigSchema.parse(process.env);
}
