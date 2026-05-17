import * as React from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { PlaceCard } from "@/components/place-card";
import type { DiscoverPlace } from "./sort-utils";

type Props = { places: DiscoverPlace[] };

export function HostsPicksRibbon({ places }: Props) {
  const { t } = useTranslation("discover");
  const navigate = useNavigate();

  const picks = places.filter((p) => p.is_hosts_pick);
  if (picks.length === 0) return null;

  return (
    <section aria-label={t("hosts_picks.title")} className="py-4">
      <div className="px-4 mb-2">
        <h2
          className="font-display text-lg leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hosts_picks.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("hosts_picks.subtitle")}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2">
        {picks.map((p) => (
          <div key={p.id} className="w-64 shrink-0 snap-start">
            <PlaceCard
              id={p.id}
              name={p.name}
              description={p.description}
              heroImageUrl={p.hero_image_url ?? ""}
              distanceKm={p.distance_km}
              wishes={p.wishes}
              actions={p.wishes.map((w) => ({ slug: w, icon: "MapPin" }))}
              onPress={() => void navigate(`/p/${p.id}`)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
