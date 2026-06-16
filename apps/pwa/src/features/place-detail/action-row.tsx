import * as React from "react";
import { Navigation, Phone, MessageCircle } from "lucide-react";

interface ActionRowProps {
  navigateHref: string;
  callHref: string;
  waHref: string;
  navigateLabel: string;
  callLabel: string;
  messageLabel: string;
}

// Editorial bordered tile — stacked icon + label, equal width via the parent grid.
const tileClass =
  "flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-3 py-4 text-on-surface transition-colors hover:bg-surface-container-high active:scale-95";

const iconClass = "text-tertiary";

export function ActionRow({
  navigateHref,
  callHref,
  waHref,
  navigateLabel,
  callLabel,
  messageLabel,
}: ActionRowProps) {
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
