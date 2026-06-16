import * as React from "react";
import { ArrowLeft, Bookmark, MapPin } from "lucide-react";
import type { PlaceMediaAttribution } from "./use-place-detail";

interface HeroProps {
  imageUrl: string;
  title: string;
  attribution?: PlaceMediaAttribution | null;
  onBack: () => void;
  backLabel: string;
  saveLabel: string;
}

// Glass circular overlay button — back + (stubbed) bookmark live on top of the
// hero photo. Shared so both stay visually consistent.
const glassButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90";

export function Hero({ imageUrl, title, attribution, onBack, backLabel, saveLabel }: HeroProps) {
  const hasImage = Boolean(imageUrl);
  return (
    <div
      className="relative h-[45vh] w-full overflow-hidden bg-muted"
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

      {/* Top overlay controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} aria-label={backLabel} className={glassButtonClass}>
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

      {hasImage && attribution && (
        <a
          href={attribution.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 left-4 rounded-md bg-black/50 px-2 py-1 text-[10px] leading-tight text-white/80 backdrop-blur-sm hover:text-white"
        >
          © {attribution.author} · {attribution.license}
        </a>
      )}
    </div>
  );
}
