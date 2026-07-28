import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Overline } from "@/components/overline";
import { PlaceCard } from "@/components/place-card";
import { EmptyState } from "./empty-state";
import type { DiscoverPlace } from "./sort-utils";

// The 400px right-hand list panel: a proper list landmark of stacked PlaceCards
// (no fork — the existing variant), replacing the clipped horizontal ribbon.
// Hover/focus a row → selects (syncs the map pin); a selected pin scrolls its
// row into view + rings it. The whole panel scrolls vertically — last card never
// clipped.
export function DiscoverListPanel({
  places,
  selectedId,
  onSelect,
  onOpenPlace,
  placeholderIcon,
  action,
  km,
}: {
  places: DiscoverPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenPlace: (id: string) => void;
  placeholderIcon: string | null;
  action: string;
  km: number;
}) {
  const { t } = useTranslation("discover");
  const listRef = React.useRef<HTMLOListElement>(null);

  // Pin click → scroll the matching row into view.
  React.useEffect(() => {
    if (!selectedId) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-place-id="${selectedId}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  if (places.length === 0) {
    return (
      <div className="p-6">
        <EmptyState action={action} km={km} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-stack p-4">
      <Overline size="sm" className="px-1">
        {t("map.nearby")} · {places.length}
      </Overline>
      <ol ref={listRef} aria-label={t("map.nearby")} className="flex flex-col gap-3">
        {places.map((p) => (
          <li
            key={p.id}
            data-place-id={p.id}
            onMouseEnter={() => onSelect(p.id)}
            onFocus={() => onSelect(p.id)}
            className={cn(
              "rounded-xl transition",
              p.id === selectedId &&
                "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low",
            )}
          >
            <PlaceCard
              id={p.id}
              name={p.name}
              description={p.description}
              heroImageUrl={p.hero_image_url}
              distanceKm={p.distance_km}
              wishes={p.wishes}
              actions={p.wishes.map((w) => ({ slug: w, icon: "MapPin" }))}
              placeholderIcon={placeholderIcon}
              variant="stacked"
              onPress={() => onOpenPlace(p.id)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
