import Fastify, { type FastifyInstance } from "fastify";
import { SignJWT, createLocalJWKSet } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import {
  TEST_OWNER_KID,
  type AuthentikTestKeypair,
  makeAuthentikKeypair,
  signOwnerJwt,
} from "./authentik-keypair.js";
import {
  TEST_JWT_KEY,
  type TestRedisCtx,
  flushRedis,
  setTestEnv,
  startTestRedis,
  stopTestRedis,
} from "./helpers.js";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const GUEST_SIGNING_KEY = new TextEncoder().encode(TEST_JWT_KEY);

// Builds a minimal app that mirrors createApp's auth registration order
// (authPlugin → ownerAuthPlugin) but skips cors/helmet/etc. The owner-auth
// plugin is registered with an injected jwks resolver so jwtVerify hits
// the in-memory keypair instead of the real Authentik instance.
async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });

  app.get("/test/owner", { config: { auth: "owner" } }, () => ({ ok: true, scope: "owner" }));
  app.get("/test/guest", () => ({ ok: true, scope: "guest" }));
  app.get("/test/public", { config: { auth: "public" } }, () => ({ ok: true, scope: "public" }));

  await app.ready();
  return app;
}

describe("BFF owner auth (Authentik posture)", () => {
  let app: FastifyInstance;
  let keypair: AuthentikTestKeypair;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    keypair = await makeAuthentikKeypair();
    app = await buildTestApp(keypair);
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("owner route + no auth header → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/test/owner" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  it("owner route + valid signature but wrong audience → 403", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "user-1", email: "x@y", aud: "not-staff", groups: ["guest"] },
    });
    const res = await app.inject({
      method: "GET",
      url: "/test/owner",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "wrong_audience" });
  });

  it("owner route + valid JWT with aud:staff → 200", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-1", email: "owner@dailytour", aud: "staff" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/test/owner",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, scope: "owner" });
  });

  it("owner route + valid JWT with groups:[staff] (no aud) → 200", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-2", email: "owner2@dailytour", groups: ["staff", "other"] },
    });
    const res = await app.inject({
      method: "GET",
      url: "/test/owner",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("owner route + signed by an unknown key (kid not in JWKS) → 401", async () => {
    const rogue = await makeAuthentikKeypair();
    const jwt = await signOwnerJwt({
      privateKey: rogue.privateKey,
      payload: { sub: "attacker", aud: "staff" },
      kid: "rogue-kid",
    });
    const res = await app.inject({
      method: "GET",
      url: "/test/owner",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  it("owner route + expired JWT (aud:staff) → 401 (expiry beats audience check)", async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-3", aud: "staff" },
      expSeconds: past,
    });
    const res = await app.inject({
      method: "GET",
      url: "/test/owner",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  it("guest route still works with the HS256 path (regression)", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const guestJwt = await new SignJWT({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("guest-fixture-jti")
      .setIssuedAt()
      .setExpirationTime(futureExp)
      .sign(GUEST_SIGNING_KEY);

    const res = await app.inject({
      method: "GET",
      url: "/test/guest",
      headers: { authorization: `Bearer ${guestJwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, scope: "guest" });
  });

  it("guest route rejects an Authentik (RS256) JWT — wrong issuer/algorithm", async () => {
    // Regression guard: owner JWTs must NOT be accepted on guest routes.
    // The HS256 verifier rejects RS256 signatures.
    const ownerJwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-x", aud: "staff" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/test/guest",
      headers: { authorization: `Bearer ${ownerJwt}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("public route bypasses both verifiers", async () => {
    const res = await app.inject({ method: "GET", url: "/test/public" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, scope: "public" });
  });

  it("owner-tagged kid present but token tampered → 401", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-4", aud: "staff" },
    });
    // Tamper with the payload (flip a base64url char) — signature breaks.
    const parts = jwt.split(".");
    const tampered = `${parts[0]}.${parts[1]}A.${parts[2]}`;
    const res = await app.inject({
      method: "GET",
      url: "/test/owner",
      headers: { authorization: `Bearer ${tampered}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("kid present check — sanity guard so future renames break loudly", () => {
    // Trips if someone renames TEST_OWNER_KID without updating the keypair
    // helper's protected header (signOwnerJwt defaults to TEST_OWNER_KID).
    expect(TEST_OWNER_KID).toMatch(/^test-/);
  });
});
