import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import {
  ChatHubError,
  getChatHistory,
  listChatThreads,
  postHostReply,
} from "../lib/chat-client.js";

const GuestIdParamSchema = z.object({ guestId: z.string().uuid() });
const ReplyBodySchema = z.object({ body: z.string().min(1).max(2000) });

// Map chat-hub failures to the proxy's status: an upstream error status
// (ChatHubError) is a bad gateway (502); a raw fetch rejection (chat-hub
// unreachable) is service-unavailable (503). Mirrors how admin-reservations
// forwards token-svc errors as 502 while chat-history degrades to 503.
function replyChatHubError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof ChatHubError) {
    return reply.code(502).send({ error: "chat_hub_error" });
  }
  return reply.code(503).send({ error: "chat_unavailable" });
}

// eslint-disable-next-line @typescript-eslint/require-await
const adminChatRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // List every guest thread for the owner inbox — single-owner v1, no
  // owner_id filter (matches admin-reservations).
  fastify.get("/v1/admin/chat/threads", { config: { auth: "owner" } }, async (req, reply) => {
    try {
      return reply.code(200).send(await listChatThreads());
    } catch (err) {
      req.log.error({ err }, "[admin-chat] chat-hub threads error");
      return replyChatHubError(reply, err);
    }
  });

  // Owner read of a single guest's thread. Reuses the guest-side history
  // fetch — chat-hub keys history by guestId, so the owner path is identical.
  fastify.get(
    "/v1/admin/chat/:guestId/history",
    { config: { auth: "owner" } },
    async (req, reply) => {
      const parsed = GuestIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
      }
      try {
        return reply.code(200).send(await getChatHistory(parsed.data.guestId));
      } catch (err) {
        req.log.error({ err }, "[admin-chat] chat-hub history error");
        return replyChatHubError(reply, err);
      }
    },
  );

  // Host→guest reply. Forwards chat-hub's {id, ts, delivered} verbatim so the
  // backoffice can optimistically render the sent message.
  fastify.post(
    "/v1/admin/chat/:guestId/reply",
    { config: { auth: "owner" } },
    async (req, reply) => {
      const parsedParams = GuestIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply
          .code(400)
          .send({ error: "validation_failed", details: parsedParams.error.issues });
      }
      const parsedBody = ReplyBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "validation_failed", details: parsedBody.error.issues });
      }
      try {
        const result = await postHostReply(parsedParams.data.guestId, parsedBody.data.body);
        return reply.code(200).send(result);
      } catch (err) {
        req.log.error({ err }, "[admin-chat] chat-hub reply error");
        return replyChatHubError(reply, err);
      }
    },
  );
};

export default adminChatRoute;
