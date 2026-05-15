import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the heavy OTel packages — tests must not make network calls or start the SDK.
vi.mock("@opentelemetry/sdk-node", () => {
  const start = vi.fn();
  const shutdown = vi.fn().mockResolvedValue(undefined);
  const NodeSDK = vi.fn().mockImplementation(() => ({ start, shutdown }));
  return { NodeSDK };
});

vi.mock("@opentelemetry/auto-instrumentations-node", () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@opentelemetry/exporter-metrics-otlp-http", () => ({
  OTLPMetricExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@opentelemetry/sdk-metrics", () => ({
  PeriodicExportingMetricReader: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@opentelemetry/resources", () => ({
  Resource: vi.fn().mockImplementation(() => ({})),
}));

function clearEnv() {
  delete process.env["OTEL_SERVICE_NAME"];
  delete process.env["OTEL_SERVICE_VERSION"];
  delete process.env["OTEL_DEPLOYMENT_ENVIRONMENT"];
  delete process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  delete process.env["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"];
  delete process.env["OTEL_LOG_LEVEL"];
  delete process.env["NODE_ENV"];
}

describe("initOtel", () => {
  beforeEach(() => {
    clearEnv();
    // Reset module registry so the `initialized` flag resets between tests.
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(clearEnv);

  async function importInitOtel() {
    // Dynamic import after vi.resetModules() gives a fresh module with initialized=false.
    const mod = await import("../init.js");
    return mod.initOtel;
  }

  it("returns a shutdown function", async () => {
    process.env["NODE_ENV"] = "development";
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318";
    const initOtel = await importInitOtel();

    const result = initOtel({ serviceName: "test-svc" });

    expect(result).toHaveProperty("shutdown");
    expect(typeof result.shutdown).toBe("function");
  });

  it("second call returns a no-op shutdown and does not start a second SDK", async () => {
    process.env["NODE_ENV"] = "development";
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318";
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const initOtel = await importInitOtel();

    initOtel({ serviceName: "test-svc" });
    initOtel({ serviceName: "test-svc" }); // second call — must be a no-op

    // NodeSDK constructor called only once
    expect(NodeSDK).toHaveBeenCalledTimes(1);
  });

  it("does not wire a trace exporter when NODE_ENV=test and OTEL_EXPORTER_OTLP_ENDPOINT is unset", async () => {
    process.env["NODE_ENV"] = "test";
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const initOtel = await importInitOtel();

    initOtel({ serviceName: "test-svc" });

    expect(OTLPTraceExporter).not.toHaveBeenCalled();
  });

  it("wires a metrics reader when OTEL_EXPORTER_OTLP_METRICS_ENDPOINT is set", async () => {
    process.env["NODE_ENV"] = "test";
    process.env["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"] = "http://metrics:4318";
    const { PeriodicExportingMetricReader } = await import("@opentelemetry/sdk-metrics");
    const initOtel = await importInitOtel();

    initOtel({ serviceName: "test-svc" });

    expect(PeriodicExportingMetricReader).toHaveBeenCalledTimes(1);
  });
});
