import { closePool, runMigrations } from "./db/client.js";

await runMigrations();
await closePool();
console.warn("token-svc migrations applied");
