import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createTourPlan, getTourPlan, PlannerError } from "../lib/planner-client.js";
import { guestKeyGenerator } from "../lib/rate-limit-keys.js";
import { withStops } from "../lib/tour-plan-view.js";

const CreatePlanBodySchema = z.object({
  wishes: z.array(z.string().min(1).max(120)).min(1).max(20),
  duration_hours: z.coerce.number().int().min(1).max(12),
  vehicle: z.enum(["car", "bike", "walking", "bus"]),
  free_text: z.string().max(1000).optional(),
});

const UUIDParamSchema = z.object({
  planId: z.string().uuid(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const tourPlansRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // T-3.C.3 — this is the real Anthropic-spend path. Cap at 5/min PER GUEST
  // (keyed off the JWT `sub` via guestKeyGenerator — see lib/rate-limit-keys.ts
  // for the hook-ordering reason the keyGenerator decodes the bearer itself).
  // bodyLimit rejects oversized intake (>16 KB) with a 413 before any LLM call.
  // Known limitation: the limiter store is in-memory per-process — fine for the
  // single-BFF F&F beta, but per-guest caps won't be shared if the BFF scales
  // horizontally (would need the Redis store then).
  fastify.post(
    "/v1/tour-plans",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute", keyGenerator: guestKeyGenerator },
      },
      bodyLimit: 16384, // 16 KB → 413 on oversized intake
    },
    async (req, reply) => {
      const parsed = CreatePlanBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
      }

      const {
        sub: guestId,
        rid: reservationId,
        locale,
      } = req.user as { sub: string; rid?: string; locale?: string };

      try {
        const plan = await createTourPlan({
          guestId,
          reservationId,
          locale,
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
    },
  );

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
      const { locale } = req.user as { locale?: string };
      return plan.status === "ready" ? await withStops(plan, locale) : plan;
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
