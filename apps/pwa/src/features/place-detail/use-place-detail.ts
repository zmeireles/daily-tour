import { useQuery } from "@tanstack/react-query";

export interface PlaceMediaAttribution {
  author: string;
  license: string;
  source_url: string;
}

export interface PlaceMedia {
  id: string;
  kind: string;
  url: string;
  alt: Record<string, string> | null;
  attribution: PlaceMediaAttribution | null;
  sort_order: number;
}

export interface PlaceAction {
  slug: string;
  label_i18n: Record<string, string>;
}

export interface PlaceWish {
  slug: string;
  action_slug: string;
  label_i18n: Record<string, string>;
}

export interface HydratedPlacePayload {
  id: string;
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
  media: PlaceMedia[];
  actions: PlaceAction[];
  wishes: PlaceWish[];
  weather_ok_today: boolean;
}

async function fetchPlaceDetail(id: string, jwt: string): Promise<HydratedPlacePayload> {
  const res = await fetch(`/v1/places/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const err = new Error(`fetch failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as HydratedPlacePayload;
}

export function usePlaceDetail(id: string, jwt: string) {
  return useQuery({
    queryKey: ["place", id],
    queryFn: () => fetchPlaceDetail(id, jwt),
    retry: false,
  });
}
