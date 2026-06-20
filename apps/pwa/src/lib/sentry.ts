import * as Sentry from "@sentry/react";

/**
 * Bootstrap Sentry error reporting for the PWA.
 *
 * **DSN-gated.** When `VITE_SENTRY_DSN` is unset or empty this is a complete
 * no-op: the SDK is never initialised and behaviour is unchanged. Safe to ship
 * before a Sentry-compatible backend (GlitchTip) exists.
 *
 * Call once, before `createRoot(...).render(...)`, so early errors are captured.
 *
 * @returns `true` if Sentry was initialised, `false` if disabled (no DSN).
 */
export function initSentry(): boolean {
  const env = import.meta.env as Record<string, string | undefined>;
  const dsn = env.VITE_SENTRY_DSN;

  // Hard contract: no DSN → disabled, total no-op.
  if (!dsn) return false;

  Sentry.init({
    dsn,
    release: env.VITE_SENTRY_SERVICE_VERSION ?? "0.0.0",
    environment: env.VITE_APP_ENV ?? env.MODE ?? "development",
    // Errors only for now; performance/replay tracing is deferred.
    tracesSampleRate: 0,
  });

  Sentry.setTags({ service: "pwa" });

  return true;
}
