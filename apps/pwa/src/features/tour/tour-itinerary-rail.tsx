import * as React from "react";
import { useTranslation } from "react-i18next";
import { CloudRain } from "lucide-react";
import { DailyTourTimeline, type TourStop } from "@/components/daily-tour-timeline";
import { ShareButton } from "@/features/tour/share-button";
import { StopSyncBridge } from "@/features/tour/stop-sync-bridge";
import { Overline } from "@/components/overline";
import { BackLink } from "@/components/back-link";
import { cn } from "@/lib/utils";

// The rail-frame content for the timeline stage: a DaySummaryRail header (title +
// "N paragens · ~Xh" + weather pill + numbered stop-index rows that scroll-to a
// stop and highlight its map marker) OVER the UNFORKED DailyTourTimeline (wrapped
// in a data-density="desktop" ancestor so descendant CSS bumps titles/thumbs — no
// prop fork) plus a PINNED toolbar (Partilhar + Voltar) at the rail foot.
export function TourItineraryRail({
  planId,
  stops,
  subline,
  weatherAware,
  activeStopId,
  onActivate,
}: {
  planId: string;
  stops: TourStop[];
  subline: string;
  weatherAware: boolean;
  activeStopId: string | null;
  onActivate: (id: string | null) => void;
}) {
  const { t } = useTranslation("home");
  const timelineRef = React.useRef<HTMLDivElement>(null);

  // Scroll the nth stop's <li> into view + select its marker.
  function jumpToStop(index: number, id: string) {
    const li = timelineRef.current?.querySelectorAll<HTMLLIElement>(
      ".relative > ul > li, ol > li, ul > li",
    )[index];
    li?.scrollIntoView({ behavior: "smooth", block: "center" });
    onActivate(id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {/* DaySummaryRail header */}
        <header className="flex flex-col gap-stack pb-4">
          <Overline size="sm" className="text-[var(--sun-400)]">
            {t("tour.editorial.overline")}
          </Overline>
          <h2 className="font-display text-2xl leading-tight text-on-surface">
            {t("tour.editorial.headline")}
          </h2>
          <p className="text-sm text-on-surface-variant">{subline}</p>
          {weatherAware && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface-variant">
              <CloudRain className="size-3 shrink-0 text-[var(--sun-400)]" aria-hidden="true" />
              {t("tour.status.weather_adjusted")}
            </span>
          )}
        </header>

        {/* Numbered stop-index — each row scrolls the spine to its stop + highlights
            the matching map marker. */}
        {stops.length > 0 && (
          <nav aria-label={t("tour.desktop.index_label")} className="flex flex-col gap-1 pb-6">
            {stops.map((stop, idx) => (
              <button
                key={stop.id}
                type="button"
                onClick={() => jumpToStop(idx, stop.id)}
                onPointerEnter={() => onActivate(stop.id)}
                onFocus={() => onActivate(stop.id)}
                aria-current={stop.id === activeStopId ? "true" : undefined}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  stop.id === activeStopId
                    ? "bg-surface-container font-medium text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {idx + 1}
                </span>
                <span className="truncate">{stop.name}</span>
              </button>
            ))}
          </nav>
        )}

        {/* The UNFORKED timeline. data-density="desktop" lets descendant CSS scale
            titles/thumbnails without a prop. StopSyncBridge wires hover/focus sync. */}
        <div ref={timelineRef} data-density="desktop">
          <StopSyncBridge stops={stops} onActivate={onActivate}>
            <DailyTourTimeline stops={stops} />
          </StopSyncBridge>
        </div>
      </div>

      {/* Pinned toolbar — fixes the buried-Voltar dead-end consistently at every
          desktop width. */}
      <div className="flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-4">
        <ShareButton planId={planId} editorial />
        <BackLink to="/">{t("tour.status.back")}</BackLink>
      </div>
    </div>
  );
}
