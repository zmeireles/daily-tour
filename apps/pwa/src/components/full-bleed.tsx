import * as React from "react";
import { cn } from "@/lib/utils";

// The single breakout helper: lets one element escape the contained frame's
// max-width and span the full viewport width. Used ONLY by the Place-Detail
// desktop hero (its hero is already excellent full-bleed in the captures); every
// other full-bleed need (Discover/Tour maps) is served by the rail frame's
// edge-to-edge content column instead, so this hack stays isolated to one place.
export function FullBleed({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("ml-[calc(50%-50vw)] w-screen", className)}>{children}</div>;
}
