import { DiagLogLevel } from "@opentelemetry/api";
import { afterEach, describe, expect, it } from "vitest";
import { readOtelConfig } from "../config.js";

function clearEnv() {
  delete process.env["OTEL_SERVICE_NAME"];
  delete process.env["OTEL_SERVICE_VERSION"];
  delete process.env["OTEL_DEPLOYMENT_ENVIRONMENT"];
  delete process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  delete process.env["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"];
  delete process.env["OTEL_LOG_LEVEL"];
  delete process.env["NODE_ENV"];
}

afterEach(clearEnv);

describe("readOtelConfig", () => {
  it("returns correct config with all env vars set", () => {
    process.env["OTEL_SERVICE_NAME"] = "my-svc";
    process.env["OTEL_SERVICE_VERSION"] = "1.2.3";
    process.env["OTEL_DEPLOYMENT_ENVIRONMENT"] = "production";
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://collector:4318";
    process.env["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"] = "http://metrics:4318";
    process.env["OTEL_LOG_LEVEL"] = "DEBUG";

    const config = readOtelConfig();

    expect(config.serviceName).toBe("my-svc");
    expect(config.serviceVersion).toBe("1.2.3");
    expect(config.deploymentEnvironment).toBe("production");
    expect(config.traceEndpoint).toBe("http://collector:4318");
    expect(config.metricsEndpoint).toBe("http://metrics:4318");
    expect(config.logLevel).toBe(DiagLogLevel.DEBUG);
  });

  it("uses defaults when no env vars are set", () => {
    const config = readOtelConfig({ serviceName: "fallback-svc" });

    expect(config.serviceVersion).toBe("0.0.0");
    expect(config.deploymentEnvironment).toBe("development");
    expect(config.traceEndpoint).toBe("http://localhost:4318");
    expect(config.metricsEndpoint).toBeNull();
    expect(config.logLevel).toBe(DiagLogLevel.INFO);
  });

  it("throws when serviceName is not provided and env var is unset", () => {
    expect(() => readOtelConfig()).toThrow(/serviceName is required/);
  });

  it("disables traces when NODE_ENV=test and OTEL_EXPORTER_OTLP_ENDPOINT is unset", () => {
    process.env["NODE_ENV"] = "test";

    const config = readOtelConfig({ serviceName: "test-svc" });

    expect(config.traceEndpoint).toBeNull();
  });

  it("overrides win over env vars", () => {
    process.env["OTEL_SERVICE_NAME"] = "env-svc";
    process.env["OTEL_SERVICE_VERSION"] = "9.9.9";
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://env-collector:4318";

    const config = readOtelConfig({
      serviceName: "override-svc",
      serviceVersion: "1.0.0",
      traceEndpoint: "http://override-collector:4318",
    });

    expect(config.serviceName).toBe("override-svc");
    expect(config.serviceVersion).toBe("1.0.0");
    expect(config.traceEndpoint).toBe("http://override-collector:4318");
  });
});
