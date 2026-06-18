import * as React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { FullBleed } from "@/components/full-bleed";
import { Overline } from "@/components/overline";
import { Hero } from "./hero";
import { Description } from "./description";
import { Gallery } from "./gallery";
import { DetailsCard } from "./details-card";
import { PlaceInfoRail } from "./place-info-rail";
import type { HydratedPlacePayload, PlaceMediaAttribution } from "./use-place-detail";

interface PlaceDetailDesktopProps {
  place: HydratedPlacePayload;
  // Locale-resolved display strings, computed once in the route (single data
  // source — the desktop sibling never re-derives locale logic).
  name: string;
  nameFallback: boolean;
  description: string;
  descriptionFallback: boolean;
  overlineLabel: string | null;
  wishLabels: string[];
  heroImageUrl: string;
  heroAttribution: PlaceMediaAttribution | null;
  // Deep links + WhatsApp prefill, resolved in the route.
  navigateHref: string;
  callHref: string;
  waHref: string;
}

// Desktop Place Detail — a SEPARATE sibling layout so the mobile route tree (with
// its bottom-map region) is never structurally edited. Full-bleed hero band →
// breadcrumb sub-header → title masthead → two-pane body (editorial reading
// column LEFT, sticky info+actions rail RIGHT). Mounts the contained frame and is
// the sole owner of the foundation's one FullBleed breakout.
export function PlaceDetailDesktop({
  place,
  name,
  nameFallback,
  description,
  descriptionFallback,
  overlineLabel,
  wishLabels,
  heroImageUrl,
  heroAttribution,
  navigateHref,
  callHref,
  waHref,
}: PlaceDetailDesktopProps) {
  const { t } = useTranslation("place");
  const { t: tDiscover } = useTranslation("discover");

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 py-4 text-sm">
      <Link to="/a/see" className="text-on-surface-variant transition-colors hover:text-on-surface">
        {tDiscover("title")}
      </Link>
      <ChevronRight size={14} className="text-on-surface-variant" aria-hidden="true" />
      <span aria-current="page" className="truncate text-on-surface">
        {name}
      </span>
    </nav>
  );

  return (
    <DesktopAppShell frame="contained" subHeader={breadcrumb}>
      {/* (1) FULL-BLEED HERO BAND — reused unforked; desktop crop, no overlay
          chrome (back → breadcrumb, save → rail ghost). */}
      <FullBleed className="mb-section">
        <Hero
          imageUrl={heroImageUrl}
          title={name}
          attribution={heroAttribution}
          chrome="none"
          className="h-[clamp(440px,52vh,620px)]"
        />
      </FullBleed>

      {/* (3) TITLE BAND — masthead spread. The hero carries no overlaid title,
          so this is the editorial restatement (display-LG). */}
      <header className="flex flex-col gap-stack pb-section">
        {overlineLabel && <Overline className="block text-primary">{overlineLabel}</Overline>}
        <h1 className="font-display text-display-lg leading-[0.98] text-on-surface">{name}</h1>
        {nameFallback && (
          <span
            className="inline-block w-fit rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
            aria-label="name in English (translation pending)"
          >
            {t("translation_pending")}
          </span>
        )}
        {wishLabels.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {wishLabels.map((label) => (
              <li
                key={label}
                className="rounded-full border border-tertiary-container/30 bg-tertiary-container/20 px-3 py-1 text-sm text-on-tertiary-container"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* (4) TWO-PANE BODY — editorial reading column LEFT, sticky rail RIGHT.
          min-h keeps the rail pinned from the top on short/single-image pages. */}
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-12 pb-section">
        <div className="flex min-h-[60vh] flex-col gap-block">
          <Description
            text={description}
            fallback={descriptionFallback}
            translationPendingLabel={t("translation_pending")}
          />
          <Gallery media={place.media} altFallback={name} />
          {/* Hours-only here — season lives in the rail META chip, so we pass
              season={null} to avoid showing it twice. The card self-absents when
              hours are empty. */}
          <DetailsCard
            season={null}
            hours={place.hours}
            title={t("details.title")}
            openingHoursLabel={t("details.opening_hours")}
            bestSeasonLabel={t("details.best_season")}
          />
        </div>

        <PlaceInfoRail
          navigateHref={navigateHref}
          callHref={callHref}
          waHref={waHref}
          navigateLabel={t("actions.navigate")}
          callLabel={t("actions.call")}
          messageLabel={t("actions.message")}
          saveLabel={t("save_coming_soon")}
          lat={place.geom_lat}
          lng={place.geom_lng}
          season={place.season}
          bestSeasonLabel={t("details.best_season")}
        />
      </div>
    </DesktopAppShell>
  );
}
