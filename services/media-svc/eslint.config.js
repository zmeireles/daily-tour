import nodeConfig from "@daily-tour/shared-config/eslint/node";

export default [
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  ...nodeConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
