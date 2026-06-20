import { initOtel } from "@daily-tour/shared-otel";
import { initSentry } from "@daily-tour/shared-sentry";

// MUST be imported as the first line of src/index.ts.
// initOtel() is idempotent; under NODE_ENV=test the trace exporter is
// disabled by the shared-otel contract, so importing this file from a
// test is safe.
initOtel({ serviceName: "token-svc" });

// Error reporting runs alongside OTel. DSN-gated: a complete no-op when
// SENTRY_DSN is unset/empty, so this is safe before a Sentry-compatible
// backend (GlitchTip) exists.
initSentry({ serviceName: "token-svc" });
