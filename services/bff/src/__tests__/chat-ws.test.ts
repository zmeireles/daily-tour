import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { CHAT_JWT_SUBPROTOCOL } from "@daily-tour/shared-types";
import { WebSocket as WSocket, WebSocketServer } from "ws";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

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

  it("closes with 1008 when no subprotocol is offered", async () => {
    const client = new WSocket(`ws://127.0.0.1:${port}/v1/chat/ws`);
    const info = await waitForClose(client);
    expect(info.code).toBe(1008);
    expect(info.reason).toBe("unauthorized");
  });

  it("closes with 1008 when the sentinel is offered with no token after it", async () => {
    const client = new WSocket(`ws://127.0.0.1:${port}/v1/chat/ws`, [CHAT_JWT_SUBPROTOCOL]);
    const info = await waitForClose(client);
    expect(info.code).toBe(1008);
    expect(info.reason).toBe("unauthorized");
  });

  it("REJECTS a valid token supplied the old way, as `?token=` in the URL", async () => {
    // The query-string shape is gone, not deprecated. It put a live bearer
    // credential into the BFF request log and into Traefik's access log —
    // whose `RequestPath` field includes the query string, with no redaction
    // available at that layer (D15: a token is never echoed in logs).
    //
    // A route that still ACCEPTED this would keep the leak reachable by any
    // client that had not been updated, so the rejection is the fix, and this
    // test is what stops it being quietly restored.
    const signingKey = new TextEncoder().encode(SIGNING_KEY);
    const validToken = await new SignJWT({ sub: "guest-old-shape" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(signingKey);

    const client = new WSocket(
      `ws://127.0.0.1:${port}/v1/chat/ws?token=${encodeURIComponent(validToken)}`,
    );
    const info = await waitForClose(client);
    expect(info.code).toBe(1008);
    expect(info.reason).toBe("unauthorized");
  });

  it("ACCEPTS the same token offered as a subprotocol (control: the token is good)", async () => {
    // Without this, the rejection above would also pass if the route rejected
    // everything — including a correctly-offered credential.
    const signingKey = new TextEncoder().encode(SIGNING_KEY);
    const validToken = await new SignJWT({ sub: "guest-new-shape" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(signingKey);

    const client = new WSocket(`ws://127.0.0.1:${port}/v1/chat/ws`, [
      CHAT_JWT_SUBPROTOCOL,
      validToken,
    ]);
    const opened = await new Promise<boolean>((resolve) => {
      client.on("open", () => resolve(true));
      client.on("close", () => resolve(false));
      client.on("error", () => resolve(false));
    });
    expect(opened).toBe(true);
    // The server must echo the sentinel only — never the credential.
    expect(client.protocol).toBe(CHAT_JWT_SUBPROTOCOL);
    expect(client.protocol).not.toContain(validToken);
    client.close();
  });

  it("closes with 1008 when the token signature is invalid", async () => {
    const wrongKey = new TextEncoder().encode("wrong-key-for-testing-purposes-min-32-chars!!");
    const badToken = await new SignJWT({ sub: "guest-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(wrongKey);

    const client = new WSocket(`ws://127.0.0.1:${port}/v1/chat/ws`, [
      CHAT_JWT_SUBPROTOCOL,
      badToken,
    ]);
    const info = await waitForClose(client);
    expect(info.code).toBe(1008);
    expect(info.reason).toBe("unauthorized");

    // Sanity-check that the test key isn't masquerading as the real one.
    const realKey = new TextEncoder().encode(SIGNING_KEY);
    expect(wrongKey).not.toEqual(realKey);
  });
});

describe("GET /v1/chat/ws — frame forwarding (regression)", () => {
  // Regression for the chat-hub `KeyError('text')` crash that broke UAT-G08
  // (2026-05-30): the bridge forwarded text frames as binary because it
  // called `upstream.send(data)` on a Buffer without the `{ binary: false }`
  // hint, so ws defaulted to a binary frame. chat-hub's
  // starlette `websocket.receive_text()` then crashed.

  let app: Awaited<ReturnType<typeof import("../app.js").createApp>>;
  let bffPort: number;
  let upstreamServer: ReturnType<typeof createServer>;
  let upstreamWss: WebSocketServer;
  let upstreamPort: number;
  const received: { isBinary: boolean; payload: string }[] = [];

  beforeAll(async () => {
    // Stand up a fake chat-hub that captures incoming frame types.
    upstreamServer = createServer();
    upstreamWss = new WebSocketServer({ server: upstreamServer });
    upstreamWss.on("connection", (ws) => {
      ws.on("message", (data: Buffer, isBinary: boolean) => {
        received.push({ isBinary, payload: data.toString("utf-8") });
      });
    });
    await new Promise<void>((resolve) => upstreamServer.listen(0, "127.0.0.1", resolve));
    upstreamPort = (upstreamServer.address() as AddressInfo).port;

    process.env["CHAT_HUB_URL"] = `http://127.0.0.1:${upstreamPort}`;
    const { resetConfigCache: reset } = await import("../config.js");
    reset();
    const { createApp } = await import("../app.js");
    app = await createApp();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    bffPort = Number.parseInt(new URL(address).port, 10);
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => {
      upstreamWss.close(() => resolve());
    });
    await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));
  });

  it("forwards text frames to upstream as text (not binary)", async () => {
    const signingKey = new TextEncoder().encode(SIGNING_KEY);
    const token = await new SignJWT({ sub: "guest-frame-test" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(signingKey);

    // Wait for the BFF's upstream connection to open BEFORE sending — the
    // bridge drops messages when upstream isn't OPEN yet, so a naive
    // client-open-then-send race-loses against the BFF's async auth + upstream
    // dial.
    const upstreamReady = new Promise<void>((resolve) => {
      upstreamWss.once("connection", () => resolve());
    });

    const client = new WSocket(`ws://127.0.0.1:${bffPort}/v1/chat/ws`, [
      CHAT_JWT_SUBPROTOCOL,
      token,
    ]);
    await new Promise<void>((resolve, reject) => {
      client.on("open", resolve);
      client.on("error", reject);
    });
    await upstreamReady;

    received.length = 0;
    client.send("hello");

    // Wait for the upstream to receive + record the frame.
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = (): void => {
        if (received.length > 0 || Date.now() - start > 1000) return resolve();
        setTimeout(tick, 10);
      };
      tick();
    });

    client.close();

    expect(received).toHaveLength(1);
    expect(received[0]?.isBinary).toBe(false);
    expect(received[0]?.payload).toBe("hello");
  });
});
