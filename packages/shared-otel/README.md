# @daily-tour/shared-otel

Node OpenTelemetry SDK helper for Daily Tour services. Initialises the OTel SDK (traces, optional metrics) with auto-instrumentation for HTTP, Fastify, PostgreSQL, and RabbitMQ. Call it once per service, before any other import.

## Usage

Create an instrumentation bootstrap file and make it the first import:

```ts
// services/bff/src/instrumentation.ts
import { initOtel } from "@daily-tour/shared-otel";
initOtel({ serviceName: "bff" });
```

```ts
// services/bff/src/index.ts
import "./instrumentation.js"; // MUST be the first import
import { createApp } from "./app.js";
// ...
```

The dynamic-import pattern is the safest way to ensure the SDK patches Node internals before instrumented modules are loaded:

```ts
// services/bff/src/index.ts
import { initOtel } from "@daily-tour/shared-otel";
initOtel({ serviceName: "bff" }); // ← BEFORE any other import
await import("./app.js"); // dynamic-import the app
```

## Environment variables

| Variable                              | Default                 | Description                                                                           |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `OTEL_SERVICE_NAME`                   | _(required)_            | Service name reported to the collector. Can be passed as an override to `initOtel()`. |
| `OTEL_SERVICE_VERSION`                | `0.0.0`                 | Service version attribute.                                                            |
| `OTEL_DEPLOYMENT_ENVIRONMENT`         | `development`           | Deployment environment attribute.                                                     |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | `http://localhost:4318` | Base URL for the OTLP trace exporter. Unset + `NODE_ENV=test` → traces disabled.      |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | _(unset)_               | OTLP metrics endpoint. If unset, the metrics exporter is not registered.              |
| `OTEL_LOG_LEVEL`                      | `INFO`                  | OTel diagnostic log level: `DEBUG \| INFO \| WARN \| ERROR \| NONE`.                  |

## Auto-instrumentations enabled by default

- `@opentelemetry/instrumentation-http` — Node `http` / `https` modules
- `@opentelemetry/instrumentation-fastify` — Fastify request lifecycle
- `@opentelemetry/instrumentation-pg` — PostgreSQL (used via Drizzle)
- `@opentelemetry/instrumentation-amqplib` — RabbitMQ (amqplib)

Disabled (too noisy): `fs`, `dns`, `net`.

## Adding a manual span

```ts
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-module");
await tracer.startActiveSpan("my-operation", async (span) => {
  // ... do work ...
  span.end();
});
```

## API

```ts
initOtel(overrides?: Partial<OtelConfig>): { shutdown: () => Promise<void> }
```

Idempotent — calling more than once in the same process is a no-op (logs a warning).

```ts
readOtelConfig(overrides?: Partial<OtelConfig>): OtelConfig
```

Returns the resolved configuration (useful for debugging or composing your own SDK).

```ts
registerShutdownHooks(sdk: NodeSDK): void
```

Wires SIGTERM / SIGINT / beforeExit handlers that call `sdk.shutdown()`. Used internally by `initOtel`; exported for advanced users.
