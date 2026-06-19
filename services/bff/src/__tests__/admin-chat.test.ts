import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet } from "jose";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminChatRoute from "../routes/admin-chat.js";
import {
  type AuthentikTestKeypair,
  makeAuthentikKeypair,
  signOwnerJwt,
} from "./authentik-keypair.js";
import {
  type TestRedisCtx,
  flushRedis,
  setTestEnv,
  startTestRedis,
  stopTestRedis,
} from "./helpers.js";

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);
process.env.CHAT_HUB_URL = "http://chat-hub.test";

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const GUEST_ID = "aaaabbbb-0000-4000-8000-000000000002";
const REPLY = { id: "msg-1", ts: "2026-06-19T10:00:00Z", delivered: true };
const THREADS = [
  {
    guest_id: GUEST_ID,
    last_body: "see you soon",
    last_ts: "2026-06-19T09:55:00Z",
    updated_at: "2026-06-19T09:55:00Z",
  },
];
const HISTORY = {
  messages: [
    {
      id: "m1",
      channel: "in_app",
      sender_id: GUEST_ID,
      direction: "inbound",
      body: "hi",
      ts: "2026-06-19T09:00:00Z",
    },
  ],
};

async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });
  await app.register(adminChatRoute);
  await app.ready();
  return app;
}

describe("BFF admin-chat routes", () => {
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
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  async function ownerToken(): Promise<string> {
    return signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-uuid-1", aud: "staff" },
    });
  }

  // --- owner gating: no token / guest (non-staff) token rejected ---

  it("GET threads — no auth → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/admin/chat/threads" });
    expect(res.statusCode).toBe(401);
  });

  it("GET history — no auth → 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/admin/chat/${GUEST_ID}/history`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST reply — no auth → 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/chat/${GUEST_ID}/reply`,
      payload: { body: "hello" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST reply — non-staff (wrong audience) token → 403", async () => {
    const jwt = await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "guest-uuid-1", aud: "guest" },
    });
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/chat/${GUEST_ID}/reply`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: { body: "hello" },
    });
    expect(res.statusCode).toBe(403);
  });

  // --- owner happy paths ---

  it("GET threads — valid owner JWT → 200 array forwarded verbatim", async () => {
    const jwt = await ownerToken();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(THREADS),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/chat/threads",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(THREADS);
    expect(fetchMock.mock.calls[0]![0]).toBe("http://chat-hub.test/v1/threads");
  });

  it("GET history — valid owner JWT → 200 history forwarded", async () => {
    const jwt = await ownerToken();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(HISTORY) }),
    );

    const res = await app.inject({
      method: "GET",
      url: `/v1/admin/chat/${GUEST_ID}/history`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(HISTORY);
  });

  it("POST reply — valid owner JWT → 200 forwarding {id,ts,delivered}", async () => {
    const jwt = await ownerToken();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(REPLY),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/chat/${GUEST_ID}/reply`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: { body: "on my way" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(REPLY);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://chat-hub.test/v1/reply/${GUEST_ID}`);
    expect((init as { method: string }).method).toBe("POST");
    expect(JSON.parse((init as { body: string }).body)).toEqual({ body: "on my way" });
  });

  // --- validation ---

  it("GET history — non-uuid guestId → 400", async () => {
    const jwt = await ownerToken();
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/chat/not-a-uuid/history",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "validation_failed" });
  });

  it("POST reply — non-uuid guestId → 400", async () => {
    const jwt = await ownerToken();
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/chat/not-a-uuid/reply",
      headers: { authorization: `Bearer ${jwt}` },
      payload: { body: "hello" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "validation_failed" });
  });

  it("POST reply — empty body → 400 (zod)", async () => {
    const jwt = await ownerToken();
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/chat/${GUEST_ID}/reply`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: { body: "" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "validation_failed" });
  });

  // --- upstream failure mapping ---

  it("POST reply — chat-hub error status → 502", async () => {
    const jwt = await ownerToken();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );

    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/chat/${GUEST_ID}/reply`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: { body: "hello" },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "chat_hub_error" });
  });

  it("GET threads — chat-hub unreachable (fetch rejects) → 503", async () => {
    const jwt = await ownerToken();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/chat/threads",
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "chat_unavailable" });
  });
});
