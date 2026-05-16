import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Testcontainers Postgres boot ~10-15s the first time per file; bump
    // the per-test timeout so we don't fail on cold start.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
