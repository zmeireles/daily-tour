import { defineConfig } from "drizzle-kit";

// dev/test only — production migration apply runs in T-1.1.1's container,
// not via drizzle-kit. The DATABASE_URL here is read for `db:generate` and
// `db:check` (schema introspection in dev). The connection string MUST point
// to the catalog_svc role so generated migrations target tables owned by it.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    // Default host port follows the DT_HOST_PORT_POSTGRES remap (27432).
    // Override via CATALOG_SVC_DATABASE_URL for non-default deployments.
    url:
      process.env.CATALOG_SVC_DATABASE_URL ??
      "postgres://catalog_svc:change-me-please-catalog@localhost:27432/dailytour",
  },
  schemaFilter: ["catalog"],
  verbose: true,
  strict: true,
});
