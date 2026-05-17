import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CatalogError, fetchPlaceHydrated } from "../lib/catalog-client.js";

const IdParamSchema = z.object({ id: z.string().uuid() });

// eslint-disable-next-line @typescript-eslint/require-await
const placesRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // No `config: { auth: 'public' }` — the onRoute hook in auth.ts auto-attaches
  // fastify.authenticate as preHandler. Same pattern as discoverRoute (T-1.2.0).
  fastify.get("/v1/places/:id", async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { id } = parsed.data;

    let place;
    try {
      place = await fetchPlaceHydrated(id);
    } catch (err) {
      if (err instanceof CatalogError) {
        if (err.status === 404) {
          return reply.code(404).send({ error: "place_not_found" });
        }
        req.log.error({ err }, "[bff:places] catalog-svc error");
        return reply.code(503).send({ error: "catalog_unavailable" });
      }
      throw err;
    }

    // weather_ok_today: stub true for all places — real IPMA call lands in Phase 3 (T-3.2.x).
    // Will compute per place.kind once Phase 3 adds the kind column via schema migration.
    return { ...place, weather_ok_today: true };
  });
};

export default placesRoute;
