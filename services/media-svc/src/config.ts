import { z } from "zod";

const ConfigSchema = z.object({
  MEDIA_SVC_DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(8087),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  MINIO_ENDPOINT: z.string().url().default("http://minio:9000"),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().default("daily-tour-media"),
  // Shared secret: BFF sends X-Internal-Token, media-svc validates it.
  // Temporary auth posture until T-1.6.x integrates Authentik (see plugins/internal-auth.ts).
  MEDIA_SVC_INTERNAL_TOKEN: z.string().min(32),
  // RabbitMQ AMQP connection URL. Worker + publisher degrade gracefully if unreachable.
  RABBITMQ_URL: z.string().default("amqp://dailytour:change-me-please-rabbit@rabbitmq:5672/"),
});

export type MediaSvcConfig = z.infer<typeof ConfigSchema>;

let cached: MediaSvcConfig | undefined;

export function loadConfig(): MediaSvcConfig {
  cached ??= ConfigSchema.parse(process.env);
  return cached;
}

export function resetConfigCache(): void {
  cached = undefined;
}
