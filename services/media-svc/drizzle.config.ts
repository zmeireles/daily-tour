import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url:
      process.env.MEDIA_SVC_DATABASE_URL ??
      "postgres://media_svc:change-me-please-media@localhost:27432/dailytour",
  },
  schemaFilter: ["media"],
  verbose: true,
  strict: true,
});
