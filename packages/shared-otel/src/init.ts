import { diag, DiagConsoleLogger } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { type OtelConfig, readOtelConfig } from "./config.js";
import { registerShutdownHooks } from "./shutdown.js";

let initialized = false;

/**
 * Bootstrap the OpenTelemetry Node SDK for a service.
 *
 * **MUST be called before any instrumented module is imported.**
 *
 * ```ts
 * // services/bff/src/index.ts
 * import { initOtel } from "@daily-tour/shared-otel";
 * initOtel({ serviceName: "bff" });       // ← first line
 * await import("./app.js");               // dynamic-import the rest
 * ```
 *
 * Calling this function more than once in the same process is a no-op.
 */
export function initOtel(overrides?: Partial<OtelConfig>): { shutdown: () => Promise<void> } {
  if (initialized) {
    diag.warn("[shared-otel] initOtel() called more than once — ignoring subsequent call.");
    return { shutdown: () => Promise.resolve() };
  }
  initialized = true;

  const config = readOtelConfig(overrides);

  diag.setLogger(new DiagConsoleLogger(), config.logLevel);

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.deploymentEnvironment,
  });

  const traceExporter =
    config.traceEndpoint !== null
      ? new OTLPTraceExporter({
          url: `${config.traceEndpoint}/v1/traces`,
        })
      : undefined;

  const metricReader =
    config.metricsEndpoint !== null
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${config.metricsEndpoint}/v1/metrics`,
          }),
          exportIntervalMillis: 30_000,
        })
      : undefined;

  // auto-instrumentations-node 0.76 dropped fastify from its bundle; we register
  // it separately via @opentelemetry/instrumentation-fastify so the auto map only
  // covers http / pg / amqplib (the ones still bundled and relevant to us).
  const instrumentations = [
    ...getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-net": { enabled: false },
      "@opentelemetry/instrumentation-http": { enabled: true },
      "@opentelemetry/instrumentation-pg": { enabled: true },
      "@opentelemetry/instrumentation-amqplib": { enabled: true },
    }),
    new FastifyInstrumentation(),
  ];

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations,
  });

  sdk.start();

  registerShutdownHooks(sdk);

  return {
    shutdown: async () => {
      await sdk.shutdown();
    },
  };
}
