import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GUEST_JWT_MAX_TTL_SECONDS, jtiRevokedKey } from "@daily-tour/shared-types";
import {
  type SeededFixtures,
  flushRedis,
  seedFixtures,
  setTestEnv,
  startTestPostgres,
  startTestRedis,
  stopTestPostgres,
  stopTestRedis,
  truncateAll,
} from "./helpers.js";

const ctx = await startTestPostgres();
const redisCtx = await startTestRedis();
let fixtures: SeededFixtures;
setTestEnv(ctx.databaseUrl, redisCtx.url);

const { createApp } = await import("../app.js");
const { closePool } = await import("../db/client.js");
const { resetConfigCache } = await import("../config.js");
const { resetJwtSecretCache } = await import("../lib/jwt.js");
const { hashOpaqueToken } = await import("../lib/opaque-token.js");
const { closeRedis } = await import("../lib/redis.js");

describe("DELETE /v1/tokens/:jti", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    resetJwtSecretCache();
    app = await createApp();
  });

  beforeEach(async () => {
    await truncateAll(ctx.pool);
    await flushRedis(redisCtx.client);
    fixtures = await seedFixtures(ctx.pool);
  });

  afterAll(async () => {
    await app.close();
    await closePool();
    await closeRedis();
    await stopTestPostgres(ctx);
    await stopTestRedis(redisCtx);
  });

  it("204 on first revoke; 204 again (idempotent); subsequent exchange 401", async () => {
    const issueRes = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    const { token } = issueRes.json<{ token: string }>();
    const jti = hashOpaqueToken(token);

    const first = await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    expect(second.statusCode).toBe(204);

    const exchange = await app.inject({
      method: "GET",
      url: `/v1/tokens/${token}/exchange`,
    });
    expect(exchange.statusCode).toBe(401);
  });

  it("404 for an unknown jti", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/tokens/never-existed-jti-aaaaaaaaaaaaaaaaaaa",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "token_not_found" });
  });

  // The half that was missing entirely: Postgres blocks a revoked grant being
  // exchanged for a NEW JWT, but the guest's already-minted JWT is only stopped
  // by this key, which the BFF reads on every authed request.
  it("publishes the revoked jti to the cache the BFF reads", async () => {
    const issueRes = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    const { token } = issueRes.json<{ token: string }>();
    const jti = hashOpaqueToken(token);

    // Control: the probe reads 0 before the revoke, so a 1 after it is the
    // revoke's doing and not a key that was always there.
    expect(await redisCtx.client.exists(jtiRevokedKey(jti))).toBe(0);

    const res = await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    expect(res.statusCode).toBe(204);

    expect(await redisCtx.client.exists(jtiRevokedKey(jti))).toBe(1);
  });

  it("gives the key a TTL that outlives any JWT still in flight", async () => {
    const issueRes = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    const { token } = issueRes.json<{ token: string }>();
    const jti = hashOpaqueToken(token);

    await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });

    // A JWT minted an instant before the revoke expires at most
    // GUEST_JWT_MAX_TTL_SECONDS later, so the key must still be there then.
    const ttl = await redisCtx.client.ttl(jtiRevokedKey(jti));
    expect(ttl).toBeGreaterThan(GUEST_JWT_MAX_TTL_SECONDS - 60);
    expect(ttl).toBeLessThanOrEqual(GUEST_JWT_MAX_TTL_SECONDS);
  });

  it("re-publishes on a retry, so a revoke whose cache write failed can be repeated", async () => {
    const issueRes = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    const { token } = issueRes.json<{ token: string }>();
    const jti = hashOpaqueToken(token);

    await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    // Simulate the first call's cache write never landing: the row is revoked,
    // the key is not there. A retry must fix that rather than no-op on the
    // already-revoked row.
    await redisCtx.client.del(jtiRevokedKey(jti));
    expect(await redisCtx.client.exists(jtiRevokedKey(jti))).toBe(0);

    const retry = await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    expect(retry.statusCode).toBe(204);
    expect(await redisCtx.client.exists(jtiRevokedKey(jti))).toBe(1);
  });
});
