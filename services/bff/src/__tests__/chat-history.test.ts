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

vi.mock("../lib/chat-client.js", () => ({
  ChatHubError: class ChatHubError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "ChatHubError";
    }
  },
  getChatHistory: vi.fn(),
}));

const chatClient = await import("../lib/chat-client.js");
const getHistoryMock = chatClient.getChatHistory as ReturnType<typeof vi.fn>;
const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

const SIGNING_KEY_BYTES = new TextEncoder().encode(TEST_JWT_KEY);
const FIXTURE_JTI = "chat-history-test-jti-abcdef1234567890";
const GUEST_ID = "aaaabbbb-0000-4000-8000-000000000002";

async function signJwt(payload: Record<string, unknown>, expSeconds: number): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(FIXTURE_JTI)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(SIGNING_KEY_BYTES);
}

describe("GET /v1/chat/history", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    process.env.CHAT_HUB_URL = "http://localhost:1";
    app = await createApp();
    await app.ready();
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    getHistoryMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  it("happy path — proxies guest history keyed by the JWT sub", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    const messages = [
      {
        id: "m1",
        channel: "in_app",
        sender_id: GUEST_ID,
        direction: "inbound",
        body: "hi",
        ts: "t",
      },
    ];
    getHistoryMock.mockResolvedValueOnce({ messages });

    const res = await app.inject({
      method: "GET",
      url: "/v1/chat/history",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ messages });
    expect(getHistoryMock).toHaveBeenCalledOnce();
    expect(getHistoryMock.mock.calls[0]![0]).toBe(GUEST_ID);
  });

  it("unauthenticated — 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/chat/history" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "unauthorized" });
  });

  it("chat-hub error — BFF returns 503", async () => {
    const { ChatHubError } = await import("../lib/chat-client.js");
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = await signJwt({ sub: GUEST_ID, rid: "res-1", gh: "gh-1", locale: "en" }, futureExp);
    getHistoryMock.mockRejectedValueOnce(new ChatHubError(500, "internal error"));

    const res = await app.inject({
      method: "GET",
      url: "/v1/chat/history",
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "chat_unavailable" });
  });
});
