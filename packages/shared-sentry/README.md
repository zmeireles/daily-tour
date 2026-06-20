# @daily-tour/shared-sentry

DSN-gated error-reporting SDK helper (`@sentry/node`) for Daily Tour Node services. Initialises the Sentry SDK with `environment`, `release`, and `service` tags, captures unhandled exceptions + rejections, and integrates with Fastify's error handling. Runs alongside `@daily-tour/shared-otel` — it does not replace or reorder OTel.

## DSN gate (the hard contract)

When `SENTRY_DSN` is unset or empty, `initSentry()` is a **complete no-op**: the SDK is never initialised, nothing is patched, and behaviour is unchanged. This lets the SDK ship before a Sentry-compatible backend (GlitchTip) exists.

## Usage

Call `initSentry()` right after `initOtel()` in the service's `instrumentation.ts`, before app/route creation:

```ts
// services/bff/src/instrumentation.ts
import { initOtel } from "@daily-tour/shared-otel";
import { initSentry } from "@daily-tour/shared-sentry";
initOtel({ serviceName: "bff" });
initSentry({ serviceName: "bff" });
```

Attach the Fastify error handler in the app factory so route-level errors are reported (no-op when Sentry is disabled, so wire it unconditionally):

```ts
// services/bff/src/app.ts
import { setupSentryFastifyErrorHandler } from "@daily-tour/shared-sentry";

export async function createApp() {
  const app = Fastify(/* ... */);
  // ... plugins + routes ...
  setupSentryFastifyErrorHandler(app);
  return app;
}
```

## Env vars

| Var                           | Meaning                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `SENTRY_DSN`                  | DSN of the Sentry-compatible backend. **Empty = disabled.**      |
| `SENTRY_SERVICE_VERSION`      | Release tag (falls back to `npm_package_version`, then `0.0.0`). |
| `OTEL_DEPLOYMENT_ENVIRONMENT` | Environment tag (preferred — shared with shared-otel).           |
| `NODE_ENV`                    | Environment tag fallback.                                        |
