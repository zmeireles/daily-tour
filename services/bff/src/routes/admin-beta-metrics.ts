import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { getBetaMetrics } from "../lib/analytics-db.js";

// eslint-disable-next-line @typescript-eslint/require-await
const adminBetaMetricsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/v1/admin/beta-metrics", { config: { auth: "owner" } }, async (req, reply) => {
    try {
      const metrics = await getBetaMetrics();
      return reply.code(200).send(metrics);
    } catch (err) {
      req.log.error({ err }, "[bff:admin-beta-metrics] failed to query beta metrics");
      return reply.code(500).send({ error: "internal_error" });
    }
  });
};

export default adminBetaMetricsRoute;
