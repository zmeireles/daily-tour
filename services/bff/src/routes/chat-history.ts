import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ChatHubError, getChatHistory } from "../lib/chat-client.js";

// eslint-disable-next-line @typescript-eslint/require-await
const chatHistoryRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Guest-authed (default onRoute hook). Reads the guest's persisted chat
  // thread so the PWA can re-hydrate after a reload (UAT-G08 step 5). guestId
  // comes from the JWT `sub` — the same identity the chat-ws bridge uses.
  fastify.get("/v1/chat/history", async (req, reply) => {
    const guestId = (req.user as { sub: string }).sub;

    try {
      const history = await getChatHistory(guestId);
      return reply.send(history);
    } catch (err) {
      if (err instanceof ChatHubError) {
        req.log.error({ err }, "[bff:chat-history] chat-hub error on history fetch");
        return reply.code(503).send({ error: "chat_unavailable" });
      }
      throw err;
    }
  });
};

export default chatHistoryRoute;
