import * as React from "react";
import { motion, type PanInfo } from "motion/react";
import { useTranslation } from "react-i18next";
import { PlaceCard } from "@/components/place-card";
import { cn } from "@/lib/utils";
import { ControlsBar, type GroupBy } from "./controls-bar";
import { WishGroupList } from "./wish-group-list";
import { FlatList } from "./flat-list";
import { flattenGroups, type DiscoverPlace, type SortBy, type WishGroup } from "./sort-utils";
import type { LocationValue } from "@/components/location-toggle";
import type { KmSelection } from "@/components/range-slider";
import type { VehicleMode } from "@/lib/preferences/use-vehicle-pref";

export type SheetSnap = "peek" | "expanded";

type DiscoverSheetProps = {
  groups: WishGroup[];
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  selectedId: string | null;
  onOpenPlace: (id: string) => void;
  placeholderIcon?: string | null;
  // Relocated controls — the sheet now hosts the filter cluster (D-2.D.6).
  sortBy: SortBy;
  groupBy: GroupBy;
  locValue: LocationValue;
  geolocationDenied: boolean;
  kmRange: KmSelection;
  vehicleMode: VehicleMode;
  onLocationChange: (v: LocationValue) => void;
  onKmChange: (v: KmSelection) => void;
  onSortChange: (v: SortBy) => void;
  onGroupChange: (v: GroupBy) => void;
  onVehicleChange: (v: VehicleMode) => void;
};

// Draggable bottom sheet. Two snap points: "peek" (horizontal ribbon of
// stacked PlaceCards) and "expanded" (relocated controls + full vertical list).
// The drag handle doubles as an accessible toggle button so the snap state is
// reachable by keyboard / screen reader without a drag gesture.
export function DiscoverSheet({
  groups,
  snap,
  onSnapChange,
  selectedId,
  onOpenPlace,
  placeholderIcon,
  sortBy,
  groupBy,
  locValue,
  geolocationDenied,
  kmRange,
  vehicleMode,
  onLocationChange,
  onKmChange,
  onSortChange,
  onGroupChange,
  onVehicleChange,
}: DiscoverSheetProps) {
  const { t } = useTranslation("discover");
  const ribbonRef = React.useRef<HTMLDivElement>(null);

  const places = React.useMemo(() => flattenGroups(groups), [groups]);
  const expanded = snap === "expanded";

  // Scroll the ribbon so the selected card is in view when a pin is tapped.
  React.useEffect(() => {
    if (!selectedId || expanded) return;
    const node = ribbonRef.current?.querySelector<HTMLElement>(`[data-place-id="${selectedId}"]`);
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId, expanded]);

  function toggleSnap() {
    onSnapChange(expanded ? "peek" : "expanded");
  }

  // Drag up past threshold → expand; drag down past threshold → peek.
  function handleDragEnd(_e: unknown, info: PanInfo) {
    const THRESHOLD = 60;
    if (info.offset.y < -THRESHOLD) onSnapChange("expanded");
    else if (info.offset.y > THRESHOLD) onSnapChange("peek");
  }

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={{ height: expanded ? "85%" : "45%" }}
      initial={false}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl",
        "bg-surface-container-low shadow-[0_-10px_40px_rgba(0,0,0,0.25)]",
      )}
      style={{ height: expanded ? "85%" : "45%" }}
    >
      {/* Drag handle — also an accessible toggle for keyboard users. */}
      <button
        type="button"
        onClick={toggleSnap}
        aria-expanded={expanded}
        aria-label={expanded ? t("map.collapse_sheet") : t("map.expand_sheet")}
        className="flex w-full shrink-0 cursor-grab justify-center py-3 active:cursor-grabbing"
      >
        <span className="block h-1 w-12 rounded-full bg-outline-variant" aria-hidden="true" />
      </button>

      <div className="px-4 pb-2">
        <h2
          className="font-display text-2xl leading-tight text-on-surface"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("map.nearby")}
        </h2>
      </div>

      {/* Peek: horizontal ribbon of stacked cards. Hidden when expanded. */}
      {!expanded && (
        <div
          ref={ribbonRef}
          className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4"
          aria-label={t("map.nearby")}
        >
          {places.map((place) => (
            <div
              key={place.id}
              data-place-id={place.id}
              className={cn(
                "w-64 shrink-0 snap-start rounded-xl transition-shadow",
                place.id === selectedId &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low",
              )}
            >
              <RibbonCard
                place={place}
                placeholderIcon={placeholderIcon}
                onPress={() => onOpenPlace(place.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Expanded: relocated controls + full grouped/flat list. */}
      {expanded && (
        <div className="flex-1 overflow-y-auto">
          <ControlsBar
            locValue={locValue}
            geolocationDenied={geolocationDenied}
            kmRange={kmRange}
            sortBy={sortBy}
            groupBy={groupBy}
            vehicleMode={vehicleMode}
            onLocationChange={onLocationChange}
            onKmChange={onKmChange}
            onSortChange={onSortChange}
            onGroupChange={onGroupChange}
            onVehicleChange={onVehicleChange}
          />
          {groupBy === "grouped" ? (
            <WishGroupList groups={groups} sortBy={sortBy} placeholderIcon={placeholderIcon} />
          ) : (
            <FlatList places={places} sortBy={sortBy} placeholderIcon={placeholderIcon} />
          )}
        </div>
      )}
    </motion.div>
  );
}

function RibbonCard({
  place,
  placeholderIcon,
  onPress,
}: {
  place: DiscoverPlace;
  placeholderIcon?: string | null;
  onPress: () => void;
}) {
  return (
    <PlaceCard
      id={place.id}
      name={place.name}
      description={place.description}
      heroImageUrl={place.hero_image_url}
      distanceKm={place.distance_km}
      wishes={place.wishes}
      actions={place.wishes.map((w) => ({ slug: w, icon: "MapPin" }))}
      placeholderIcon={placeholderIcon}
      variant="stacked"
      onPress={onPress}
    />
  );
}
