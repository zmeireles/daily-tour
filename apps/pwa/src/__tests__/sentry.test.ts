import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Sentry SDK — tests must not initialise the real SDK.
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  setTags: vi.fn(),
}));

describe("initSentry (pwa)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function importModule() {
    return import("../lib/sentry");
  }

  it("is a no-op and does NOT init the SDK when VITE_SENTRY_DSN is unset", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    const Sentry = await import("@sentry/react");
    const { initSentry } = await importModule();

    const enabled = initSentry();

    expect(enabled).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.setTags).not.toHaveBeenCalled();
  });

  it("initialises the SDK and sets the service tag when VITE_SENTRY_DSN is set", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://abc@example.invalid/1");
    vi.stubEnv("VITE_APP_ENV", "qual");
    const Sentry = await import("@sentry/react");
    const { initSentry } = await importModule();

    const enabled = initSentry();

    expect(enabled).toBe(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://abc@example.invalid/1",
        environment: "qual",
      }),
    );
    expect(Sentry.setTags).toHaveBeenCalledWith({ service: "pwa" });
  });
});
