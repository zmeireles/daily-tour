import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  sourcemap: true,
  dts: false,
  clean: true,
  splitting: false,
  treeshake: true,
  // Bundle shared-types (pure types, tiny emit). shared-otel stays external —
  // OTel's auto-instrumentation patches at module-load time and requires real
  // node_modules resolution.
  noExternal: ["@daily-tour/shared-types"],
});
