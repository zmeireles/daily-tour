import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { insertTourEvent } from "../lib/analytics-db.js";

const BodySchema = z.object({
  event_type: z.enum(["tour.started", "tour.completed"]),
  plan_id: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const telemetryRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/v1/telemetry/tour", async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }

    const guestId = (req.user as { sub: string }).sub;

    try {
      await insertTourEvent({
        eventType: parsed.data.event_type,
        planId: parsed.data.plan_id ?? null,
        guestId,
        payload: parsed.data.payload,
      });
      return reply.code(204).send();
    } catch (err) {
      req.log.error({ err }, "[bff:telemetry] failed to insert tour event");
      return reply.code(500).send({ error: "internal_error" });
    }
  });
};

export default telemetryRoute;
