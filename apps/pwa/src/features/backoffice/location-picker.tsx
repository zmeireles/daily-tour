import * as React from "react";
import { useTranslation } from "react-i18next";
import { LocateFixed, Loader2, MapPin, Search } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MaplibreMap } from "maplibre-gl";
import { buildStyle } from "@/lib/map/style";
import { SAO_MIGUEL_CENTER } from "@/lib/map/center";
import { useOwnerJwt } from "@/store/owner-session";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Shared assisted map/coordinates finder (Plan-008 §7b). Lets a non-technical
// host drop a pin on a map instead of hand-typing coordinates. Reuses the
// existing maplibre-gl stack (OSM raster via buildStyle) — NO second map engine —
// and the owner-only BFF geocode proxy (T-8.5.1). The numeric lat/lng inputs in
// the form remain the RHF/zod source of truth; this writes into them via
// onConfirm and degrades gracefully when the proxy is disabled (503) or errors.

interface Coords {
  lat: number;
  lng: number;
}

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  lat: number;
  lng: number;
  onConfirm: (coords: Coords) => void;
}

// Street-level zoom so the host can fine-tune the pin once the map opens.
const PICKER_ZOOM = 15;
// Fire a query only once the host has typed something searchable.
const MIN_QUERY_LEN = 2;
// Only refresh the address text when the pin has drifted far enough that it
// likely names a different street — avoids flicker on tiny nudges.
const REVERSE_THRESHOLD_M = 50;

// Our geocode fetches abort with a DOMException named "AbortError" — treat that
// as a benign cancellation (a newer keystroke / a close superseded this request).
function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

class GeocodeError extends Error {
  status: number;
  constructor(status: number) {
    super(`geocode ${status}`);
    this.name = "GeocodeError";
    this.status = status;
  }
}

function authHeaders(jwt: string | null): Record<string, string> {
  return { Authorization: `Bearer ${jwt}`, "content-type": "application/json" };
}

async function geocodeSearch(
  jwt: string | null,
  query: string,
  signal: AbortSignal,
): Promise<GeocodeResult[]> {
  const res = await fetch("/v1/admin/geocode", {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({ query, limit: 10 }),
    signal,
  });
  if (!res.ok) throw new GeocodeError(res.status);
  const data = (await res.json()) as { results?: GeocodeResult[] };
  return data.results ?? [];
}

