import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  sourcemap: true,
  dts: false, // service, not a library
  clean: true,
  splitting: false,
  treeshake: true,
  // Bundle workspace deps so the runtime image doesn't need the pnpm
  // workspace layout — shared-types is pure types so the runtime ESM
  // emit is tiny; shared-otel needs to stay external because OTel's
  // auto-instrumentation patches at module-load time.
  noExternal: ["@daily-tour/shared-types"],
});
