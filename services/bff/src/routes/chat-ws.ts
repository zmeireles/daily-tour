import { CHAT_JWT_SUBPROTOCOL } from "@daily-tour/shared-types";
import { jwtVerify, type JWTPayload } from "jose";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import { WebSocket as WSocket, type RawData } from "ws";
import { loadConfig } from "../config.js";
import { isJtiRevoked } from "../lib/redis.js";

// `socket` from @fastify/websocket is a `ws.WebSocket` instance — Node-style
// EventEmitter API (`socket.on('message', ...)`, `socket.close(code, reason)`).
type WsSocket = WSocket;

function chatHubWsUrlFor(httpUrl: string, clientId: string): string {
  const wsBase = httpUrl.replace(/^http(s?):/, (_match, s: string) => `ws${s}:`);
  return `${wsBase}/ws/${encodeURIComponent(clientId)}`;
}

/**
 * Read the guest JWT out of the `Sec-WebSocket-Protocol` handshake header.
 *
 * The client offers `["dt.jwt", "<jwt>"]` — see CHAT_JWT_SUBPROTOCOL for why
 * the credential travels as a subprotocol rather than as `?token=`. The header
 * arrives as a comma-separated list; Node collapses a repeated header into an
 * array, so handle both shapes.
 *
 * Returns "" unless the sentinel is present AND something follows it, so a
 * client that offers only the sentinel is unauthenticated rather than
 * authenticated-as-empty.
 */
function guestTokenFromSubprotocol(header: string | string[] | undefined): string {
  if (!header) return "";
  const offered = (Array.isArray(header) ? header.join(",") : header)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const sentinel = offered.indexOf(CHAT_JWT_SUBPROTOCOL);
  if (sentinel === -1) return "";
  return offered[sentinel + 1] ?? "";
}

async function authenticate(token: string, secret: string): Promise<JWTPayload | null> {
  if (!token) return null;
  const key = new TextEncoder().encode(secret);
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

function bridgeFrames(client: WsSocket, upstream: WsSocket, log: FastifyRequest["log"]): void {
  // ws delivers `data` as a Buffer regardless of frame type; the second arg
  // `isBinary` is the original frame's text/binary marker. Forward it through
  // explicitly so chat-hub's `websocket.receive_text()` doesn't crash with
  // KeyError('text') on what was actually a text frame relayed as binary.
  upstream.on("message", (data: RawData, isBinary: boolean) => {
    if (client.readyState === WSocket.OPEN) client.send(data, { binary: isBinary });
  });
  upstream.on("close", () => {
    if (client.readyState < WSocket.CLOSING) client.close();
  });
  upstream.on("error", (err: Error) => {
    log.warn({ err }, "[bff:chat-ws] upstream error");
    if (client.readyState < WSocket.CLOSING) client.close(1011, "upstream_error");
  });

  client.on("message", (data: RawData, isBinary: boolean) => {
    if (upstream.readyState === WSocket.OPEN) upstream.send(data, { binary: isBinary });
  });
  client.on("close", () => {
    if (upstream.readyState < WSocket.CLOSING) upstream.close();
  });
  client.on("error", (err: Error) => {
    log.warn({ err }, "[bff:chat-ws] client socket error");
    if (upstream.readyState < WSocket.CLOSING) upstream.close();
  });
}

const chatWsRoute: FastifyPluginAsync = (fastify: FastifyInstance) => {
  fastify.get("/v1/chat/ws", { websocket: true, config: { auth: "public" } }, (socket, req) => {
    const config = loadConfig();
    // Deliberately NOT `req.query.token`: that shape is gone, not merely
    // deprecated, so the credential cannot reach a log by the old path.
    const token = guestTokenFromSubprotocol(req.headers["sec-websocket-protocol"]);

    void (async () => {
      const claims = await authenticate(token, config.JWT_SIGNING_KEY);
      if (!claims?.sub) {
        socket.close(1008, "unauthorized");
        return;
      }
      if (claims.jti && (await isJtiRevoked(claims.jti))) {
        socket.close(1008, "revoked");
        return;
      }

      const url = chatHubWsUrlFor(config.CHAT_HUB_URL, claims.sub);
      req.log.info({ clientId: claims.sub }, "[bff:chat-ws] opening upstream connection");

      const upstream = new WSocket(url);
      bridgeFrames(socket, upstream, req.log);
    })();
  });

  return Promise.resolve();
};

export default chatWsRoute;
