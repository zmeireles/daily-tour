import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Sentry SDK — tests must not initialise the real SDK or make network calls.
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  setTags: vi.fn(),
  setupFastifyErrorHandler: vi.fn(),
}));

function clearEnv() {
  delete process.env["SENTRY_DSN"];
  delete process.env["SENTRY_SERVICE_VERSION"];
  delete process.env["OTEL_DEPLOYMENT_ENVIRONMENT"];
  delete process.env["OTEL_SERVICE_NAME"];
  delete process.env["NODE_ENV"];
  delete process.env["npm_package_version"];
}

describe("initSentry", () => {
  beforeEach(() => {
    clearEnv();
    // Reset module registry so the `initialized` flag resets between tests.
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(clearEnv);

  async function importModule() {
    // Dynamic import after vi.resetModules() gives a fresh module with initialized=false.
    return import("../init.js");
  }

  it("is a no-op and does NOT init the SDK when SENTRY_DSN is unset", async () => {
    const Sentry = await import("@sentry/node");
    const { initSentry } = await importModule();

    const enabled = initSentry({ serviceName: "test-svc" });

    expect(enabled).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.setTags).not.toHaveBeenCalled();
  });

  it("is a no-op when SENTRY_DSN is an empty string", async () => {
    process.env["SENTRY_DSN"] = "";
    const Sentry = await import("@sentry/node");
    const { initSentry } = await importModule();

    const enabled = initSentry({ serviceName: "test-svc" });

    expect(enabled).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("initialises the SDK when SENTRY_DSN is set", async () => {
    process.env["SENTRY_DSN"] = "https://abc@example.invalid/1";
    const Sentry = await import("@sentry/node");
    const { initSentry } = await importModule();

    const enabled = initSentry({ serviceName: "test-svc" });

    expect(enabled).toBe(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: "https://abc@example.invalid/1" }),
    );
  });

  it("sets service, environment and release tags when initialised", async () => {
    process.env["SENTRY_DSN"] = "https://abc@example.invalid/1";
    process.env["OTEL_DEPLOYMENT_ENVIRONMENT"] = "qual";
    process.env["SENTRY_SERVICE_VERSION"] = "1.2.3";
    const Sentry = await import("@sentry/node");
    const { initSentry } = await importModule();

    initSentry({ serviceName: "bff" });

    expect(Sentry.setTags).toHaveBeenCalledWith({
      service: "bff",
      environment: "qual",
      release: "1.2.3",
    });
  });

  it("second call is a no-op and does not init the SDK twice", async () => {
    process.env["SENTRY_DSN"] = "https://abc@example.invalid/1";
    const Sentry = await import("@sentry/node");
    const { initSentry } = await importModule();

    initSentry({ serviceName: "test-svc" });
    const secondEnabled = initSentry({ serviceName: "test-svc" });

    expect(secondEnabled).toBe(false);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  it("setupSentryFastifyErrorHandler is a no-op when Sentry is disabled", async () => {
    const Sentry = await import("@sentry/node");
    const { initSentry, setupSentryFastifyErrorHandler } = await importModule();

    initSentry({ serviceName: "test-svc" }); // disabled (no DSN)
    // Cast: the handler is a no-op before init, the arg is never touched.
    setupSentryFastifyErrorHandler({} as never);

    expect(Sentry.setupFastifyErrorHandler).not.toHaveBeenCalled();
  });

  it("setupSentryFastifyErrorHandler attaches the handler when Sentry is enabled", async () => {
    process.env["SENTRY_DSN"] = "https://abc@example.invalid/1";
    const Sentry = await import("@sentry/node");
    const { initSentry, setupSentryFastifyErrorHandler } = await importModule();

    initSentry({ serviceName: "test-svc" });
    const fakeApp = {} as never;
    setupSentryFastifyErrorHandler(fakeApp);

    expect(Sentry.setupFastifyErrorHandler).toHaveBeenCalledWith(fakeApp);
  });
});
