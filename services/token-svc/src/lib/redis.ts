import { Redis } from "ioredis";
import { GUEST_JWT_MAX_TTL_SECONDS, jtiRevokedKey } from "@daily-tour/shared-types";
import { loadConfig } from "../config.js";

// Lazy singleton, mirroring the BFF's. Tests swap in a Testcontainers client
// via `setRedisForTest()` and must `closeRedis()` between cases.
let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    const config = loadConfig();
    client = new Redis(config.REDIS_URL, {
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

// Test-only: swap a pre-built client in for the lazy singleton.
export function setRedisForTest(next: Redis | undefined): void {
  client = next;
}

// Publish revoked JTIs to the cache the BFF checks on every authed request.
// Postgres stops a revoked grant being exchanged for a NEW JWT; this is what
// stops an ALREADY-MINTED one, which otherwise stays valid until its own `exp`.
//
// The TTL is the whole window a live JWT can still exist in — `exp` is capped
// at mint time to now + GUEST_JWT_MAX_TTL_SECONDS, and a mint cannot happen
// after this moment, so nothing outlives the key.
//
// Deliberately NOT swallowed: a failure here leaves the revoke half-done, and
// the caller has to be told rather than shown a 204 that enforces nothing.
export async function markJtisRevoked(jtis: readonly string[]): Promise<void> {
  if (jtis.length === 0) return;
  const pipeline = getRedis().pipeline();
  for (const jti of jtis) {
    pipeline.set(jtiRevokedKey(jti), "1", "EX", GUEST_JWT_MAX_TTL_SECONDS);
  }
  const results = await pipeline.exec();
  const failed = results?.find(([err]) => err !== null);
  if (failed) {
    throw failed[0] ?? new Error("redis pipeline failed");
  }
}
