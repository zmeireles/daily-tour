import tseslint from "typescript-eslint";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import baseConfig from "./eslint.base.js";

export default tseslint.config(
  ...baseConfig,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: { version: "detect" },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      // New JSX transform (React 17+) does not require React in scope
      "react/react-in-jsx-scope": "off",
      // TypeScript handles prop validation
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...jsxA11y.configs.recommended.rules,
    },
  },
);
