import * as React from "react";
import { MapPin } from "lucide-react";
import type { PlaceMediaAttribution } from "./use-place-detail";

interface HeroProps {
  imageUrl: string;
  title: string;
  attribution?: PlaceMediaAttribution | null;
}

export function Hero({ imageUrl, title, attribution }: HeroProps) {
  const hasImage = Boolean(imageUrl);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
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
          <MapPin size={48} className="text-primary/40" aria-hidden="true" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <h1
        className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-white leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      {hasImage && attribution && (
        <a
          href={attribution.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] leading-tight text-white/80 hover:text-white"
        >
          © {attribution.author} · {attribution.license}
        </a>
      )}
    </div>
  );
}
