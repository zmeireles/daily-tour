import { useTranslation } from "react-i18next";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { DiscoverSubHeader } from "./discover-sub-header";
import { DiscoverMapCanvas } from "./discover-map-canvas";
import { DiscoverListPanel } from "./discover-list-panel";
import type { DiscoverPlace } from "./sort-utils";

// Desktop Discover — the rail frame MIRRORED (map = the subject, so it takes the
// fluid left plane; the list rail sits right at 400px). Sub-header owns the
// category + search + count. Replaces the mobile full-bleed-map + bottom-ribbon
// metaphor; map and list are co-visible, synced by selectedId.
export function DiscoverDesktop({
  action,
  actionIcon,
  places,
  center,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  onOpenPlace,
  onLocateMe,
  km,
  isLoading,
  isError,
}: {
  action: string;
  actionIcon: string | null;
  places: DiscoverPlace[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenPlace: (id: string) => void;
  onLocateMe: () => void;
  km: number;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation("discover");

  const rail = isLoading ? (
    <p className="p-6 text-sm text-on-surface-variant">{t("loading")}</p>
  ) : isError ? (
    <p className="p-6 text-sm text-on-surface-variant">{t("error")}</p>
  ) : (
    <DiscoverListPanel
      places={places}
      selectedId={selectedId}
      onSelect={onSelect}
      onOpenPlace={onOpenPlace}
      placeholderIcon={actionIcon}
      action={action}
      km={km}
    />
  );

  return (
    <DesktopAppShell
      frame="rail"
      railSide="right"
      railWidth="400px"
      subHeader={
        <DiscoverSubHeader
          action={action}
          search={search}
          onSearchChange={onSearchChange}
          count={places.length}
        />
      }
      rail={rail}
    >
      <div className="h-[calc(100svh-9rem)] min-h-[500px]">
        <DiscoverMapCanvas
          places={places}
          center={center}
          selectedId={selectedId}
          onSelect={onSelect}
          onLocateMe={onLocateMe}
        />
      </div>
    </DesktopAppShell>
  );
}
