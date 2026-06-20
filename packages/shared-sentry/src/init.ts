import * as Sentry from "@sentry/node";
import { type SentryConfig, readSentryConfig } from "./config.js";

let initialized = false;

/**
 * Bootstrap the Sentry SDK for a Node service.
 *
 * **DSN-gated.** When `SENTRY_DSN` is unset or empty this is a complete no-op:
 * the SDK is never initialised, nothing is patched, and behaviour is unchanged.
 * Safe to ship before a Sentry-compatible backend (GlitchTip) exists.
 *
 * Init should run as early as possible — right after `initOtel()` in the
 * service's `instrumentation.ts`, before app/route creation — so early errors
 * are captured. Sentry's default integrations install `uncaughtException` and
 * `unhandledRejection` handlers; this is additive to the existing OTel SDK.
 *
 * ```ts
 * // services/bff/src/instrumentation.ts
 * import { initOtel } from "@daily-tour/shared-otel";
 * import { initSentry } from "@daily-tour/shared-sentry";
 * initOtel({ serviceName: "bff" });
 * initSentry({ serviceName: "bff" });
 * ```
 *
 * Calling this function more than once in the same process is a no-op.
 *
 * @returns `true` if Sentry was initialised, `false` if disabled (no DSN).
 */
export function initSentry(overrides?: Partial<SentryConfig>): boolean {
  if (initialized) return false;

  const config = readSentryConfig(overrides);

  // Hard contract: no DSN → disabled, total no-op.
  if (config.dsn === null) return false;

  initialized = true;

  Sentry.init({
    dsn: config.dsn,
    release: config.release,
    environment: config.environment,
    // Errors only for now; tracing stays with the OTel SDK (T-3.A.0 is
    // error-reporting wiring, not Sentry performance monitoring).
    tracesSampleRate: 0,
  });

  Sentry.setTags({
    service: config.serviceName,
    environment: config.environment,
    release: config.release,
  });

  return true;
}

/**
 * Attach Sentry's Fastify error handler so route-level errors are reported.
 *
 * No-op when Sentry was not initialised (DSN absent), so callers can wire it
 * unconditionally in their app factory. Fastify's existing error handling is
 * preserved — the Sentry handler reports then re-raises into the default
 * handler.
 */
export function setupSentryFastifyErrorHandler(
  app: Parameters<typeof Sentry.setupFastifyErrorHandler>[0],
): void {
  if (!initialized) return;
  Sentry.setupFastifyErrorHandler(app);
}

/**
 * Report an exception caught outside the HTTP request lifecycle — e.g. a
 * background message-queue worker whose errors are swallowed and never reach
 * the Fastify error handler.
 *
 * No-op when Sentry was not initialised (DSN absent), so callers can wire it
 * unconditionally inside their existing catch blocks.
 */
export function captureException(error: unknown): void {
  if (!initialized) return;
  Sentry.captureException(error);
}
