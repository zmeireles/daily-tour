import { closePool, runMigrations } from "./db/client.js";

await runMigrations();
await closePool();
console.warn("catalog-svc migrations applied");
