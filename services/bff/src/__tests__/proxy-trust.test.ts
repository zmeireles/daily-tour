import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestRedisCtx, setTestEnv, startTestRedis, stopTestRedis } from "./helpers.js";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

/**
 * The global limiter (app.ts) keys on `req.ip`, so how `req.ip` is derived from
 * `X-Forwarded-For` decides whether a caller can choose their own bucket.
 *
 * `app.inject` presents a socket address of 127.0.0.1, which stands in for the
 * proxy hop. With a MULTI-entry header the two settings diverge, and that is
 * what makes this testable at all:
 *
 *   header "spoofed, real"   trustProxy: true -> "spoofed"   (caller wins)
 *                            trustProxy: 1    -> "real"      (proxy wins)
 *
 * A single-entry header resolves identically under both, so a test written with
 * one entry would pass no matter which setting is live. That is worth knowing
 * before "simplifying" these fixtures.
 *
 * Requests here are deliberately unauthenticated: the limiter runs in
 * `onRequest`, strictly before auth's `preHandler`, so an unauthenticated
 * request is still counted and answers 401 until the cap is reached.
 */
const GLOBAL_MAX = 200; // app.ts: { max: 200, timeWindow: "1 minute" }
const PLACE_URL = "/v1/places/c0000001-0000-4000-a000-000000000001";

describe("reverse-proxy trust scope", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  function get(forwardedFor: string) {
    return app.inject({
      method: "GET",
      url: PLACE_URL,
      headers: { "x-forwarded-for": forwardedFor },
    });
  }

  it("ignores a caller-supplied prefix: varying it does not mint new buckets", async () => {
    // Same real client throughout; only the part the CALLER controls varies.
    // If that part reached the limiter key, each request would land in its own
    // bucket and no 429 could ever occur.
    let sawThrottle = false;
    for (let i = 0; i <= GLOBAL_MAX; i++) {
      const res = await get(`198.51.100.${(i % 254) + 1}, 203.0.113.10`);
      if (res.statusCode === 429) {
        sawThrottle = true;
        break;
      }
      expect(res.statusCode).toBe(401); // counted by the limiter, then rejected by auth
    }
    expect(sawThrottle).toBe(true);
  });

  it("still separates genuinely different clients (no collapse into one bucket)", async () => {
    // The opposite failure mode of the one above: over-tightening trust makes
    // `req.ip` the proxy's own address for everyone, so one noisy client would
    // throttle the whole site. A different real client must still be served.
    const res = await get("198.51.100.77, 203.0.113.99");
    expect(res.statusCode).toBe(401);
    expect(res.statusCode).not.toBe(429);
  });
});
