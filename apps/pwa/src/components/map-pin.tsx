import * as React from "react";
import { cn } from "@/lib/utils";

// Teardrop path in viewBox "0 0 24 30": circle center at (12,11) r≈10, tip at y=29
const PIN_PATH = "M12 1C6.48 1 2 5.48 2 11c0 8.25 10 19 10 19s10-10.75 10-19C22 5.48 17.52 1 12 1z";

export type MapPinProps = {
  selected?: boolean;
  size?: number;
  className?: string;
  "aria-label"?: string;
};

export function MapPin({
  selected = false,
  size = 32,
  className,
  "aria-label": ariaLabel = "Map marker",
}: MapPinProps) {
  const renderSize = selected ? Math.round(size * 1.15) : size;
  const renderHeight = Math.round(renderSize * (30 / 24));

  return (
    <svg
      width={renderSize}
      height={renderHeight}
      viewBox="0 0 24 30"
      role="img"
      aria-label={ariaLabel}
      className={cn(className)}
      style={{ display: "block" }}
    >
      {/* Selected outer ring — rendered first (behind everything) */}
      {selected && <path d={PIN_PATH} fill="none" stroke="var(--hydrangea-400)" strokeWidth="5" />}
      {/* White halo for cluster context */}
      <path d={PIN_PATH} fill="none" stroke="white" strokeWidth="2.5" />
      {/* Basalt-black teardrop body */}
      <path d={PIN_PATH} fill="var(--basalt-950)" />
      {/* Tea-green inner dot */}
      <circle cx="12" cy="11" r="4" fill="var(--tea-500)" />
    </svg>
  );
}
