import * as React from "react";
import { MapView } from "@/components/map-view";

interface PlaceMapProps {
  lat: number;
  lng: number;
}

const PLACE_PIN_ID = "place-detail-pin";

export function PlaceMap({ lat, lng }: PlaceMapProps) {
  const pins = React.useMemo(() => [{ id: PLACE_PIN_ID, lat, lng, selected: true }], [lat, lng]);
  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-outline-variant">
      <MapView center={{ lat, lng }} zoom={15} pins={pins} />
    </div>
  );
}
