import reactConfig from "@daily-tour/shared-config/eslint/react";

export default [
  {
    ignores: [
      "dist/**",
      "dev-dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...reactConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
