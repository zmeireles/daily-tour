import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { PlaceCard } from "@/components/place-card";
import { DesktopPlanPanel } from "@/features/home/desktop-plan-panel";
import type { DiscoverPlace } from "@/features/discover/sort-utils";
import { cn } from "@/lib/utils";

// BAND 3 — two-column body: host's-picks as the dominant fluid LEFT rail (fills
// the canvas, killing the dead right-cream) + a RIGHT sidebar of two branded
// plan panels reading as clear secondaries. Picks render as the UNFORKED
// PlaceCard "overlay" at the grid-cell width (size variant by wrapper only).
export function HomeBodyGrid({ picks }: { picks: DiscoverPlace[] }) {
  const { t } = useTranslation("discover");
  const { t: tHome } = useTranslation("home");
  const navigate = useNavigate();
  const hasPicks = picks.length > 0;

  return (
    <div className={cn("grid grid-cols-1 gap-block", hasPicks && "xl:grid-cols-[1fr_360px]")}>
      {hasPicks && (
        <section aria-label={t("hosts_picks.title")}>
          <h2 className="font-display text-2xl leading-tight text-on-surface">
            {t("hosts_picks.title")}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("hosts_picks.subtitle")}</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
            {picks.map((p) => (
              <li key={p.id}>
                <PlaceCard
                  id={p.id}
                  name={p.name}
                  description={p.description}
                  heroImageUrl={p.hero_image_url}
                  distanceKm={p.distance_km}
                  wishes={p.wishes}
                  actions={p.wishes.map((w) => ({ slug: w, icon: "MapPin" }))}
                  variant="overlay"
                  onPress={() => void navigate(`/p/${p.id}`)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <DesktopPlanPanel
          title={tHome("premium.plan_my_day")}
          supportingLine={tHome("premium.plan_my_day_sub")}
          href="/tour/new"
          variant="filled"
        />
        <DesktopPlanPanel
          title={tHome("premium.message_host")}
          supportingLine={tHome("premium.message_host_sub")}
          href="/chat"
          variant="tonal"
          avatar="M"
        />
      </div>
    </div>
  );
}
