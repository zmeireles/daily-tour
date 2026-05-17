import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { WebSocket as WSocket } from "ws";

// Env MUST be set before any app import — config validates on first load.
process.env["JWT_SIGNING_KEY"] = "test-signing-key-do-not-use-min-32-chars-long";
process.env["REDIS_URL"] = "redis://127.0.0.1:1/0";
process.env["TOKEN_SVC_URL"] = "http://localhost:1";
process.env["CHAT_HUB_URL"] = "http://localhost:1";
process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "warn";
process.env["PORT"] = "8080";

const { createApp } = await import("../app.js");
const { resetConfigCache } = await import("../config.js");

const SIGNING_KEY = "test-signing-key-do-not-use-min-32-chars-long";

interface CloseInfo {
  code: number;
  reason: string;
}

function waitForClose(client: WSocket): Promise<CloseInfo> {
  return new Promise<CloseInfo>((resolve) => {
    client.on("close", (code: number, reason: Buffer) => {
      resolve({ code, reason: reason.toString("utf-8") });
    });
    client.on("error", () => {
      resolve({ code: 1006, reason: "network error" });
    });
  });
}

describe("GET /v1/chat/ws", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let port: number;

  beforeAll(async () => {
    resetConfigCache();
    app = await createApp();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    port = Number.parseInt(new URL(address).port, 10);
  });

  afterAll(async () => {
    await app.close();
  });

  it("closes with 1008 when no token query param is provided", async () => {
    const client = new WSocket(`ws://127.0.0.1:${port}/v1/chat/ws`);
    const info = await waitForClose(client);
    expect(info.code).toBe(1008);
    expect(info.reason).toBe("unauthorized");
  });

  it("closes with 1008 when the token signature is invalid", async () => {
    const wrongKey = new TextEncoder().encode("wrong-key-for-testing-purposes-min-32-chars!!");
    const badToken = await new SignJWT({ sub: "guest-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(wrongKey);

    const client = new WSocket(
      `ws://127.0.0.1:${port}/v1/chat/ws?token=${encodeURIComponent(badToken)}`,
    );
    const info = await waitForClose(client);
    expect(info.code).toBe(1008);
    expect(info.reason).toBe("unauthorized");

    // Sanity-check that the test key isn't masquerading as the real one.
    const realKey = new TextEncoder().encode(SIGNING_KEY);
    expect(wrongKey).not.toEqual(realKey);
  });
});
