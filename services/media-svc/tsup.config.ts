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
  noExternal: ["@daily-tour/shared-types"],
});
