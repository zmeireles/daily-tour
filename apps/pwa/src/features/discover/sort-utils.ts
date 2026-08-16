import type { I18nText } from "@daily-tour/shared-types";
import { pickLocale } from "@daily-tour/shared-types";

export type SortBy = "distance" | "rating" | "name";

export type DiscoverPlace = {
  id: string;
  name: I18nText;
  description: I18nText;
  hero_image_url: string | null;
  // Coordinates thread through from catalog-svc → BFF /v1/discover so the
  // Discover map can place a pin per place (T-2.D.6). Optional because older
  // payloads / fixtures may omit them; pin rendering guards on presence.
  geom_lat?: number;
  geom_lng?: number;
  wishes: string[];
  is_hosts_pick?: boolean;
  distance_km?: number;
};

export type WishGroup = {
  wish: string;
  places: DiscoverPlace[];
};

export type DiscoverResponse = {
  action: string;
  count: number;
  groups: WishGroup[];
};

export function flattenGroups(groups: WishGroup[]): DiscoverPlace[] {
  const seen = new Set<string>();
  const result: DiscoverPlace[] = [];
  for (const group of groups) {
    for (const place of group.places) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        result.push(place);
      }
    }
  }
  return result;
}

export function sortPlaces(
  places: DiscoverPlace[],
  sortBy: SortBy,
  locale: string,
): DiscoverPlace[] {
  const copy = [...places];
  switch (sortBy) {
    case "distance":
      return copy.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    case "rating":
      // No rating field in v1 BFF — stable fallback: sort by id descending.
      return copy.sort((a, b) => b.id.localeCompare(a.id));
    case "name":
      return copy.sort((a, b) => {
        const na = pickLocale(a.name, locale);
        const nb = pickLocale(b.name, locale);
        return na.localeCompare(nb, locale);
      });
  }
}
