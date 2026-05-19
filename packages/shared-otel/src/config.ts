import { DiagLogLevel } from "@opentelemetry/api";

/**
 * Configuration for the OTel SDK helper.
 *
 * Env var mapping:
 * - `OTEL_SERVICE_NAME`                      → serviceName (required unless overridden)
 * - `OTEL_SERVICE_VERSION`                   → serviceVersion (default: "0.0.0")
 * - `OTEL_DEPLOYMENT_ENVIRONMENT`            → deploymentEnvironment (default: "development")
 * - `OTEL_EXPORTER_OTLP_ENDPOINT`            → traceEndpoint (default: "http://localhost:4318"; disabled if NODE_ENV=test and unset)
 * - `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`   → metricsEndpoint (unset → metrics exporter not registered)
 * - `OTEL_LOG_LEVEL`                         → logLevel (default: "INFO")
 */
export interface OtelConfig {
  serviceName: string;
  serviceVersion: string;
  deploymentEnvironment: string;
  /** Base URL for the OTLP trace exporter. Null means traces are disabled. */
  traceEndpoint: string | null;
  /** OTLP metrics endpoint. Null means metrics exporter is not registered. */
  metricsEndpoint: string | null;
  logLevel: DiagLogLevel;
}

const LOG_LEVEL_MAP: Record<string, DiagLogLevel> = {
  DEBUG: DiagLogLevel.DEBUG,
  INFO: DiagLogLevel.INFO,
  WARN: DiagLogLevel.WARN,
  ERROR: DiagLogLevel.ERROR,
  NONE: DiagLogLevel.NONE,
};

function parseLogLevel(raw: string | undefined): DiagLogLevel {
  if (!raw) return DiagLogLevel.INFO;
  const level = LOG_LEVEL_MAP[raw.toUpperCase()];
  return level ?? DiagLogLevel.INFO;
}

function resolveTraceEndpoint(): string | null {
  const envEndpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  // Explicit empty string = disabled. The compose files set `""` for dev so
  // services don't retry-spam ECONNREFUSED at a collector that isn't wired
  // up yet (T-0.5.x lands a real OTLP collector in Phase 5).
  if (envEndpoint === "") return null;
  if (envEndpoint) return envEndpoint;
  // Without any signal, only assume a collector exists in non-dev/test.
  if (process.env["NODE_ENV"] === "test" || process.env["NODE_ENV"] === "development") return null;
  return "http://localhost:4318";
}

export function readOtelConfig(overrides?: Partial<OtelConfig>): OtelConfig {
  const serviceName = overrides?.serviceName ?? process.env["OTEL_SERVICE_NAME"];

  if (!serviceName) {
    throw new Error(
      "OTel serviceName is required. Set OTEL_SERVICE_NAME or pass { serviceName } to initOtel().",
    );
  }

  const base: OtelConfig = {
    serviceName,
    serviceVersion: process.env["OTEL_SERVICE_VERSION"] ?? "0.0.0",
    deploymentEnvironment: process.env["OTEL_DEPLOYMENT_ENVIRONMENT"] ?? "development",
    traceEndpoint: resolveTraceEndpoint(),
    metricsEndpoint: process.env["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"] ?? null,
    logLevel: parseLogLevel(process.env["OTEL_LOG_LEVEL"]),
  };

  return { ...base, ...overrides };
}
