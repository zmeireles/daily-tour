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
    // Default host port follows the DT_HOST_PORT_POSTGRES remap (27432).
    // Override via TOKEN_SVC_DATABASE_URL for non-default deployments.
    url:
      process.env.TOKEN_SVC_DATABASE_URL ??
      "postgres://token_svc:change-me-please-token@localhost:27432/dailytour",
  },
  schemaFilter: ["auth_tokens"],
  verbose: true,
  strict: true,
});
