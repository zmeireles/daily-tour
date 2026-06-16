import { Car, MapPin, Utensils, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStop {
  id: string;
  time: string;
  kind: "meal" | "activity" | "transit";
  name: string;
  description?: string;
  duration_min?: number;
  // Drive time from the previous stop (minutes). Absent on the first stop.
  travel_to_minutes?: number;
  // First image media URL for this stop's place, or null/absent when none.
  // Drives the editorial thumbnail; missing → branded tea-green fallback.
  hero_image_url?: string | null;
}

// Icon shown in the photo-less fallback panel, by stop kind.
const KIND_ICON: Record<TourStop["kind"], LucideIcon> = {
  meal: Utensils,
  activity: MapPin,
  transit: MapPin,
};

interface TimelineStopProps {
  stop: TourStop;
  isLast: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

// Square rounded thumbnail: real photo when available, else a branded
// tea-green panel with a kind icon (mirrors place-card's HeroPlaceholder
// approach so photo-less stops still look intentional).
function StopThumbnail({ stop }: { stop: TourStop }) {
  if (stop.hero_image_url) {
    return (
      <img
        src={stop.hero_image_url}
        alt={stop.name}
        loading="lazy"
        className="size-16 shrink-0 rounded-xl object-cover"
        data-testid="timeline-stop-thumb"
      />
    );
  }
  const Icon = KIND_ICON[stop.kind];
  return (
    <div
      className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/15"
      role="img"
      aria-label={`${stop.name} — image coming soon`}
      data-testid="timeline-stop-thumb-fallback"
    >
      <Icon className="size-6 text-primary" aria-hidden="true" />
    </div>
  );
}

export function TimelineStop({ stop, isLast, dragHandleProps }: TimelineStopProps) {
  const hasTravel = stop.travel_to_minutes != null && stop.travel_to_minutes > 0;

  return (
    <div className="flex flex-col">
      {/* Inbound-travel connector — sun-amber pill, only when present. */}
      {hasTravel && (
        <p
          className="mb-2 ml-2 inline-flex w-fit items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-xs tabular-nums text-on-surface-variant"
          data-testid="timeline-stop-connector"
        >
          <Car className="size-3 shrink-0 text-[var(--sun-400)]" aria-hidden="true" />
          {stop.travel_to_minutes} min
        </p>
      )}

      <article className={cn("relative flex items-start gap-4", isLast ? "pb-2" : "pb-8")}>
        {/* Node dot — tea-green with a canvas-colour ring. */}
        <span
          data-kind={stop.kind}
          className="absolute -left-[1.625rem] top-6 z-10 size-3 rounded-full bg-primary ring-4 ring-surface"
          aria-hidden="true"
        />

        <StopThumbnail stop={stop} />

        {/* Content column — name, tea-green time, one-line description. The
            content doubles as the drag handle (preserves reorder UX). */}
        <div className="min-w-0 flex-1" {...dragHandleProps}>
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-lg leading-tight text-on-surface">{stop.name}</h3>
            <span className="shrink-0 text-sm tabular-nums text-primary">{stop.time}</span>
          </div>
          {stop.description && (
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              {stop.description}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
