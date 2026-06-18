import * as React from "react";
import { MapView, type MapViewPin } from "@/components/map-view";
import { SAO_MIGUEL_CENTER } from "@/lib/map/center";
import type { TourStop } from "@/components/timeline-stop";

// Edge-to-edge desktop tour map: the UNFORKED MapView plotting the day's stops as
// NUMBERED markers (1..n) joined by a tea-green route polyline, fit-bounds to the
// cluster. Synced to the rail via activeStopId (selected styling + map ease).
//
// Coordinate guards: stops without geom_lat/geom_lng (older payloads) are skipped
// for the marker + route; the rest still render. If NO stop has coords the map just
// frames the island (no markers, no line) — never crashes.
export function TourRouteMap({
  stops,
  activeStopId,
  onActivate,
}: {
  stops: TourStop[];
  activeStopId: string | null;
  onActivate: (id: string) => void;
}) {
  // Stops that carry usable coordinates, paired with their 1-based stop number so
  // the badge label tracks the itinerary order, not the filtered index.
  const located = React.useMemo(
    () =>
      stops.flatMap((stop, idx) =>
        stop.geom_lat != null && stop.geom_lng != null
          ? [{ stop, lat: stop.geom_lat, lng: stop.geom_lng, number: idx + 1 }]
          : [],
      ),
    [stops],
  );

  const pins = React.useMemo<MapViewPin[]>(
    () =>
      located.map(({ stop, lat, lng, number }) => ({
        id: stop.id,
        lat,
        lng,
        label: String(number),
        selected: stop.id === activeStopId,
        onClick: () => onActivate(stop.id),
      })),
    [located, activeStopId, onActivate],
  );

  const route = React.useMemo(() => located.map(({ lat, lng }) => ({ lat, lng })), [located]);

  // Center on the active stop (rail→map sync); else frame the cluster via fitToPins.
  const center = React.useMemo(() => {
    const active = located.find(({ stop }) => stop.id === activeStopId);
    if (active) return { lat: active.lat, lng: active.lng };
    return { lat: SAO_MIGUEL_CENTER.lat, lng: SAO_MIGUEL_CENTER.lng };
  }, [located, activeStopId]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-container-lowest">
      <MapView center={center} pins={pins} route={route} fitToPins />
    </div>
  );
}
