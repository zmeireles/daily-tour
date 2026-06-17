import * as React from "react";
import { Search, LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MapView, type MapViewPin } from "@/components/map-view";
import { SAO_MIGUEL_CENTER } from "@/lib/map/center";
import type { DiscoverPlace } from "./sort-utils";

type DiscoverMapProps = {
  places: DiscoverPlace[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onLocateMe: () => void;
};

// Map-first top half of the Discover screen. Renders one tea-green pin per
// place that carries coordinates (geom_lat/geom_lng), a floating rounded
// search field that filters the visible pins client-side, and a circular
// locate-me FAB. Selecting a pin lifts the parent's selectedId, which both
// highlights the pin and scrolls the sheet ribbon to the matching card.
export function DiscoverMap({
  places,
  center,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onLocateMe,
}: DiscoverMapProps) {
  const { t } = useTranslation("discover");

  const pins = React.useMemo<MapViewPin[]>(
    () =>
      places.flatMap((p) =>
        p.geom_lat !== undefined && p.geom_lng !== undefined
          ? [
              {
                id: p.id,
                lat: p.geom_lat,
                lng: p.geom_lng,
                selected: p.id === selectedId,
                onClick: () => onSelect(p.id),
              },
            ]
          : [],
      ),
    [places, selectedId, onSelect],
  );

  // Center on the selected place when one is chosen, else on the user/guesthouse.
  const mapCenter = React.useMemo(() => {
    if (selectedId) {
      const sel = places.find((p) => p.id === selectedId);
      if (sel?.geom_lat !== undefined && sel?.geom_lng !== undefined) {
        return { lat: sel.geom_lat, lng: sel.geom_lng };
      }
    }
    return center;
  }, [selectedId, places, center]);

  const zoom = selectedId ? 13 : SAO_MIGUEL_CENTER.zoom;

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-container-lowest">
      <MapView center={mapCenter} zoom={zoom} pins={pins} />

      {/* Floating rounded search field */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-outline-variant/40 bg-surface/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <Search size={18} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("map.search_placeholder")}
            aria-label={t("map.search_placeholder")}
            className="w-full border-none bg-transparent p-0 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Circular locate-me FAB. Anchored just above the sheet's peek edge
          (the sheet covers the bottom 45% at its minimum snap) so it isn't
          buried behind the sheet — it's a map control, visible in the
          map/peek view. */}
      <button
        type="button"
        onClick={onLocateMe}
        aria-label={t("map.locate_me")}
        className="absolute bottom-[calc(45%+0.75rem)] right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/50 bg-surface text-primary shadow-lg transition-colors hover:bg-surface-container-highest"
      >
        <LocateFixed size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
