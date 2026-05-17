import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CatalogError, fetchPlacesByAction, type PlaceCard } from "../lib/catalog-client.js";

const DiscoverQuerySchema = z.object({
  action: z.string().min(1),
  loc: z.string().optional(),
  km: z.coerce.number().min(0.1).max(200).default(20),
});

const VALID_ACTIONS = new Set(["eat", "drink", "see", "do", "buy", "move"]);
const TOP_N = 30;

function parseLoc(loc: string): { lat: number; lng: number } | null {
  const parts = loc.split(",");
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]!);
  const lng = parseFloat(parts[1]!);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

type PlaceWithDistance = PlaceCard & { distance_km?: number };

// eslint-disable-next-line @typescript-eslint/require-await
const discoverRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // No `config: { auth: 'public' }` — the onRoute hook in auth.ts auto-attaches
  // fastify.authenticate as preHandler. This is the first real authed feature route.
  fastify.get("/v1/discover", async (req, reply) => {
    const parsed = DiscoverQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { action, loc, km } = parsed.data;

    if (!VALID_ACTIONS.has(action)) {
      return { action, count: 0, groups: [] };
    }

    let userLoc: { lat: number; lng: number } | null = null;
    if (loc) {
      userLoc = parseLoc(loc);
      if (!userLoc) {
        return reply.code(400).send({ error: "invalid_loc", message: "expected <lat>,<lng>" });
      }
    }

    let places: PlaceCard[];
    try {
      places = await fetchPlacesByAction(action);
    } catch (err) {
      if (err instanceof CatalogError) {
        req.log.error({ err }, "[bff:discover] catalog-svc error");
        return reply.code(503).send({ error: "catalog_unavailable" });
      }
      throw err;
    }

    let annotated: PlaceWithDistance[] = places.map((p) => {
      if (!userLoc) return p;
      return { ...p, distance_km: haversineKm(userLoc, { lat: p.geom_lat, lng: p.geom_lng }) };
    });

    if (userLoc) {
      annotated = annotated.filter((p) => (p.distance_km ?? 0) <= km);
    }

    annotated.sort((a, b) => {
      if (a.is_hosts_pick !== b.is_hosts_pick) return a.is_hosts_pick ? -1 : 1;
      if (userLoc) return (a.distance_km ?? 0) - (b.distance_km ?? 0);
      return 0;
    });

    const top = annotated.slice(0, TOP_N);

    // Group by wish slug — one place may appear in multiple wish rows.
    const wishGroups = new Map<string, PlaceWithDistance[]>();
    for (const place of top) {
      for (const wish of place.wishes) {
        let group = wishGroups.get(wish);
        if (!group) {
          group = [];
          wishGroups.set(wish, group);
        }
        group.push(place);
      }
    }

    const groups = [...wishGroups.entries()].map(([wish, cards]) => ({
      wish,
      places: cards.map((p) => {
        const card: {
          id: string;
          name: Record<string, string>;
          description: Record<string, string>;
          hero_image_url: string | null;
          wishes: string[];
          distance_km?: number;
        } = {
          id: p.id,
          name: p.name,
          description: p.description,
          hero_image_url: p.hero_image_url,
          wishes: p.wishes,
        };
        if (p.distance_km !== undefined) card.distance_km = p.distance_km;
        return card;
      }),
    }));

    return { action, count: top.length, groups };
  });
};

export default discoverRoute;
