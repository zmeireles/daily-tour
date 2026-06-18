import * as React from "react";
import { ArrowLeft, Bookmark, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceMediaAttribution } from "./use-place-detail";

interface HeroProps {
  imageUrl: string;
  title: string;
  attribution?: PlaceMediaAttribution | null;
  onBack?: () => void;
  backLabel?: string;
  saveLabel?: string;
  // Overlay controls. "full" (default) keeps the mobile glass back/save buttons;
  // "none" suppresses them — desktop replaces back with the breadcrumb and save
  // with a rail ghost, so the photo carries no overlaid chrome.
  chrome?: "full" | "none";
  // Optional crop override. Default keeps the mobile h-[45vh]; desktop passes a
  // taller clamped crop for the full-bleed band.
  className?: string;
}

// Glass circular overlay button — back + (stubbed) bookmark live on top of the
// hero photo. Shared so both stay visually consistent.
const glassButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90";

export function Hero({
  imageUrl,
  title,
  attribution,
  onBack,
  backLabel,
  saveLabel,
  chrome = "full",
  className,
}: HeroProps) {
  const hasImage = Boolean(imageUrl);
  return (
    <div
      className={cn("relative h-[45vh] w-full overflow-hidden bg-muted", className)}
      role="region"
      aria-label={title}
    >
      {hasImage ? (
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      ) : (
        // Branded "photo coming soon" fallback — places without a real hero
        // (e.g. owner-pending businesses) get an intentional on-brand panel
        // instead of a placeholder stock photo or a broken image.
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-primary/15"
          role="img"
          aria-label={`${title} — photo coming soon`}
          data-testid="place-hero-placeholder"
        >
          <MapPin size={56} className="text-primary/40" aria-hidden="true" />
        </div>
      )}

      {/* Basalt gradient scrim — anchors the overlay controls + attribution. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

      {/* Top overlay controls — suppressed when chrome="none" (desktop moves
          back to the breadcrumb + save to the rail ghost). */}
      {chrome === "full" && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className={glassButtonClass}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled
            aria-label={saveLabel}
            className={`${glassButtonClass} cursor-not-allowed opacity-50`}
          >
            <Bookmark size={20} aria-hidden="true" />
          </button>
        </div>
      )}

      {hasImage && attribution && (
        <a
          href={attribution.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 left-4 rounded-md bg-on-surface/90 px-2 py-1 text-[10px] leading-tight text-surface backdrop-blur-sm hover:text-surface/80"
        >
          © {attribution.author} · {attribution.license}
        </a>
      )}
    </div>
  );
}
