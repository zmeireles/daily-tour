import fastifyJwt from "@fastify/jwt";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guestKeyGenerator } from "../lib/rate-limit-keys.js";

const SIGNING_KEY = "test-signing-key-do-not-use-min-32-chars-long";
const SIGNING_KEY_BYTES = new TextEncoder().encode(SIGNING_KEY);
const GUEST_ID = "aaaabbbb-0000-4000-8000-000000000099";

/**
 * The keyGenerator reaches into `req.server.jwt.decode`. A minimal Fastify
 * instance with @fastify/jwt registered gives us a real decode implementation
 * without standing up the whole BFF app.
 */
async function signJwt(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti("rl-keys-test-jti-abcdef1234567890ab")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(SIGNING_KEY_BYTES);
}

/** Build a FastifyRequest-shaped stub backed by a real fastify-jwt instance. */
function makeReq(app: FastifyInstance, authorization?: string): FastifyRequest {
  return {
    server: app,
    ip: "203.0.113.7",
    headers: authorization ? { authorization } : {},
  } as unknown as FastifyRequest;
}

describe("guestKeyGenerator", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(fastifyJwt, { secret: SIGNING_KEY });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("valid bearer token → returns the guest `sub` claim", async () => {
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "pt-PT" });
    const key = guestKeyGenerator(makeReq(app, `Bearer ${jwt}`));
    expect(key).toBe(GUEST_ID);
  });

  it("no Authorization header → falls back to req.ip", () => {
    const key = guestKeyGenerator(makeReq(app));
    expect(key).toBe("203.0.113.7");
  });

  it("garbage token → falls back to req.ip (never throws)", () => {
    const key = guestKeyGenerator(makeReq(app, "Bearer not-a-real-jwt"));
    expect(key).toBe("203.0.113.7");
  });

  it("non-Bearer Authorization scheme → falls back to req.ip", () => {
    const key = guestKeyGenerator(makeReq(app, "Basic dXNlcjpwYXNz"));
    expect(key).toBe("203.0.113.7");
  });

  it("token without a `sub` claim → falls back to req.ip", async () => {
    const jwt = await signJwt({ rid: "res-1", gh: "gh-1", locale: "en" });
    const key = guestKeyGenerator(makeReq(app, `Bearer ${jwt}`));
    expect(key).toBe("203.0.113.7");
  });
});
