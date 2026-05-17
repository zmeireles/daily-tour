import * as React from "react";

interface HeroProps {
  imageUrl: string;
  title: string;
}

export function Hero({ imageUrl, title }: HeroProps) {
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
    </div>
  );
}
