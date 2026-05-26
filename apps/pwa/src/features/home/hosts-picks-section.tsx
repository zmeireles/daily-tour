import * as React from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { PlaceCard } from "@/components/place-card";
import { useSessionStore } from "@/store/session";
import type { DiscoverResponse, DiscoverPlace } from "@/features/discover/sort-utils";
import { flattenGroups } from "@/features/discover/sort-utils";

async function fetchHostsPicks(jwt: string): Promise<DiscoverPlace[]> {
  const res = await fetch("/v1/discover?action=eat", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`discover ${res.status}`);
  const data = (await res.json()) as DiscoverResponse;
  return flattenGroups(data.groups).filter((p) => p.is_hosts_pick);
}

export function HostsPicksSection() {
  const { t } = useTranslation("discover");
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);

  const { data: picks } = useQuery({
    queryKey: ["hosts-picks"],
    queryFn: () => fetchHostsPicks(jwt!),
    enabled: !!jwt,
    staleTime: 60_000,
  });

  if (!picks || picks.length === 0) return null;

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
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 scroll-px-4 pb-2">
        {picks.map((p) => (
          <div key={p.id} className="w-64 shrink-0 snap-start">
            <PlaceCard
              id={p.id}
              name={p.name}
              description={p.description}
              heroImageUrl={p.hero_image_url}
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
