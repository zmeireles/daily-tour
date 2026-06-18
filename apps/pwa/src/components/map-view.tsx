import * as React from "react";
import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
  // Optional numeral (e.g. "1") shown as a small badge layered over the marker —
  // used by the desktop tour route map for ordered stops. Rendered as a SIBLING
  // in the marker div, so MapPin stays untouched. Absent → no badge (default).
  label?: string;
};

export type MapViewProps = {
  center: { lng: number; lat: number };
  zoom?: number;
  pins?: MapViewPin[];
  pmtilesUrl?: string;
  className?: string;
  // When true, frame the viewport to the current pin cluster (fitBounds) instead
  // of the static center/zoom — used by the desktop Discover map so São Miguel
  // fills the edge-to-edge canvas and any stray world-scale geometry stays
  // off-screen. Default false → the mobile map is unchanged.
  fitToPins?: boolean;
  // Ordered coordinates drawn as a single connecting line (the desktop tour
  // route). Empty/absent → no line layer is added (guards the stray-geometry
  // case). Default undefined → the mobile map is unchanged.
  route?: { lng: number; lat: number }[];
};

const ROUTE_SOURCE_ID = "tour-route";
const ROUTE_LAYER_ID = "tour-route-line";
// MapLibre paint props need a literal colour (CSS var() is not resolved), so read
// the --tea-500 token from the document at draw time, falling back to its literal.
function teaGreen(): string {
  if (typeof document === "undefined") return "#3e7a57";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--tea-500").trim();
  return v || "#3e7a57";
}

export function MapView({
  center,
  zoom = SAO_MIGUEL_CENTER.zoom,
  pins = [],
  pmtilesUrl,
  className,
  fitToPins = false,
  route,
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
    // Numeral badge (route map only) is a SIBLING layered over the MapPin, so the
    // shared MapPin stays byte-identical. The pin div is the relative anchor; the
    // badge sits over the pin's inner dot (≈ top-[5px] of the 32px teardrop).
    flushSync(() =>
      root.render(
        <div className="relative">
          <MapPin selected={pin.selected} />
          {pin.label != null && (
            <span
              className="pointer-events-none absolute left-1/2 top-[5px] flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--basalt-950)] text-[10px] font-semibold leading-none text-[var(--cream-50)]"
              aria-hidden="true"
            >
              {pin.label}
            </span>
          )}
        </div>,
      ),
    );
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

  // Fit the viewport to the current pin cluster (desktop Discover). Re-fits when
  // the filtered pin set changes; the center/zoom effect below still applies
  // selection-centering on top.
  useEffect(() => {
    if (!fitToPins) return;
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    pins.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 });
  }, [pins, fitToPins]);

  // Draw the tour route as a tea-green LineString. Added once the style is loaded;
  // re-synced when `route` changes. Guards the empty case (no source/layer added
  // → no stray geometry). Default undefined → the map is never touched, so the
  // mobile / no-route path stays inert (and existing MapView tests are unaffected).
  const hasDrawnRouteRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const wantsRoute = (route?.length ?? 0) >= 2;
    // Nothing to draw and nothing previously drawn → don't touch the map at all.
    if (!wantsRoute && !hasDrawnRouteRef.current) return;

    function syncRoute() {
      const m = mapRef.current;
      if (!m) return;
      const coords = (route ?? []).map((p) => [p.lng, p.lat] as [number, number]);
      const data: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      };
      const existing = m.getSource<maplibregl.GeoJSONSource>(ROUTE_SOURCE_ID);

      if (coords.length < 2) {
        // Empty / single-point route — tear down any prior layer so no stray line
        // is ever framed.
        if (m.getLayer(ROUTE_LAYER_ID)) m.removeLayer(ROUTE_LAYER_ID);
        if (existing) m.removeSource(ROUTE_SOURCE_ID);
        hasDrawnRouteRef.current = false;
        return;
      }

      if (existing) {
        existing.setData(data);
        return;
      }
      m.addSource(ROUTE_SOURCE_ID, { type: "geojson", data });
      m.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": teaGreen(),
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });
      hasDrawnRouteRef.current = true;
    }

    if (map.isStyleLoaded()) {
      syncRoute();
    } else {
      // once() returns `this | Promise` in the typings; we only want the listener.
      void map.once("load", syncRoute);
      return () => {
        map.off("load", syncRoute);
      };
    }
  }, [route]);

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
