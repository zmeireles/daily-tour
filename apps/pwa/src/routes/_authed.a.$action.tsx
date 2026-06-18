import * as React from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { pickLocale, type Locale } from "@daily-tour/shared-types";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { useSessionStore } from "@/store/session";
import { GUESTHOUSE_LOCATIONS } from "@/lib/config";
import { useDiscover } from "@/features/discover/use-discover";
import { type GroupBy } from "@/features/discover/controls-bar";
import { EmptyState } from "@/features/discover/empty-state";
import { DiscoverMap } from "@/features/discover/discover-map";
import { DiscoverSheet, type SheetSnap } from "@/features/discover/discover-sheet";
import { DiscoverDesktop } from "@/features/discover/discover-desktop";
import { useLayoutMode } from "@/lib/responsive/use-layout-mode";
import type { LocationValue } from "@/components/location-toggle";
import type { SortBy, WishGroup } from "@/features/discover/sort-utils";
import { flattenGroups } from "@/features/discover/sort-utils";
import { useVehiclePref, WALK_KM_LIMIT } from "@/lib/preferences/use-vehicle-pref";
import { isEntireIsland, ISLAND_KM, type KmSelection } from "@/components/range-slider";

const SAO_MIGUEL_CENTER = { lat: 37.74, lng: -25.67 };

const ACTION_LABELS: Record<string, string> = {
  eat: "Eat",
  drink: "Drink",
  see: "See",
  do: "Do",
  buy: "Buy",
  move: "Move",
};

// Lucide icon names per action category. Passed down to PlaceCard's
// hero placeholder so cards on /a/eat render Utensils (etc.) instead
// of the wish-chip default. See DT-TESTS-12 for the regression that
// motivated this map.
const ACTION_ICONS: Record<string, string> = {
  eat: "Utensils",
  drink: "Wine",
  see: "Eye",
  do: "Footprints",
  buy: "ShoppingBag",
  move: "Car",
};

function getGuesthouseLoc(guesthouseId: string | undefined): { lat: number; lng: number } {
  if (guesthouseId && guesthouseId in GUESTHOUSE_LOCATIONS) {
    const entry = GUESTHOUSE_LOCATIONS[guesthouseId];
    if (entry) return { lat: entry.lat, lng: entry.lng };
  }
  return SAO_MIGUEL_CENTER;
}

// Client-side name filter for the map search field. Empty query → all groups.
function filterGroupsByName(groups: WishGroup[], query: string, locale: string): WishGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      wish: g.wish,
      places: g.places.filter((p) =>
        pickLocale(p.name, locale as Locale)
          .toLowerCase()
          .includes(q),
      ),
    }))
    .filter((g) => g.places.length > 0);
}

export default function ActionDrillDownRoute() {
  const { action } = useParams<{ action: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("discover");

  useThemeAuto();

  const jwt = useSessionStore((s) => s.jwt);
  const reservation = useSessionStore((s) => s.reservation);

  const defaultLoc = React.useMemo(
    () => getGuesthouseLoc(reservation?.guesthouseId),
    [reservation?.guesthouseId],
  );

  const [locValue, setLocValue] = React.useState<LocationValue>("guesthouse");
  const [geolocationDenied, setGeolocationDenied] = React.useState(false);
  const [activeLoc, setActiveLoc] = React.useState(defaultLoc);
  const [kmRange, setKmRange] = React.useState<KmSelection>(10);
  const [sortBy, setSortBy] = React.useState<SortBy>("distance");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("grouped");

  // Map-first screen state (T-2.D.6).
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [snap, setSnap] = React.useState<SheetSnap>("peek");

  // Desktop fork: ≥lg renders DiscoverDesktop (rail-frame map+list split);
  // <lg keeps the untouched mobile map+sheet below.
  const layoutMode = useLayoutMode("lg");

  const vehicleMode = useVehiclePref((s) => s.mode);
  const setVehicleMode = useVehiclePref((s) => s.setMode);
  // "Entire island" means "show everything" — it bypasses the foot-mode clamp.
  const effectiveKm = isEntireIsland(kmRange)
    ? ISLAND_KM
    : vehicleMode === "foot"
      ? Math.min(kmRange, WALK_KM_LIMIT)
      : kmRange;

  React.useEffect(() => {
    if (!jwt) {
      void navigate("/?reason=expired", { replace: true });
    }
  }, [jwt, navigate]);

  function requestMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setActiveLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocValue("me");
        setGeolocationDenied(false);
      },
      () => {
        setGeolocationDenied(true);
        setLocValue("guesthouse");
        setActiveLoc(defaultLoc);
        toast.error(t("geolocation_denied"));
      },
    );
  }

  function handleLocationChange(val: LocationValue) {
    if (val === "me") {
      requestMyLocation();
    } else {
      setLocValue("guesthouse");
      setActiveLoc(defaultLoc);
      setGeolocationDenied(false);
    }
  }

  const { data, isLoading, isError } = useDiscover(action ?? "", activeLoc, effectiveKm, jwt ?? "");

  if (!jwt) return null;

  const actionLabel = ACTION_LABELS[action ?? ""] ?? action ?? "";
  const actionIcon = ACTION_ICONS[action ?? ""] ?? null;

  const filteredGroups = data ? filterGroupsByName(data.groups, search, i18n.language) : [];
  const filteredPlaces = flattenGroups(filteredGroups);

  if (layoutMode === "desktop") {
    return (
      <DiscoverDesktop
        action={action ?? ""}
        actionIcon={actionIcon}
        places={filteredPlaces}
        center={activeLoc}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        search={search}
        onSearchChange={setSearch}
        onOpenPlace={(id) => void navigate(`/p/${id}`)}
        onLocateMe={requestMyLocation}
        km={isEntireIsland(kmRange) ? ISLAND_KM : kmRange}
        isLoading={isLoading}
        isError={isError}
      />
    );
  }

  return (
    <div className="relative flex h-svh flex-col bg-background">
      <header className="z-40 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Link
          to="/"
          className="text-on-surface-variant transition-colors hover:text-on-surface"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1
          className="flex-1 font-display text-xl leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")} · {actionLabel}
        </h1>
      </header>

      <main className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div
            className="flex h-full items-center justify-center"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        )}

        {isError && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">{t("error")}</p>
          </div>
        )}

        {data && data.count === 0 && (
          <EmptyState action={action ?? ""} km={isEntireIsland(kmRange) ? ISLAND_KM : kmRange} />
        )}

        {data && data.count > 0 && (
          <>
            <DiscoverMap
              places={filteredPlaces}
              center={activeLoc}
              selectedId={selectedId}
              search={search}
              onSearchChange={setSearch}
              onSelect={(id) => {
                setSelectedId(id);
                setSnap("peek");
              }}
              onLocateMe={requestMyLocation}
            />

            <DiscoverSheet
              groups={filteredGroups}
              snap={snap}
              onSnapChange={setSnap}
              selectedId={selectedId}
              onOpenPlace={(id) => void navigate(`/p/${id}`)}
              placeholderIcon={actionIcon}
              sortBy={sortBy}
              groupBy={groupBy}
              locValue={locValue}
              geolocationDenied={geolocationDenied}
              kmRange={kmRange}
              vehicleMode={vehicleMode}
              onLocationChange={handleLocationChange}
              onKmChange={setKmRange}
              onSortChange={setSortBy}
              onGroupChange={setGroupBy}
              onVehicleChange={setVehicleMode}
            />
          </>
        )}
      </main>
    </div>
  );
}
