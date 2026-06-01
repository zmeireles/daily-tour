import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createTourPlan, getTourPlan, PlannerError } from "../lib/planner-client.js";
import { withStops } from "../lib/tour-plan-view.js";

const CreatePlanBodySchema = z.object({
  wishes: z.array(z.string().min(1)).min(1).max(20),
  duration_hours: z.coerce.number().int().min(1).max(12),
  vehicle: z.enum(["car", "bike", "walking", "bus"]),
  free_text: z.string().max(1000).optional(),
});

const UUIDParamSchema = z.object({
  planId: z.string().uuid(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const tourPlansRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/v1/tour-plans", async (req, reply) => {
    const parsed = CreatePlanBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }

    const { sub: guestId, rid: reservationId } = req.user as { sub: string; rid?: string };

    try {
      const plan = await createTourPlan({
        guestId,
        reservationId,
        requestPayload: parsed.data,
      });
      return reply.code(201).send(plan);
    } catch (err) {
      if (err instanceof PlannerError) {
        req.log.error({ err }, "[bff:tour-plans] planner-svc error on create");
        return reply.code(503).send({ error: "planner_unavailable" });
      }
      throw err;
    }
  });

  fastify.get("/v1/tour-plans/:planId", async (req, reply) => {
    const parsed = UUIDParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_plan_id" });
    }

    try {
      const plan = await getTourPlan(parsed.data.planId);
      if (!plan) {
        return reply.code(404).send({ error: "not_found" });
      }
      return plan.status === "ready" ? await withStops(plan) : plan;
    } catch (err) {
      if (err instanceof PlannerError) {
        req.log.error({ err }, "[bff:tour-plans] planner-svc error on get");
        return reply.code(503).send({ error: "planner_unavailable" });
      }
      throw err;
    }
  });
};

export default tourPlansRoute;
