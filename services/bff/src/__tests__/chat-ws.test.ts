/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";

// Set env before any imports — config validates on first load.
process.env.JWT_SIGNING_KEY = "test-signing-key-do-not-use-min-32-chars-long";
process.env.REDIS_URL = "redis://127.0.0.1:1/0"; // never called in these auth-rejection cases
process.env.TOKEN_SVC_URL = "http://localhost:1";
process.env.CHAT_HUB_URL = "http://localhost:1"; // never called — auth rejected first
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "warn";
process.env.PORT = "0";

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");

const TEST_JWT_KEY = "test-signing-key-do-not-use-min-32-chars-long";

async function waitForClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.addEventListener("close", (evt) => resolve({ code: evt.code, reason: evt.reason }));
    ws.addEventListener("error", () => resolve({ code: 1006, reason: "network error" }));
  });
}

describe("GET /v1/chat/ws", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let port: number;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    port = parseInt(new URL(address).port, 10);
  });

  afterAll(async () => {
    await app.close();
  });

  it("closes 1008 when no token query param is provided", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/v1/chat/ws`);
    const { code } = await waitForClose(ws);
    expect(code).toBe(1008);
  });

  it("closes 1008 when token has an invalid signature", async () => {
    const wrongKey = new TextEncoder().encode("wrong-key-for-testing-purposes-min-32-chars!!!");
    const badToken = await new SignJWT({ sub: "guest-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(wrongKey);

    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/v1/chat/ws?token=${encodeURIComponent(badToken)}`,
    );
    const { code } = await waitForClose(ws);
    expect(code).toBe(1008);
  });
});
