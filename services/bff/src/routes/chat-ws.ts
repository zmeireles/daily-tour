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
  upstream.on("message", (data: RawData) => {
    if (client.readyState === WSocket.OPEN) client.send(data);
  });
  upstream.on("close", () => {
    if (client.readyState < WSocket.CLOSING) client.close();
  });
  upstream.on("error", (err: Error) => {
    log.warn({ err }, "[bff:chat-ws] upstream error");
    if (client.readyState < WSocket.CLOSING) client.close(1011, "upstream_error");
  });

  client.on("message", (data: RawData) => {
    if (upstream.readyState === WSocket.OPEN) upstream.send(data);
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
  fastify.get<{ Querystring: { token?: string } }>(
    "/v1/chat/ws",
    { websocket: true, config: { auth: "public" } },
    (socket, req) => {
      const config = loadConfig();
      const token = req.query.token ?? "";

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
    },
  );

  return Promise.resolve();
};

export default chatWsRoute;
