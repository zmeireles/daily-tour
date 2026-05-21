import * as React from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { useSessionStore } from "@/store/session";
import { GUESTHOUSE_LOCATIONS } from "@/lib/config";
import { useDiscover } from "@/features/discover/use-discover";
import { ControlsBar, type GroupBy } from "@/features/discover/controls-bar";
import { WishGroupList } from "@/features/discover/wish-group-list";
import { FlatList } from "@/features/discover/flat-list";
import { EmptyState } from "@/features/discover/empty-state";
import { HostsPicksRibbon } from "@/features/discover/hosts-picks-ribbon";
import type { LocationValue } from "@/components/location-toggle";
import type { SortBy } from "@/features/discover/sort-utils";
import { flattenGroups } from "@/features/discover/sort-utils";
import { useVehiclePref, WALK_KM_LIMIT } from "@/lib/preferences/use-vehicle-pref";

const SAO_MIGUEL_CENTER = { lat: 37.74, lng: -25.67 };

const ACTION_LABELS: Record<string, string> = {
  eat: "Eat",
  drink: "Drink",
  see: "See",
  do: "Do",
  buy: "Buy",
  move: "Move",
};

function getGuesthouseLoc(guesthouseId: string | undefined): { lat: number; lng: number } {
  if (guesthouseId && guesthouseId in GUESTHOUSE_LOCATIONS) {
    const entry = GUESTHOUSE_LOCATIONS[guesthouseId];
    if (entry) return { lat: entry.lat, lng: entry.lng };
  }
  return SAO_MIGUEL_CENTER;
}

export default function ActionDrillDownRoute() {
  const { action } = useParams<{ action: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("discover");

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
  const [kmRange, setKmRange] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<SortBy>("distance");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("grouped");

  const vehicleMode = useVehiclePref((s) => s.mode);
  const setVehicleMode = useVehiclePref((s) => s.setMode);
  const effectiveKm = vehicleMode === "foot" ? Math.min(kmRange, WALK_KM_LIMIT) : kmRange;

  React.useEffect(() => {
    if (!jwt) {
      void navigate("/?reason=expired", { replace: true });
    }
  }, [jwt, navigate]);

  function handleLocationChange(val: LocationValue) {
    if (val === "me") {
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
    } else {
      setLocValue("guesthouse");
      setActiveLoc(defaultLoc);
      setGeolocationDenied(false);
    }
  }

  const { data, isLoading, isError } = useDiscover(action ?? "", activeLoc, effectiveKm, jwt ?? "");

  if (!jwt) return null;

  const actionLabel = ACTION_LABELS[action ?? ""] ?? action ?? "";

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to home"
        >
          ←
        </Link>
        <h1
          className="font-display text-2xl leading-tight flex-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")} · {actionLabel}
        </h1>
      </header>

      <ControlsBar
        locValue={locValue}
        geolocationDenied={geolocationDenied}
        kmRange={kmRange}
        sortBy={sortBy}
        groupBy={groupBy}
        vehicleMode={vehicleMode}
        onLocationChange={handleLocationChange}
        onKmChange={setKmRange}
        onSortChange={setSortBy}
        onGroupChange={setGroupBy}
        onVehicleChange={setVehicleMode}
      />

      <main className="flex-1">
        {isLoading && (
          <div
            className="flex items-center justify-center py-16"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">{t("error")}</p>
          </div>
        )}

        {data && data.count === 0 && <EmptyState action={action ?? ""} km={kmRange} />}

        {data && data.count > 0 && <HostsPicksRibbon places={flattenGroups(data.groups)} />}

        {data && data.count > 0 && groupBy === "grouped" && (
          <WishGroupList groups={data.groups} sortBy={sortBy} />
        )}

        {data && data.count > 0 && groupBy === "flat" && (
          <FlatList places={flattenGroups(data.groups)} sortBy={sortBy} />
        )}
      </main>
    </div>
  );
}
