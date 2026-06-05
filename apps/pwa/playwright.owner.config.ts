import { defineConfig, devices } from "@playwright/test";

/**
 * LOCAL-only Playwright config for the owner-auth integration spec
 * (e2e/owner-auth.spec.ts). Unlike the default config it does NOT start the
 * `preview` server — it drives the running **dev** server on :5173 (which has
 * the /v1 → bff proxy and loads apps/pwa/.env.local with VITE_AUTHENTIK_URL).
 *
 * Run with:  pnpm --filter @daily-tour/pwa test:e2e:owner
 * The spec self-skips when Authentik isn't up, so this never runs in CI.
 *
 * PW_EXECUTABLE can pin a specific already-downloaded Chromium build when the
 * Playwright-managed cache lacks the exact version (avoids a fresh download).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/owner-*.spec.ts",
  // Generous timeout + one retry: these drive a live OIDC login against a dev
  // Authentik whose flow executor can slow under rapid back-to-back logins.
  timeout: 120_000,
  fullyParallel: false,
  // Shared backend state (Authentik, catalog, MinIO) as the same owner — run
  // serially so the specs don't race each other.
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PW_EXECUTABLE
          ? { executablePath: process.env.PW_EXECUTABLE }
          : {},
      },
    },
  ],
});
