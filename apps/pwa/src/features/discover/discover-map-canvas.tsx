import * as React from "react";
import { LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MapView, type MapViewPin } from "@/components/map-view";
import type { DiscoverPlace } from "./sort-utils";

// Desktop Discover map: the shared MapView with fitToPins (frames the São Miguel
// cluster → fills the edge-to-edge canvas + keeps any stray world-scale geometry
// off-screen), a locate-me FAB, and the list↔pin selection sync. The floating
// over-map search is GONE on desktop (it lives in the sub-header now).
export function DiscoverMapCanvas({
  places,
  center,
  selectedId,
  onSelect,
  onLocateMe,
}: {
  places: DiscoverPlace[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLocateMe: () => void;
}) {
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

  // Center on the selected place (hover/click sync); else frame the cluster.
  const mapCenter = React.useMemo(() => {
    if (selectedId) {
      const sel = places.find((p) => p.id === selectedId);
      if (sel?.geom_lat !== undefined && sel?.geom_lng !== undefined) {
        return { lat: sel.geom_lat, lng: sel.geom_lng };
      }
    }
    return center;
  }, [selectedId, places, center]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-container-lowest">
      <MapView center={mapCenter} pins={pins} fitToPins />
      <button
        type="button"
        onClick={onLocateMe}
        aria-label={t("map.locate_me")}
        className="absolute bottom-4 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/50 bg-surface text-primary shadow-lg transition-colors hover:bg-surface-container-highest"
      >
        <LocateFixed size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