async function geocodeReverse(
  jwt: string | null,
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<{ label: string | null }> {
  const res = await fetch("/v1/admin/geocode/reverse", {
    method: "POST",
    headers: authHeaders(jwt),
    body: JSON.stringify({ lat, lng }),
    signal,
  });
  if (!res.ok) throw new GeocodeError(res.status);
  return (await res.json()) as { label: string | null };
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

// Haversine great-circle distance in metres — used for the reverse-geocode
// threshold check (see REVERSE_THRESHOLD_M).
function metersBetween(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function isFiniteCoord(n: number): boolean {
  return Number.isFinite(n);
}

export function LocationPicker({ lat, lng, onConfirm }: LocationPickerProps) {
  const { t } = useTranslation("admin");
  const jwt = useOwnerJwt();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [searching, setSearching] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState(false);
  const [pin, setPin] = React.useState<Coords>({ lat, lng });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MaplibreMap | null>(null);
  const lastReverseRef = React.useRef<Coords | null>(null);
  const searchAbortRef = React.useRef<AbortController | null>(null);
  const reverseAbortRef = React.useRef<AbortController | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read the freshest jwt / moveend handler from imperative map callbacks
  // without re-instantiating the map when they change.
  const jwtRef = React.useRef(jwt);
  jwtRef.current = jwt;
  const moveEndRef = React.useRef<() => void>(() => {});

  const initialCenter: Coords =
    isFiniteCoord(lat) && isFiniteCoord(lng)
      ? { lat, lng }
      : { lat: SAO_MIGUEL_CENTER.lat, lng: SAO_MIGUEL_CENTER.lng };
  const centerRef = React.useRef(initialCenter);
  centerRef.current = initialCenter;

  const listboxId = React.useId();
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  // Reverse-geocode the settled pin, but only when it has drifted far enough.
  // Failure is non-fatal: the address text is left as-is.
  const reverseGeocode = React.useCallback((coords: Coords) => {
    const last = lastReverseRef.current;
    if (last && metersBetween(last, coords) < REVERSE_THRESHOLD_M) return;
    lastReverseRef.current = coords;
    reverseAbortRef.current?.abort();
    const ac = new AbortController();
    reverseAbortRef.current = ac;
    geocodeReverse(jwtRef.current, coords.lat, coords.lng, ac.signal)
      .then((r) => {
        if (r.label) setQuery(r.label);
      })
      .catch(() => {
        /* non-fatal — keep the current text */
      });
  }, []);

  // Keep a stable moveend listener that always sees the latest map/pin state.
  moveEndRef.current = () => {
    const c = mapRef.current?.getCenter();
    if (!c) return;
    const coords = { lat: c.lat, lng: c.lng };
    setPin(coords);
    reverseGeocode(coords);
  };

  // Instantiate the map only while the Sheet is open; tear it down on close.
  // maplibre-gl is dynamically imported so the (heavy) engine never enters the
  // host forms' bundle/module graph until the picker is actually opened.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void import("maplibre-gl")
      .then(({ default: maplibregl }) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        const map = new maplibregl.Map({
          container,
          style: buildStyle({}),
          center: [centerRef.current.lng, centerRef.current.lat],
          zoom: PICKER_ZOOM,
        });
        mapRef.current = map;
        // The initial center is the reference point for the first drift check.
        lastReverseRef.current = centerRef.current;
        map.on("moveend", () => moveEndRef.current());

        // KNOWN BUG: a MapLibre map mounted inside a Sheet/Dialog can initialize at
        // 0 height (the container isn't laid out yet) and ship blank. Force a
        // resize once the style loads, on the next frame, and on any later size
        // change (open transition, viewport rotate).
        const resize = () => mapRef.current?.resize();
        // once() returns `this | Promise` in the typings; we only want the listener.
        void map.once("load", resize);
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(resize);
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(container);
        }
      })
      .catch(() => {
        // maplibre chunk failed to load — the map stays blank, but address search
        // and the numeric coordinate inputs still work; swallow to avoid an
        // unhandled promise rejection.
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      searchAbortRef.current?.abort();
      reverseAbortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open]);

  // When the Sheet (re)opens, sync the working pin to the form's current coords
  // and reset all transient combobox state — otherwise a spinner left mid-flight
  // or a stale results list from a previous session re-renders over the map.
  React.useEffect(() => {
    if (!open) return;
    setPin(centerRef.current);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setSearching(false);
    setUnavailable(false);
    setGeoError(false);
  }, [open]);

  function runSearch(q: string) {
    const ac = new AbortController();
    searchAbortRef.current = ac;
    geocodeSearch(jwtRef.current, q, ac.signal)
      .then((res) => {
        setResults(res);
        setUnavailable(false);
        setSearching(false);
      })
      .catch((err: unknown) => {
        if (isAbort(err)) return; // a newer keystroke owns the spinner now
        // 503 = feature disabled (no geocoder key). Any error → degrade
        // silently; the numeric inputs remain the fallback.
        if (err instanceof GeocodeError && err.status === 503) setUnavailable(true);
        setResults([]);
        setSearching(false);
      });
  }

  // Selecting a result or "use my location" supersedes any pending/in-flight
  // search — otherwise its late response reopens the dropdown over the map.
  function cancelPendingSearch() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    searchAbortRef.current?.abort();
    setSearching(false);
  }

  function handleQueryChange(value: string) {
    // A slow reverse-geocode must not overwrite what the host is now typing.
    reverseAbortRef.current?.abort();
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchAbortRef.current?.abort();
    const q = value.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  }

  function flyTo(coords: Coords) {
    setPin(coords);
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: PICKER_ZOOM });
  }

  function selectResult(r: GeocodeResult) {
    cancelPendingSearch();
    setQuery(r.label);
    setResults([]);
    setActiveIndex(-1);
    // We already know this point's label — suppress the reverse-geocode that the
    // ensuing moveend would otherwise trigger.
    lastReverseRef.current = { lat: r.lat, lng: r.lng };
    flyTo({ lat: r.lat, lng: r.lng });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const chosen = activeIndex >= 0 ? results[activeIndex] : undefined;
      if (chosen) {
        e.preventDefault();
        selectResult(chosen);
      }
    }
    // Escape is handled by the Sheet's onEscapeKeyDown (Radix listens in the
    // capture phase and ignores this input's preventDefault), so dismissing just
    // the results list has to happen there, not here.
  }

  function handleUseMyLocation() {
    cancelPendingSearch();
    setGeoError(false);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Let the ensuing moveend reverse-geocode the address for this point.
        lastReverseRef.current = null;
        flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function handleConfirm() {
    const m = mapRef.current;
    // During an in-flight flyTo, getCenter() is a mid-animation camera point, not
    // the destination — writing it would silently save coordinates tens of km off
    // while the footer shows the target. The pin holds the target (and matches the
    // footer readout), so only trust getCenter() when the map is idle.
    const coords = m && !m.isMoving() ? { lat: m.getCenter().lat, lng: m.getCenter().lng } : pin;
    onConfirm(coords);
    setOpen(false);
  }

  const coordLabel =
    isFiniteCoord(lat) && isFiniteCoord(lng) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "—";
  const showList = results.length > 0;
  const showEmpty = !searching && !unavailable && !showList && query.trim().length >= MIN_QUERY_LEN;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-md border border-input bg-background px-3 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1 font-medium">
          {t("location.set_on_map", "Set location on map")}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{coordLabel}</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[88vh] flex-col gap-0 p-0"
          onEscapeKeyDown={(e) => {
            // Escape with the results list open dismisses just the list, not the
            // whole Sheet. Radix's capture-phase Escape handler ignores the
            // input's preventDefault, so this is the only place it can win.
            if (results.length) {
              e.preventDefault();
              setResults([]);
              setActiveIndex(-1);
            }
          }}
        >
          <SheetHeader className="pb-2">
            <SheetTitle>{t("location.sheet_title", "Set location")}</SheetTitle>
            <SheetDescription>
              {t(
                "location.sheet_description",
                "Move the map to place the pin, or search for an address.",
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Address search — a hand-rolled accessible combobox (no cmdk). */}
          <div className="relative px-4 pb-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                role="combobox"
                aria-expanded={showList}
                aria-controls={listboxId}
                aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
                aria-autocomplete="list"
                aria-label={t("location.search_label", "Search for an address")}
                placeholder={t("location.search_placeholder", "Search for an address or place")}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex min-h-11 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {searching && (
                <Loader2
                  className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>

            <ul
              role="listbox"
              id={listboxId}
              className={
                showList
                  ? "absolute left-4 right-4 z-30 mt-1 max-h-64 overflow-auto rounded-md border border-input bg-background shadow-lg"
                  : "sr-only"
              }
            >
              {results.map((r, i) => (
                // Keyboard nav for this combobox lives on the input (Arrow keys +
                // Enter via aria-activedescendant); options aren't focusable, so a
                // per-option key handler would be unreachable — click is a
                // mouse/touch affordance only.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={`${r.lat},${r.lng},${i}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectResult(r)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                  }`}
                >
                  {r.label}
                </li>
              ))}
            </ul>

            {showEmpty && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("location.no_results", "No results")}
              </p>
            )}
            {unavailable && (
              <p className="mt-1 text-xs text-muted-foreground" role="status">
                {t(
                  "location.unavailable",
                  "Map search is unavailable right now — enter the coordinates below.",
                )}
              </p>
            )}
          </div>

          {/* Full-bleed canvas with a stationary centre pin: the map moves under
              the pin (the established touch pattern — no draggable marker). */}
          <div className="relative min-h-0 w-full flex-1">
            <div
              ref={containerRef}
              className="absolute inset-0"
              aria-label={t("location.map_label", "Map")}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
              <MapPin
                className="size-9 text-primary drop-shadow-md"
                fill="currentColor"
                aria-hidden="true"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="absolute bottom-4 left-4 z-10 shadow-lg"
            >
              {locating ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed aria-hidden="true" />
              )}
              {t("location.use_my_location", "Use my location")}
            </Button>
          </div>

          <SheetFooter className="gap-2">
            {geoError && (
              <p className="text-xs text-destructive" role="alert">
                {t(
                  "location.geolocation_denied",
                  "Couldn't get your location — search or enter coordinates instead.",
                )}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span
                data-testid="location-picker-coords"
                className="text-xs text-muted-foreground tabular-nums"
              >
                {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </span>
              <Button type="button" size="touch" onClick={handleConfirm}>
                {t("location.confirm", "Confirm location")}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
