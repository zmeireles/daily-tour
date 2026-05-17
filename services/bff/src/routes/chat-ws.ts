import { jwtVerify } from "jose";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { loadConfig } from "../config.js";
import { isJtiRevoked } from "../lib/redis.js";

interface JwtClaims {
  sub?: string;
  jti?: string;
}

// eslint-disable-next-line @typescript-eslint/require-await
const chatWsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/v1/chat/ws",
    { websocket: true, config: { auth: "public" } },
    function wsHandler(socket, req) {
      const config = loadConfig();
      const query = req.query as Record<string, string>;
      const token = query["token"] ?? "";

      if (!token) {
        socket.close(1008, "unauthorized");
        return;
      }

      const key = new TextEncoder().encode(config.JWT_SIGNING_KEY);
      jwtVerify(token, key, { algorithms: ["HS256"] })
        .then(async ({ payload }) => {
          const claims = payload as JwtClaims;
          if (!claims.sub) {
            socket.close(1008, "unauthorized");
            return;
          }

          if (claims.jti && (await isJtiRevoked(claims.jti))) {
            socket.close(1008, "revoked");
            return;
          }

          const clientId = claims.sub;
          const chatHubWsUrl =
            config.CHAT_HUB_URL.replace(/^http(s?):/, (_: string, s: string) => `ws${s ?? ""}:`) +
            `/ws/${clientId}`;

          req.log.info({ clientId }, "[bff:chat-ws] opening upstream connection");

          const upstream = new WebSocket(chatHubWsUrl);

          upstream.addEventListener("message", (evt) => {
            if (socket.readyState === 1 /* OPEN */) {
              socket.send(evt.data as string);
            }
          });

          upstream.addEventListener("close", () => {
            if (socket.readyState < 2) socket.close();
          });

          upstream.addEventListener("error", () => {
            req.log.warn({ clientId }, "[bff:chat-ws] upstream error");
            if (socket.readyState < 2) socket.close(1011, "upstream_error");
          });

          socket.on("message", (data: unknown) => {
            if (upstream.readyState === WebSocket.OPEN) {
              upstream.send(data instanceof Buffer ? data.toString("utf-8") : String(data));
            }
          });

          socket.on("close", () => {
            if (upstream.readyState < 2) upstream.close();
          });

          socket.on("error", (err: Error) => {
            req.log.warn({ err, clientId }, "[bff:chat-ws] client socket error");
            if (upstream.readyState < 2) upstream.close();
          });
        })
        .catch(() => {
          socket.close(1008, "unauthorized");
        });
    },
  );
};

export default chatWsRoute;
