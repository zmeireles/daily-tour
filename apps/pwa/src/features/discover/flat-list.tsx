import * as React from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { PlaceCard } from "@/components/place-card";
import type { DiscoverPlace, SortBy } from "./sort-utils";
import { sortPlaces } from "./sort-utils";

export const VIRTUALISE_THRESHOLD = 30;
const ITEM_SIZE = 340;
const LIST_HEIGHT = typeof window !== "undefined" ? Math.max(window.innerHeight - 220, 400) : 600;

type FlatListProps = {
  places: DiscoverPlace[];
  sortBy: SortBy;
};

export function FlatList({ places, sortBy }: FlatListProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const sorted = React.useMemo(
    () => sortPlaces(places, sortBy, i18n.language),
    [places, sortBy, i18n.language],
  );

  function renderCard(place: DiscoverPlace) {
    return (
      <PlaceCard
        id={place.id}
        name={place.name}
        description={place.description}
        heroImageUrl={place.hero_image_url}
        distanceKm={place.distance_km}
        wishes={place.wishes}
        actions={place.wishes.map((w) => ({ slug: w, icon: "MapPin" }))}
        onPress={() => void navigate(`/p/${place.id}`)}
      />
    );
  }

  if (sorted.length >= VIRTUALISE_THRESHOLD) {
    const Row = ({ index, style }: ListChildComponentProps) => {
      const place = sorted[index];
      if (!place) return null;
      return (
        <div style={{ ...style, paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}>
          {renderCard(place)}
        </div>
      );
    };

    return (
      <FixedSizeList
        height={LIST_HEIGHT}
        width="100%"
        itemCount={sorted.length}
        itemSize={ITEM_SIZE}
      >
        {Row}
      </FixedSizeList>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {sorted.map((place) => (
        <React.Fragment key={place.id}>{renderCard(place)}</React.Fragment>
      ))}
    </div>
  );
}
