import { loadConfig } from "../config.js";

export class CatalogError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

export interface PlaceCard {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  geom_lat: number;
  geom_lng: number;
  is_hosts_pick: boolean;
  wishes: string[];
  hero_image_url: string | null;
}

interface CatalogPlaceItem {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  geom_lat: number;
  geom_lng: number;
  address: string;
  is_hosts_pick: boolean;
  status: string;
  created_at: string;
  wishes: string[];
  hero_image_url: string | null;
}

export interface HydratedPlace {
  id: string;
  guesthouse_scope: { all: true } | { guesthouse_ids: string[] };
  name: Record<string, string>;
  description: Record<string, string>;
  geom_lat: number;
  geom_lng: number;
  address: string;
  contacts: {
    phone?: string;
    email?: string;
    website?: string;
    social?: Array<{ kind: string; handle: string }>;
  };
  hours: Array<{ dow: number; open: string; close: string }>;
  status: string;
  is_hosts_pick: boolean;
  source_kind: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
  media: Array<{
    id: string;
    kind: string;
    url: string;
    alt: Record<string, string> | null;
    sort_order: number;
  }>;
  actions: Array<{ slug: string; label_i18n: Record<string, string> }>;
  wishes: Array<{ slug: string; action_slug: string; label_i18n: Record<string, string> }>;
}

// Calls catalog-svc GET /v1/places-by-action?action_slug=<slug>&status=published.
// Returns typed PlaceCard[] with hero_image_url forwarded from catalog-svc's place_media
// (first image by sort_order; null when the place has none). Signed URLs remain future work.
// Throws CatalogError on any non-2xx so the discover route can map 5xx → 503.
export async function fetchPlacesByAction(actionSlug: string): Promise<PlaceCard[]> {
  const { CATALOG_SVC_URL } = loadConfig();
  const url = `${CATALOG_SVC_URL}/v1/places-by-action?action_slug=${encodeURIComponent(actionSlug)}&status=published`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new CatalogError(res.status, `catalog-svc ${res.status}`);
  }
  const body = (await res.json()) as { items: CatalogPlaceItem[] };
  return body.items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    geom_lat: item.geom_lat,
    geom_lng: item.geom_lng,
    is_hosts_pick: item.is_hosts_pick,
    wishes: item.wishes,
    hero_image_url: item.hero_image_url,
  }));
}

// Calls catalog-svc GET /v1/places/:id/hydrated — single endpoint that returns
// the place with its media, actions, and wishes already joined.
// Throws CatalogError(404, ...) if not found; CatalogError(status, ...) for other errors.
export async function fetchPlaceHydrated(id: string): Promise<HydratedPlace> {
  const { CATALOG_SVC_URL } = loadConfig();
  const res = await fetch(`${CATALOG_SVC_URL}/v1/places/${encodeURIComponent(id)}/hydrated`);
  if (!res.ok) {
    throw new CatalogError(res.status, `catalog-svc ${res.status}`);
  }
  return (await res.json()) as HydratedPlace;
}
