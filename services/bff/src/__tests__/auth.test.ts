import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
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

// Mock token-svc HTTP client at the boundary — the point of these tests is
// the BFF's behaviour, not token-svc's (covered end-to-end in T-1.0.1).
vi.mock("../lib/token-svc-client.js", () => {
  return {
    TokenExchangeError: class TokenExchangeError extends Error {
      constructor(
        public readonly status: number,
        message: string,
      ) {
        super(message);
      }
    },
    exchangeOpaqueToken: vi.fn(),
  };
});

const tokenSvcClient = await import("../lib/token-svc-client.js");
const exchangeMock = tokenSvcClient.exchangeOpaqueToken as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);

const FIXTURE_JTI = "fixture-jti-1234567890abcdef";

async function signJwt(payload: Record<string, unknown>, expSeconds: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(FIXTURE_JTI)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(SIGNING_KEY_BYTES);
}

describe("BFF auth flow", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    app = await createApp();
    // Register a test-only authed route. The onRoute hook in auth.ts auto-
    // attaches fastify.authenticate as a preHandler.
    app.get("/test/protected", () => ({ ok: true }));
    await app.ready();
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    exchangeMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("happy path — /r/:token exchanges + returns JWT + sets dt_refresh cookie", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    exchangeMock.mockResolvedValueOnce({ jwt, exp: futureExp });

    const res = await app.inject({ method: "GET", url: "/r/opaque-token-abc" });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ jwt: string; exp: number }>();
    expect(body.jwt).toBe(jwt);
    expect(body.exp).toBe(futureExp);

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeTruthy();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("\n") : String(setCookie);
    expect(cookieStr).toContain("dt_refresh=");
    expect(cookieStr.toLowerCase()).toContain("httponly");
    expect(cookieStr.toLowerCase()).toContain("samesite=lax");

    // jti should be cached active.
    const active = await ctx.client.exists(`jti:active:${FIXTURE_JTI}`);
    expect(active).toBe(1);
  });

  it("subsequent authed request with valid JWT — 200 (cache miss is the default-allow path)", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);

    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("revoked JTI in Redis — authed request returns 401", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);

    // Simulate the n8n-driven revocation event.
    await ctx.client.set(`jti:revoked:${FIXTURE_JTI}`, "1", "EX", 60);

    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "revoked" });
  });

  it("unknown opaque on /r/:token — 302 redirect to /?reason=expired", async () => {
    const { TokenExchangeError } = await import("../lib/token-svc-client.js");
    exchangeMock.mockRejectedValueOnce(new TokenExchangeError(401, "invalid_token"));

    const res = await app.inject({ method: "GET", url: "/r/unknown-opaque" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/?reason=expired");
  });

  it("expired JWT on authed route — 401", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const jwt = await signJwt({ sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" }, pastExp);

    const res = await app.inject({
      method: "GET",
      url: "/test/protected",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  describe("GET /v1/auth/refresh", () => {
    it("happy path — cookie present, returns fresh JWT + re-sets cookie", async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const jwt = await signJwt(
        { sub: "guest", rid: "res-1", gh: "gh-1", locale: "en" },
        futureExp,
      );
      exchangeMock.mockResolvedValueOnce({ jwt, exp: futureExp });

      const res = await app.inject({
        method: "GET",
        url: "/v1/auth/refresh",
        cookies: { dt_refresh: "opaque-abc-123" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ jwt: string; exp: number }>()).toEqual({ jwt, exp: futureExp });
      expect(exchangeMock).toHaveBeenCalledWith("opaque-abc-123");

      const setCookie = res.headers["set-cookie"];
      const cookieStr = Array.isArray(setCookie) ? setCookie.join("\n") : String(setCookie);
      expect(cookieStr).toContain("dt_refresh=opaque-abc-123");
      expect(cookieStr.toLowerCase()).toContain("httponly");

      // jti cached active.
      const active = await ctx.client.exists(`jti:active:${FIXTURE_JTI}`);
      expect(active).toBe(1);
    });

    it("no cookie — 401 no_refresh_cookie", async () => {
      const res = await app.inject({ method: "GET", url: "/v1/auth/refresh" });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: "no_refresh_cookie" });
      expect(exchangeMock).not.toHaveBeenCalled();
    });

    it("stale opaque (token-svc 401) — 401 invalid_refresh + clears cookie", async () => {
      const { TokenExchangeError } = await import("../lib/token-svc-client.js");
      exchangeMock.mockRejectedValueOnce(new TokenExchangeError(401, "invalid_token"));

      const res = await app.inject({
        method: "GET",
        url: "/v1/auth/refresh",
        cookies: { dt_refresh: "stale-opaque" },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: "invalid_refresh" });

      // Cookie must be cleared (sentinel: Expires in the past or Max-Age=0).
      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeTruthy();
      const cookieStr = Array.isArray(setCookie) ? setCookie.join("\n") : String(setCookie);
      expect(cookieStr).toContain("dt_refresh=");
      expect(cookieStr.toLowerCase()).toMatch(/expires=thu, 01 jan 1970|max-age=0/);
    });

    it("token-svc unavailable — propagates as 5xx (not 401)", async () => {
      const { TokenExchangeError } = await import("../lib/token-svc-client.js");
      exchangeMock.mockRejectedValueOnce(new TokenExchangeError(503, "token-svc 503"));

      const res = await app.inject({
        method: "GET",
        url: "/v1/auth/refresh",
        cookies: { dt_refresh: "opaque-xyz" },
      });

      // Don't pin the exact 5xx code — Fastify's default handler echoes the
      // error's .status (503 here). What matters: it's NOT 401 (which would
      // silently clear the cookie and degrade the user to public landing on
      // a transient backend failure) and NOT 2xx.
      expect(res.statusCode).toBeGreaterThanOrEqual(500);
      expect(res.statusCode).toBeLessThan(600);
    });
  });
});
