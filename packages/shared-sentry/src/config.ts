/**
 * Configuration for the Sentry SDK helper.
 *
 * Env var mapping:
 * - `SENTRY_DSN`                   → dsn (null/empty → SDK is a complete no-op)
 * - `SENTRY_SERVICE_VERSION`       → release (default: "0.0.0"; falls back to npm_package_version)
 * - `OTEL_DEPLOYMENT_ENVIRONMENT`  → environment (preferred; shared with shared-otel)
 * - `NODE_ENV`                     → environment fallback (default: "development")
 *
 * `dsn === null` is the hard "disabled" contract: when the DSN env var is
 * unset or empty, initSentry() does not initialise the SDK and is a total
 * no-op. This lets the SDK ship before a GlitchTip/Sentry backend exists.
 */
export interface SentryConfig {
  /** DSN for the Sentry-compatible backend. Null means error reporting is disabled. */
  dsn: string | null;
  serviceName: string;
  /** Release identifier, surfaced as the Sentry `release` tag. */
  release: string;
  /** Deployment environment, surfaced as the Sentry `environment` tag. */
  environment: string;
}

function resolveDsn(): string | null {
  const dsn = process.env["SENTRY_DSN"];
  // Empty string is treated identically to unset — both mean "disabled".
  if (!dsn) return null;
  return dsn;
}

function resolveEnvironment(): string {
  // Prefer the same signal shared-otel uses so both exporters agree on the
  // environment label; fall back to NODE_ENV, then "development".
  return process.env["OTEL_DEPLOYMENT_ENVIRONMENT"] ?? process.env["NODE_ENV"] ?? "development";
}

export function readSentryConfig(overrides?: Partial<SentryConfig>): SentryConfig {
  const serviceName = overrides?.serviceName ?? process.env["OTEL_SERVICE_NAME"];

  if (!serviceName) {
    throw new Error(
      "Sentry serviceName is required. Set OTEL_SERVICE_NAME or pass { serviceName } to initSentry().",
    );
  }

  const base: SentryConfig = {
    dsn: resolveDsn(),
    serviceName,
    release: process.env["SENTRY_SERVICE_VERSION"] ?? process.env["npm_package_version"] ?? "0.0.0",
    environment: resolveEnvironment(),
  };

  return { ...base, ...overrides };
}
