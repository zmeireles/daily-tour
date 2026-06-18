import * as React from "react";
import { Bookmark, Sun } from "lucide-react";
import { ActionRow } from "./action-row";
import { PlaceMap } from "./place-map";

interface PlaceInfoRailProps {
  navigateHref: string;
  callHref: string;
  waHref: string;
  navigateLabel: string;
  callLabel: string;
  messageLabel: string;
  saveLabel: string;
  lat: number;
  lng: number;
  // Localized + capitalized best-season label (e.g. "Summer"); null when unset.
  season: string | null;
  bestSeasonLabel: string;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// The sticky RIGHT info card for desktop Place Detail. Composes the col-oriented
// ActionRow (deep-links), the disabled save ghost (the desktop home of the
// suppressed Hero save button), an optional season meta chip, and the verbatim
// single-pin PlaceMap. Pins from the top via the parent's `self-start`, so it
// never floats against a void on short pages. Named apart from the foundation's
// ContextRail — this is local to this screen.
export function PlaceInfoRail({
  navigateHref,
  callHref,
  waHref,
  navigateLabel,
  callLabel,
  messageLabel,
  saveLabel,
  lat,
  lng,
  season,
  bestSeasonLabel,
}: PlaceInfoRailProps) {
  return (
    <aside className="sticky top-40 flex max-h-[calc(100svh-11rem)] flex-col gap-6 overflow-y-auto pb-2">
      {/* (a) ACTION STACK */}
      <div className="flex flex-col gap-3">
        <ActionRow
          orientation="col"
          navigateHref={navigateHref}
          callHref={callHref}
          waHref={waHref}
          navigateLabel={navigateLabel}
          callLabel={callLabel}
          messageLabel={messageLabel}
        />
        <button
          type="button"
          disabled
          aria-label={saveLabel}
          title={saveLabel}
          className="flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant opacity-70"
        >
          <Bookmark size={16} aria-hidden="true" />
          <span>{saveLabel}</span>
        </button>
      </div>

      {/* (b) META — season chip, only when populated. DistanceChip is omitted
          today: no distance field exists in the payload. */}
      {season && (
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Sun size={16} aria-hidden="true" />
            {bestSeasonLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--sun-400)]" aria-hidden="true" />
            <span className="text-sm text-on-surface-variant">{capitalize(season)}</span>
          </span>
        </div>
      )}

      {/* (c) MAP — verbatim single-pin PlaceMap */}
      <PlaceMap lat={lat} lng={lng} />
    </aside>
  );
}
