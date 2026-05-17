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

const actionClass =
  "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-lg bg-secondary px-3 py-2 text-secondary-foreground text-xs font-medium hover:bg-secondary/80 active:scale-95 transition-transform";

export function ActionRow({
  navigateHref,
  callHref,
  waHref,
  navigateLabel,
  callLabel,
  messageLabel,
}: ActionRowProps) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <a href={navigateHref} target="_blank" rel="noopener noreferrer" className={actionClass}>
        <Navigation size={20} aria-hidden="true" />
        <span>{navigateLabel}</span>
      </a>
      <a href={callHref} className={actionClass}>
        <Phone size={20} aria-hidden="true" />
        <span>{callLabel}</span>
      </a>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className={actionClass}>
        <MessageCircle size={20} aria-hidden="true" />
        <span>{messageLabel}</span>
      </a>
    </div>
  );
}
