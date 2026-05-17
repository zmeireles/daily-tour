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
}

// Calls catalog-svc GET /v1/places-by-action?action_slug=<slug>&status=published.
// Returns typed PlaceCard[] with hero_image_url=null (signed URLs land in T-1.4.x).
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
    hero_image_url: null,
  }));
}
