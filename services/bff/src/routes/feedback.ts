import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { insertGuestFeedback } from "../lib/analytics-db.js";

const BodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const feedbackRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/v1/feedback", async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }

    const guestId = (req.user as { sub: string }).sub;

    try {
      await insertGuestFeedback({
        guestId,
        rating: parsed.data.rating,
        text: parsed.data.text ?? null,
      });
      return reply.code(204).send();
    } catch (err) {
      req.log.error({ err }, "[bff:feedback] failed to insert guest feedback");
      return reply.code(500).send({ error: "internal_error" });
    }
  });
};

export default feedbackRoute;
