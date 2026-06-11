import * as React from "react";
import type { PlaceMediaAttribution } from "./use-place-detail";

interface HeroProps {
  imageUrl: string;
  title: string;
  attribution?: PlaceMediaAttribution | null;
}

export function Hero({ imageUrl, title, attribution }: HeroProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
      <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <h1
        className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-white leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      {attribution && (
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
