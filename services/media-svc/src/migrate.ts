import { closePool, runMigrations } from "./db.js";

await runMigrations();
await closePool();
console.warn("media-svc migrations applied");
