import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  sourcemap: true,
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  // shared-types is pure zod schemas + types — safe to inline.
  // shared-otel must resolve at runtime: OTel auto-instrumentation uses
  // `require-in-the-middle` to patch modules, which the static bundler
  // can't preserve. Everything else (fastify, @fastify/*, zod) also stays
  // external and ships via `pnpm deploy --prod` into the runtime image.
  noExternal: ["@daily-tour/shared-types"],
});
