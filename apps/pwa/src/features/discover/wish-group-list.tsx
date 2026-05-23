import * as React from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ActionGroupHeader } from "@/components/action-group-header";
import { PlaceCard } from "@/components/place-card";
import type { WishGroup, DiscoverPlace, SortBy } from "./sort-utils";
import { sortPlaces } from "./sort-utils";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

function PlaceList({ places }: { places: DiscoverPlace[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {places.map((place) => (
        <PlaceCard
          key={place.id}
          id={place.id}
          name={place.name}
          description={place.description}
          heroImageUrl={place.hero_image_url}
          distanceKm={place.distance_km}
          wishes={place.wishes}
          actions={place.wishes.map((w) => ({ slug: w, icon: "MapPin" }))}
          onPress={() => void navigate(`/p/${place.id}`)}
        />
      ))}
    </div>
  );
}

type WishGroupListProps = {
  groups: WishGroup[];
  sortBy: SortBy;
};

export function WishGroupList({ groups, sortBy }: WishGroupListProps) {
  const { i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-6 py-4">
      {groups.map(({ wish, places }) => {
        const sorted = sortPlaces(places, sortBy, i18n.language);
        return (
          <section key={wish} aria-label={capitalize(wish)}>
            <ActionGroupHeader
              actionSlug={wish}
              actionLabel={capitalize(wish)}
              iconName="MapPin"
              href={`#${wish}`}
            />
            <PlaceList places={sorted} />
          </section>
        );
      })}
    </div>
  );
}
