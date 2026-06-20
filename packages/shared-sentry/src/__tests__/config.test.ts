import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSentryConfig } from "../config.js";

function clearEnv() {
  delete process.env["SENTRY_DSN"];
  delete process.env["SENTRY_SERVICE_VERSION"];
  delete process.env["OTEL_DEPLOYMENT_ENVIRONMENT"];
  delete process.env["OTEL_SERVICE_NAME"];
  delete process.env["NODE_ENV"];
  delete process.env["npm_package_version"];
}

describe("readSentryConfig", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("returns dsn=null when SENTRY_DSN is unset", () => {
    const cfg = readSentryConfig({ serviceName: "svc" });
    expect(cfg.dsn).toBeNull();
  });

  it("returns dsn=null when SENTRY_DSN is empty", () => {
    process.env["SENTRY_DSN"] = "";
    const cfg = readSentryConfig({ serviceName: "svc" });
    expect(cfg.dsn).toBeNull();
  });

  it("reads SENTRY_DSN when present", () => {
    process.env["SENTRY_DSN"] = "https://abc@example.invalid/1";
    const cfg = readSentryConfig({ serviceName: "svc" });
    expect(cfg.dsn).toBe("https://abc@example.invalid/1");
  });

  it("prefers OTEL_DEPLOYMENT_ENVIRONMENT for environment", () => {
    process.env["OTEL_DEPLOYMENT_ENVIRONMENT"] = "qual";
    process.env["NODE_ENV"] = "production";
    const cfg = readSentryConfig({ serviceName: "svc" });
    expect(cfg.environment).toBe("qual");
  });

  it("falls back to NODE_ENV then development for environment", () => {
    process.env["NODE_ENV"] = "production";
    expect(readSentryConfig({ serviceName: "svc" }).environment).toBe("production");
    delete process.env["NODE_ENV"];
    expect(readSentryConfig({ serviceName: "svc" }).environment).toBe("development");
  });

  it("derives release from SENTRY_SERVICE_VERSION, then npm_package_version, then 0.0.0", () => {
    expect(readSentryConfig({ serviceName: "svc" }).release).toBe("0.0.0");
    process.env["npm_package_version"] = "9.9.9";
    expect(readSentryConfig({ serviceName: "svc" }).release).toBe("9.9.9");
    process.env["SENTRY_SERVICE_VERSION"] = "1.2.3";
    expect(readSentryConfig({ serviceName: "svc" }).release).toBe("1.2.3");
  });

  it("throws when serviceName is missing", () => {
    expect(() => readSentryConfig()).toThrow(/serviceName is required/);
  });

  it("reads serviceName from OTEL_SERVICE_NAME when no override is given", () => {
    process.env["OTEL_SERVICE_NAME"] = "from-env";
    expect(readSentryConfig().serviceName).toBe("from-env");
  });
});
