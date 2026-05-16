import { defineConfig } from "drizzle-kit";

// dev/test only — production migration apply runs in T-1.0.1's container,
// not via drizzle-kit. The DATABASE_URL here is read for `db:generate` and
// `db:check` (schema introspection in dev). The connection string MUST point
// to the token_svc role so generated migrations target tables owned by it.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url:
      process.env.TOKEN_SVC_DATABASE_URL ??
      "postgres://token_svc:change-me-please-token@localhost:5432/dailytour",
  },
  schemaFilter: ["auth_tokens"],
  verbose: true,
  strict: true,
});
