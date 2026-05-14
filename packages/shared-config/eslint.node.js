import tseslint from "typescript-eslint";
import globals from "globals";
import baseConfig from "./eslint.base.js";

export default tseslint.config(
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
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Prefer throwing an error over process.exit().",
        },
      ],
      // process.env access is fine in Node services (no-process-env was removed in ESLint 9)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
