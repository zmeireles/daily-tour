import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getTourPlan, PlannerError } from "../lib/planner-client.js";
import { withStops } from "../lib/tour-plan-view.js";

const UUIDParamSchema = z.object({
  planId: z.string().uuid(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const publicTourPlansRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/v1/public/tour-plans/:planId",
    { config: { auth: "public" } },
    async (req, reply) => {
      const parsed = UUIDParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_plan_id" });
      }

      try {
        const plan = await getTourPlan(parsed.data.planId);
        if (!plan || plan.status !== "ready") {
          return reply.code(404).send({ error: "not_found" });
        }
        const enriched = await withStops(plan);
        return { id: enriched.id, status: enriched.status, plan_payload: enriched.plan_payload };
      } catch (err) {
        if (err instanceof PlannerError) {
          req.log.error({ err }, "[bff:public-tour-plans] planner-svc error");
          return reply.code(503).send({ error: "planner_unavailable" });
        }
        throw err;
      }
    },
  );
};

export default publicTourPlansRoute;
