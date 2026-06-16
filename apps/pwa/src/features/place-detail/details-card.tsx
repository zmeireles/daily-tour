import * as React from "react";
import { Clock, Sun } from "lucide-react";

export interface PlaceHours {
  dow: number;
  open: string;
  close: string;
}

interface DetailsCardProps {
  season: string | null;
  hours: PlaceHours[];
  title: string;
  openingHoursLabel: string;
  bestSeasonLabel: string;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHours(hours: PlaceHours[]): string {
  return hours.map((h) => `${DOW_LABELS[h.dow] ?? `Day ${h.dow}`} ${h.open}–${h.close}`).join(", ");
}

// Conditional: render ONLY when season OR non-empty hours is present. All 43
// currently-seeded places have empty season/hours, so today this card never
// shows — it's built for when owners populate the Plan-006 form fields.
export function DetailsCard({
  season,
  hours,
  title,
  openingHoursLabel,
  bestSeasonLabel,
}: DetailsCardProps) {
  const hasHours = hours.length > 0;
  const hasSeason = Boolean(season);
  if (!hasHours && !hasSeason) return null;

  return (
    <section
      className="rounded-2xl bg-surface-container-low p-6"
      aria-label={title}
      data-testid="place-details-card"
    >
      <h2 className="mb-2 font-display text-xl text-on-surface">{title}</h2>
      <ul className="divide-y divide-outline-variant">
        {hasHours && (
          <li className="flex items-start gap-4 py-4">
            <Clock size={20} className="mt-0.5 text-on-surface-variant" aria-hidden="true" />
            <div className="flex-1">
              <span className="mb-1 block text-base text-on-surface">{openingHoursLabel}</span>
              <span className="text-base text-on-surface-variant">{formatHours(hours)}</span>
            </div>
          </li>
        )}
        {hasSeason && (
          <li className="flex items-center gap-4 py-4">
            <Sun size={20} className="text-on-surface-variant" aria-hidden="true" />
            <div className="flex flex-1 items-center justify-between">
              <span className="text-base text-on-surface">{bestSeasonLabel}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-[var(--sun-400)]" aria-hidden="true" />
                <span className="text-sm text-on-surface-variant">{capitalize(season!)}</span>
              </span>
            </div>
          </li>
        )}
      </ul>
    </section>
  );
}
