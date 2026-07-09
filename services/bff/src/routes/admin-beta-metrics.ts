import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getBetaMetrics } from "../lib/analytics-db.js";

// Date-range control on the dashboard maps to one of three fixed windows.
// Unknown values are rejected (400) rather than silently coerced.
const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;
const QuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

// eslint-disable-next-line @typescript-eslint/require-await
const adminBetaMetricsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/v1/admin/beta-metrics", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }

    try {
      const metrics = await getBetaMetrics({ rangeDays: RANGE_DAYS[parsed.data.range] });
      return reply.code(200).send(metrics);
    } catch (err) {
      req.log.error({ err }, "[bff:admin-beta-metrics] failed to query beta metrics");
      return reply.code(500).send({ error: "internal_error" });
    }
  });
};

export default adminBetaMetricsRoute;
