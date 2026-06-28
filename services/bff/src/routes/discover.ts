import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  CatalogError,
  fetchHiddenPlaceIds,
  fetchPlacesByAction,
  type PlaceCard,
} from "../lib/catalog-client.js";
import { guestKeyGenerator } from "../lib/rate-limit-keys.js";
import { queryPlaces, SearchError } from "../lib/search-client.js";

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

type PlaceWithDistance = PlaceCard & { distance_km?: number };

// eslint-disable-next-line @typescript-eslint/require-await
const discoverRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // No `config: { auth: 'public' }` — the onRoute hook in auth.ts auto-attaches
  // fastify.authenticate as preHandler. This is the first real authed feature route.
  //
  // T-3.C.3 — discover triggers an embedding call (search-svc), so cap at
  // 30/min PER GUEST (keyed off the JWT `sub` via guestKeyGenerator — the
  // keyGenerator decodes the bearer itself; see lib/rate-limit-keys.ts for the
  // hook-ordering reason). Query-params only, so no bodyLimit. Limiter store is
  // in-memory per-process — fine for the single-BFF F&F beta.
  fastify.get(
    "/v1/discover",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute", keyGenerator: guestKeyGenerator },
      },
    },
    async (req, reply) => {
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

      let annotated: PlaceWithDistance[];

      if (userLoc) {
        // Parallel fetch: catalog cards + search-svc geo+vector ranking.
        const [catalogResult, searchResult] = await Promise.allSettled([
          fetchPlacesByAction(action),
          queryPlaces({ action, lat: userLoc.lat, lng: userLoc.lng, km }),
        ]);

        if (catalogResult.status === "rejected") {
          const err: unknown = catalogResult.reason;
          if (err instanceof CatalogError) {
            req.log.error({ err }, "[bff:discover] catalog-svc error");
            return reply.code(503).send({ error: "catalog_unavailable" });
          }
          throw err;
        }

        if (searchResult.status === "rejected") {
          const err: unknown = searchResult.reason;
          if (err instanceof SearchError) {
            req.log.error({ err }, "[bff:discover] search-svc error");
            return reply.code(503).send({ error: "search_unavailable" });
          }
          throw err;
        }

        const placeById = new Map<string, PlaceCard>(catalogResult.value.map((p) => [p.id, p]));
        // Preserve search-svc rank order; skip IDs not present in catalog.
        annotated = searchResult.value.results.flatMap((hit) => {
          const place = placeById.get(hit.place_id);
          return place ? [{ ...place, distance_km: hit.distance_km }] : [];
        });
      } else {
        try {
          annotated = await fetchPlacesByAction(action);
        } catch (err) {
          if (err instanceof CatalogError) {
            req.log.error({ err }, "[bff:discover] catalog-svc error");
            return reply.code(503).send({ error: "catalog_unavailable" });
          }
          throw err;
        }
      }

      // Plan-006 6.A.2 — opt-out scoping: drop places this guest's guesthouse hid.
      // Keyed off the JWT `gh` claim (guesthouse_id). Filtered before TOP_N so hidden
      // places don't consume visible slots. Scoping must never break discovery, so a
      // failed lookup logs and falls through to the unfiltered set.
      const gh = (req.user as { gh?: string }).gh;
      if (gh) {
        try {
          const hidden = new Set(await fetchHiddenPlaceIds(gh));
          if (hidden.size > 0) {
            annotated = annotated.filter((p) => !hidden.has(p.id));
          }
        } catch (err) {
          req.log.warn(
            { err },
            "[bff:discover] hidden-places lookup failed; skipping scope filter",
          );
        }
      }

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
            geom_lat: number;
            geom_lng: number;
            wishes: string[];
            is_hosts_pick: boolean;
            distance_km?: number;
          } = {
            id: p.id,
            name: p.name,
            description: p.description,
            hero_image_url: p.hero_image_url,
            geom_lat: p.geom_lat,
            geom_lng: p.geom_lng,
            wishes: p.wishes,
            is_hosts_pick: p.is_hosts_pick,
          };
          if (p.distance_km !== undefined) card.distance_km = p.distance_km;
          return card;
        }),
      }));

      return { action, count: top.length, groups };
    },
  );

  // GET /v1/discover/hosts-picks — the home rail's host's picks.
  //
  // is_hosts_pick is a PLACE-level flag, not action-scoped, so picks span ALL
  // categories. The only catalog read is per-action, so fan out across actions,
  // dedupe by id (unioning wish slugs), and keep the picks. Photo-gate
  // (hero_image_url != null) so photoless picks — e.g. the owner-upload-blocked
  // eat businesses (#135) — don't render as blank tiles; they appear automatically
  // once a photo lands. Internal fan-out only (not the client's 30/min discover
  // budget); a dedicated catalog hosts-picks query is a future optimization.
  fastify.get(
    "/v1/discover/hosts-picks",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute", keyGenerator: guestKeyGenerator },
      },
    },
    async (req, reply) => {
      const settled = await Promise.allSettled(
        [...VALID_ACTIONS].map((a) => fetchPlacesByAction(a)),
      );
      // All six hit the same catalog-svc, so all-rejected means catalog is down.
      if (settled.every((r) => r.status === "rejected")) {
        const reason = (settled[0] as PromiseRejectedResult).reason as unknown;
        if (reason instanceof CatalogError) {
          req.log.error({ err: reason }, "[bff:hosts-picks] catalog-svc error");
          return reply.code(503).send({ error: "catalog_unavailable" });
        }
        throw reason;
      }

      const byId = new Map<string, PlaceCard>();
      for (const r of settled) {
        if (r.status !== "fulfilled") continue;
        for (const place of r.value) {
          if (!place.is_hosts_pick) continue;
          const existing = byId.get(place.id);
          if (existing) {
            existing.wishes = [...new Set([...existing.wishes, ...place.wishes])];
          } else {
            byId.set(place.id, { ...place, wishes: [...place.wishes] });
          }
        }
      }

      let picks = [...byId.values()].filter((p) => p.hero_image_url !== null);

      // Same guesthouse opt-out scoping as /v1/discover (Plan-006 6.A.2).
      const gh = (req.user as { gh?: string }).gh;
      if (gh) {
        try {
          const hidden = new Set(await fetchHiddenPlaceIds(gh));
          if (hidden.size > 0) picks = picks.filter((p) => !hidden.has(p.id));
        } catch (err) {
          req.log.warn(
            { err },
            "[bff:hosts-picks] hidden-places lookup failed; skipping scope filter",
          );
        }
      }

      return {
        count: picks.length,
        places: picks.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          hero_image_url: p.hero_image_url,
          geom_lat: p.geom_lat,
          geom_lng: p.geom_lng,
          wishes: p.wishes,
          is_hosts_pick: p.is_hosts_pick,
        })),
      };
    },
  );
};

export default discoverRoute;
