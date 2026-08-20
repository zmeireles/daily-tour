import { Redis } from "ioredis";
import { jtiRevokedKey } from "@daily-tour/shared-types";
import { loadConfig } from "../config.js";

// Lazy singleton so tests can swap REDIS_URL before the first call. Tests must
// call `closeRedis()` between cases and `resetConfigCache()` if they change the
// URL; production code only ever calls `getRedis()`.
let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    const config = loadConfig();
    client = new Redis(config.REDIS_URL, {
      // Avoid spamming logs when Redis is briefly unavailable on boot — the
      // BFF must still serve /health for orchestrator probes.
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = undefined;
  }
}

// Test-only: swap a pre-built client (e.g. one pointed at a Testcontainers
// Redis) in for the lazy singleton.
export function setRedisForTest(next: Redis | undefined): void {
  client = next;
}

// Key naming convention:
//   jti:revoked:<jti>  — presence ⇒ revoked. Written by token-svc's revoke
//                        routes (the BFF only ever reads it); the key shape
//                        is shared via `jtiRevokedKey` so the two can't drift.
//   jti:active:<jti>   — presence ⇒ seen recently. TTL = 60s (refresh cycle).
//                        Useful for instrumentation; not load-bearing.
const ACTIVE_PREFIX = "jti:active:";

export async function isJtiRevoked(jti: string): Promise<boolean> {
  const result = await getRedis().exists(jtiRevokedKey(jti));
  return result === 1;
}

export async function cacheJtiActive(jti: string, ttlSeconds: number): Promise<void> {
  await getRedis().set(`${ACTIVE_PREFIX}${jti}`, "1", "EX", Math.max(1, Math.floor(ttlSeconds)));
}
