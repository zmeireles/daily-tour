import * as React from "react";
import { Navigation, Phone, MessageCircle } from "lucide-react";

interface ActionRowProps {
  navigateHref: string;
  callHref: string;
  waHref: string;
  navigateLabel: string;
  callLabel: string;
  messageLabel: string;
  // "row" (default) = the mobile equal-width 3-up grid (byte-identical).
  // "col" = full-width stacked tiles for the desktop info rail, with the
  // primary Navegar tile emphasized.
  orientation?: "row" | "col";
}

// Editorial bordered tile — stacked icon + label, equal width via the parent grid.
const tileClass =
  "flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-3 py-4 text-on-surface transition-colors hover:bg-surface-container-high active:scale-95";

// Stacked-rail variant — full-width horizontal tile (icon + label inline).
const stackedTileClass =
  "flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-on-surface transition-colors hover:bg-surface-container-high active:scale-[0.98]";

// Primary emphasis for the Navegar tile in the stacked rail.
const stackedPrimaryClass =
  "flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]";

const iconClass = "text-tertiary";

export function ActionRow({
  navigateHref,
  callHref,
  waHref,
  navigateLabel,
  callLabel,
  messageLabel,
  orientation = "row",
}: ActionRowProps) {
  if (orientation === "col") {
    return (
      <div className="flex flex-col gap-3">
        <a
          href={navigateHref}
          target="_blank"
          rel="noopener noreferrer"
          className={stackedPrimaryClass}
        >
          <Navigation size={20} aria-hidden="true" />
          <span className="text-sm font-medium">{navigateLabel}</span>
        </a>
        <a href={callHref} className={stackedTileClass}>
          <Phone size={20} className={iconClass} aria-hidden="true" />
          <span className="text-sm font-medium">{callLabel}</span>
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" className={stackedTileClass}>
          <MessageCircle size={20} className={iconClass} aria-hidden="true" />
          <span className="text-sm font-medium">{messageLabel}</span>
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <a href={navigateHref} target="_blank" rel="noopener noreferrer" className={tileClass}>
        <Navigation size={22} className={iconClass} aria-hidden="true" />
        <span className="text-sm font-medium">{navigateLabel}</span>
      </a>
      <a href={callHref} className={tileClass}>
        <Phone size={22} className={iconClass} aria-hidden="true" />
        <span className="text-sm font-medium">{callLabel}</span>
      </a>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className={tileClass}>
        <MessageCircle size={22} className={iconClass} aria-hidden="true" />
        <span className="text-sm font-medium">{messageLabel}</span>
      </a>
    </div>
  );
}
