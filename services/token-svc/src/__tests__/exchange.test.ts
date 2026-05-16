import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jwtVerify } from "jose";
import {
  type SeededFixtures,
  seedFixtures,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
  truncateAll,
} from "./helpers.js";

const ctx = await startTestPostgres();
let fixtures: SeededFixtures;
setTestEnv(ctx.databaseUrl);

const SIGNING_KEY = process.env.JWT_SIGNING_KEY ?? "";
const verifySecret = new TextEncoder().encode(SIGNING_KEY);

const { createApp } = await import("../app.js");
const { closePool, getPool } = await import("../db/client.js");
const { resetConfigCache } = await import("../config.js");
const { resetJwtSecretCache } = await import("../lib/jwt.js");
const { hashOpaqueToken } = await import("../lib/opaque-token.js");

async function issueAndGetToken(
  app: Awaited<ReturnType<typeof createApp>>,
  reservationId: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `/v1/reservations/${reservationId}/token`,
  });
  if (res.statusCode !== 200) {
    throw new Error(`issue failed: ${res.statusCode} ${res.body}`);
  }
  return res.json<{ token: string }>().token;
}

describe("GET /v1/tokens/:opaque/exchange", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    resetJwtSecretCache();
    app = await createApp();
  });

  beforeEach(async () => {
    await truncateAll(ctx.pool);
    fixtures = await seedFixtures(ctx.pool);
  });

  afterAll(async () => {
    await app.close();
    await closePool();
    await stopTestPostgres(ctx);
  });

  it("happy path — returns a JWT with the expected claims", async () => {
    const opaque = await issueAndGetToken(app, fixtures.reservationId);

    const res = await app.inject({
      method: "GET",
      url: `/v1/tokens/${opaque}/exchange`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ jwt: string; exp: number }>();
    expect(body.jwt).toBeTruthy();
    expect(typeof body.exp).toBe("number");

    const { payload } = await jwtVerify(body.jwt, verifySecret);
    expect(payload.sub).toBe(fixtures.guestId);
    expect(payload.rid).toBe(fixtures.reservationId);
    expect(payload.gh).toBe(fixtures.guesthouseId);
    expect(payload.locale).toBe(fixtures.locale);
    expect(payload.jti).toBe(hashOpaqueToken(opaque));
    expect(payload.exp).toBe(body.exp);

    // exp ≤ min(checkout + 24h, now + 1h)
    const nowUnix = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeLessThanOrEqual(nowUnix + 60 * 60 + 5);
  });

  it("401 for unknown token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/tokens/unknown-token-abcdefghijklmnop1234/exchange",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "invalid_token" });
  });

  it("401 after revocation", async () => {
    const opaque = await issueAndGetToken(app, fixtures.reservationId);
    const jti = hashOpaqueToken(opaque);

    const revokeRes = await app.inject({
      method: "DELETE",
      url: `/v1/tokens/${jti}`,
    });
    expect(revokeRes.statusCode).toBe(204);

    const exchangeRes = await app.inject({
      method: "GET",
      url: `/v1/tokens/${opaque}/exchange`,
    });
    expect(exchangeRes.statusCode).toBe(401);
  });

  it("401 for expired grant (manual past expires_at)", async () => {
    const opaque = "expired-token-fixture-aaaaaaaaaaaaaaaa";
    const jti = hashOpaqueToken(opaque);
    // Insert a grant whose expires_at is in the past, bypassing the issue route.
    await getPool().query(
      `INSERT INTO auth_tokens.token_grant (jti, reservation_id, issued_at, expires_at)
       VALUES ($1, $2, now() - interval '2 days', now() - interval '1 day')`,
      [jti, fixtures.reservationId],
    );

    const res = await app.inject({
      method: "GET",
      url: `/v1/tokens/${opaque}/exchange`,
    });
    expect(res.statusCode).toBe(401);
  });
});
