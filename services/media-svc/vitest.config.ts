import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    // Testcontainers Postgres boot ~10-15s the first time per file; bump timeouts.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
