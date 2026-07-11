import type { FastifyBaseLogger, FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import { loadConfig } from "../config.js";

// Owner-only geocoding proxy for the backoffice map picker (Plan-008 Slice 5).
// Two routes forward to Geoapify with the API key hidden server-side; the owner
// guard is applied by the global onRoute hook (plugins/auth.ts) via
// `auth: "owner"`.
//
// CONTRACT (frozen — the PWA LocationPicker builds against this):
//   POST /v1/admin/geocode          { query, limit? }  -> 200 { results: [{ label, lat, lng }] }
//   POST /v1/admin/geocode/reverse  { lat, lng }        -> 200 { label: string|null, lat, lng }
//   errors: 400 invalid_body | 401/403 auth |
//           429 geocode_rate_limited | 502 geocode_failed | 503 geocode_unavailable
//
// An unset GEOAPIFY_API_KEY means the feature is disabled (dev/CI posture,
// mirrors admin-translate): both routes 503 BEFORE any fetch, and the frontend
// degrades to numeric lat/lng inputs.
//
// PT / AZORES BIAS: we hard-filter to Portugal (`filter=countrycode:pt`) but only
// SOFT-bias toward São Miguel (`bias=proximity:<lon>,<lat>`). Proximity is a
// ranking hint, not a fence — mainland-PT addresses stay reachable, they just
// rank below Azorean ones. Using a hard bounding box would wrongly exclude the
// mainland, so we deliberately keep the geographic pull soft.

// Geoapify's São Miguel centroid, expressed as `proximity:<lon>,<lat>` (Geoapify
// orders longitude first). Soft bias only — see the note above.
const AZORES_PROXIMITY = "proximity:-25.67,37.75";
const AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
const REVERSE_URL = "https://api.geoapify.com/v1/geocode/reverse";
const UPSTREAM_TIMEOUT_MS = 8_000;

const ForwardSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(10).default(10),
});

const ReverseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

interface ForwardResult {
  label: string;
  lat: number;
  lng: number;
}
interface ForwardResponse {
  results: ForwardResult[];
}
interface ReverseResponse {
  label: string | null;
  lat: number;
  lng: number;
}

// Geoapify `format=json` payloads. Fields are typed `unknown` and narrowed
// during normalization — the upstream shape is not something we want to trust.
interface GeoapifyResult {
  formatted?: unknown;
  lat?: unknown;
  lon?: unknown;
}
interface GeoapifyJson {
  results?: GeoapifyResult[];
}

// ── in-memory TTL cache ──────────────────────────────────────────────────────
// Geoapify autocomplete fires per keystroke; a small module-local cache absorbs
// the repeats without an external dep. Only successful 200s are cached. Eviction
// is insertion-order (Map keeps it) once the cap is reached.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  value: ForwardResponse | ReverseResponse;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): CacheEntry["value"] | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key: string, value: CacheEntry["value"]): void {
  // Evict the oldest entry when a NEW key would overflow the cap.
  if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

type UpstreamResult = { ok: true; data: GeoapifyJson } | { ok: false; status: number };

// Fetch Geoapify with a wall-clock timeout. `AbortSignal.timeout` bounds the
// WHOLE operation (connect + headers + body read) to UPSTREAM_TIMEOUT_MS from
// this call — so a 200 whose body then stalls aborts `res.json()` too, not just
// the initial fetch. A network error / abort yields status 0; a non-2xx or
// unparseable body yields the upstream status so the caller can special-case 429.
async function callGeoapify(url: string, log: FastifyBaseLogger): Promise<UpstreamResult> {
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    log.error({ err }, "[admin-geocode] upstream fetch failed");
    return { ok: false, status: 0 };
  }
  if (!res.ok) {
    log.error({ status: res.status }, "[admin-geocode] upstream non-2xx");
    return { ok: false, status: res.status };
  }
  try {
    return { ok: true, data: (await res.json()) as GeoapifyJson };
  } catch (err) {
    log.error({ err }, "[admin-geocode] upstream parse failure");
    return { ok: false, status: res.status };
  }
}

// Map an upstream failure to our error contract: 429 passes through as
// geocode_rate_limited, everything else collapses to a 502 geocode_failed.
function sendUpstreamError(reply: FastifyReply, status: number): void {
  if (status === 429) {
    void reply.code(429).send({ error: "geocode_rate_limited" });
    return;
  }
  void reply.code(502).send({ error: "geocode_failed" });
}

// POST /v1/admin/geocode + /v1/admin/geocode/reverse — owner-only Geoapify proxy.
// eslint-disable-next-line @typescript-eslint/require-await
const adminGeocodeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const ROUTE_OPTS = {
    config: { auth: "owner", rateLimit: { max: 120, timeWindow: "1 minute" } },
  } as const;

  // ── forward autocomplete ───────────────────────────────────────────────────
  fastify.post("/v1/admin/geocode", ROUTE_OPTS, async (req, reply) => {
    const parsed = ForwardSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
    }
    const { query, limit } = parsed.data;

    // Guard BEFORE any fetch — an unset key means the feature is disabled.
    const config = loadConfig();
    if (!config.GEOAPIFY_API_KEY) {
      return reply.code(503).send({ error: "geocode_unavailable" });
    }

    const cacheKey = `geocode:${query}:${limit}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return reply.code(200).send(cached);
    }

    const url = new URL(AUTOCOMPLETE_URL);
    url.searchParams.set("text", query);
    url.searchParams.set("filter", "countrycode:pt"); // hard PT-only
    url.searchParams.set("bias", AZORES_PROXIMITY); // soft São Miguel bias
    url.searchParams.set("lang", "pt");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("format", "json");
    url.searchParams.set("apiKey", config.GEOAPIFY_API_KEY);

    const upstream = await callGeoapify(url.toString(), fastify.log);
    if (!upstream.ok) {
      return sendUpstreamError(reply, upstream.status);
    }

    const results: ForwardResult[] = (upstream.data.results ?? [])
      // Require a non-empty label alongside numeric coords — a valid point with a
      // blank `formatted` would render as an empty autocomplete row.
      .filter(
        (r) =>
          typeof r.lat === "number" &&
          typeof r.lon === "number" &&
          typeof r.formatted === "string" &&
          r.formatted.length > 0,
      )
      .slice(0, limit)
      .map((r) => ({
        label: r.formatted as string,
        lat: r.lat as number,
        lng: r.lon as number,
      }));

    const body: ForwardResponse = { results };
    cacheSet(cacheKey, body);
    return reply.code(200).send(body);
  });

  // ── reverse geocode ────────────────────────────────────────────────────────
  fastify.post("/v1/admin/geocode/reverse", ROUTE_OPTS, async (req, reply) => {
    const parsed = ReverseSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
    }
    const { lat, lng } = parsed.data;

    const config = loadConfig();
    if (!config.GEOAPIFY_API_KEY) {
      return reply.code(503).send({ error: "geocode_unavailable" });
    }

    const cacheKey = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return reply.code(200).send(cached);
    }

    const url = new URL(REVERSE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("lang", "pt");
    url.searchParams.set("format", "json");
    url.searchParams.set("apiKey", config.GEOAPIFY_API_KEY);

    const upstream = await callGeoapify(url.toString(), fastify.log);
    if (!upstream.ok) {
      return sendUpstreamError(reply, upstream.status);
    }

    const first = (upstream.data.results ?? [])[0];
    const label = first && typeof first.formatted === "string" ? first.formatted : null;

    const body: ReverseResponse = { label, lat, lng };
    cacheSet(cacheKey, body);
    return reply.code(200).send(body);
  });
};

export default adminGeocodeRoute;
