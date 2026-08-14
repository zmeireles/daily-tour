import tseslint from "typescript-eslint";
import globals from "globals";
import baseConfig from "./eslint.base.js";

export default tseslint.config(
  // tsup writes `tsup.config.bundled_<hash>.mjs` beside its config while it
  // builds and removes it on completion. `eslint .` lints `**/*.mjs` by
  // default, and the `lint` task depends on `^build` (upstream packages) but
  // not on its OWN package's build — so the two become schedulable together
  // and eslint can open the file after tsup has deleted it. That surfaced in
  // CI as a bare ENOENT on shared-sentry#lint and shared-otel#lint (#395).
  //
  // Capping turbo concurrency (#393/#394) only narrows the window; the tasks
  // are legitimately concurrent, so the race cannot be closed that way. This
  // ignore closes it. Every tsup package here uses this preset, which is why
  // it lives in the preset rather than in seven consumer configs.
  //
  // `.mjs` only, deliberately: bundle-require emits `.cjs` instead when the
  // nearest package.json is not `"type": "module"`, but all seven tsup
  // packages here are ESM, so that shape cannot occur. If a CommonJS package
  // is ever added, widen this to `*.{mjs,cjs}` — verified to work, but not
  // carried now for a case the repo cannot reach.
  { ignores: ["**/tsup.config.bundled_*.mjs"] },
  ...baseConfig,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Discourage process.exit() — prefer throwing errors for testability
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Prefer throwing an error over process.exit().",
        },
      ],
      // process.env access is fine in Node services (no-process-env was removed in ESLint 9)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
