import * as React from "react";
import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { MapPin } from "@/components/map-pin";
import { ensurePmtilesProtocol } from "@/lib/map/init";
import { buildStyle } from "@/lib/map/style";
import { SAO_MIGUEL_CENTER, clampZoom } from "@/lib/map/center";
import { cn } from "@/lib/utils";
import type { Map as MaplibreMap, Marker } from "maplibre-gl";

export type MapViewPin = {
  id: string;
  lng: number;
  lat: number;
  selected?: boolean;
  onClick?: () => void;
};

export type MapViewProps = {
  center: { lng: number; lat: number };
  zoom?: number;
  pins?: MapViewPin[];
  pmtilesUrl?: string;
  className?: string;
};

export function MapView({
  center,
  zoom = SAO_MIGUEL_CENTER.zoom,
  pins = [],
  pmtilesUrl,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const markerRootsRef = useRef<Root[]>([]);
  const isFirstCenterRun = useRef(true);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerRootsRef.current.forEach((r) => r.unmount());
    markerRootsRef.current = [];
  }

  function pinElement(pin: MapViewPin): HTMLElement {
    const div = document.createElement("div");
    const root = createRoot(div);
    flushSync(() => root.render(<MapPin selected={pin.selected} />));
    markerRootsRef.current.push(root);
    return div;
  }

  // Create map on mount; clean up on unmount
  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle({ pmtilesUrl }),
      center: [center.lng, center.lat],
      zoom: clampZoom(zoom),
    });
    mapRef.current = map;

    return () => {
      isFirstCenterRun.current = true;
      clearMarkers();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pins — clear old markers, add new ones
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clearMarkers();
    pins.forEach((pin) => {
      const el = pinElement(pin);
      if (pin.onClick) el.addEventListener("click", pin.onClick);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [pins]);

  // Navigate to new center — skip initial call (map was created with the right center)
  useEffect(() => {
    if (isFirstCenterRun.current) {
      isFirstCenterRun.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const clampedZoom = clampZoom(zoom);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      map.jumpTo({ center: [center.lng, center.lat], zoom: clampedZoom });
    } else {
      map.flyTo({ center: [center.lng, center.lat], zoom: clampedZoom });
    }
  }, [center, zoom]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} aria-label="Map" />;
}
