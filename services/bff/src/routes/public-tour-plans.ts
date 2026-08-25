import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getPublicTourPlan, PlannerError } from "../lib/planner-client.js";
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
        // dt-tests #42 — a route of its own in planner-svc, which enforces
        // `shared_at IS NOT NULL` in its WHERE clause. The check below is the
        // second, independent control, not the only one.
        const plan = await getPublicTourPlan(parsed.data.planId);
        // dt-tests #40 — `shared_at` is the grant; status only says the plan
        // EXISTS to show. Before this gate every ready plan was world-readable
        // to anyone holding the id, whether or not the guest ever shared it.
        // A revoked plan lands here too (shared_at cleared) and 404s again.
        if (!plan || plan.status !== "ready" || !plan.shared_at) {
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
