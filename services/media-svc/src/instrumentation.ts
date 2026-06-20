import { initOtel } from "@daily-tour/shared-otel";
import { initSentry } from "@daily-tour/shared-sentry";

// MUST be imported as the first line of src/index.ts.
initOtel({ serviceName: "media-svc" });

// Error reporting runs alongside OTel. DSN-gated: a complete no-op when
// SENTRY_DSN is unset/empty, so this is safe before a Sentry-compatible
// backend (GlitchTip) exists.
initSentry({ serviceName: "media-svc" });
