import * as React from "react";
import { cn } from "@/lib/utils";
import { DesktopTopNav } from "@/components/desktop-top-nav";

export type DesktopFrame = "contained" | "rail";

// The single desktop frame controller every *Desktop screen mounts inside. Owns
// the masthead nav and one of two container modes:
//  - "contained" (default): centered max-w-1200 editorial column (Home, Place
//    Detail body, Tour intake, Chat).
//  - "rail": a persistent 300px left ContextRail + a fluid content column that
//    DROPS the max-w cap and goes edge-to-edge (Discover map, Tour route map).
// There is no footer element ≥ breakpoint, so nothing is viewport-pinned to
// collide with the full-height rail. Mounted only in desktop mode (the route
// gates via ResponsiveScreen); below the floor the untouched mobile tree renders.
export function DesktopAppShell({
  frame = "contained",
  rail,
  subHeader,
  children,
  className,
}: {
  frame?: DesktopFrame;
  rail?: React.ReactNode;
  subHeader?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <DesktopTopNav />

      {subHeader && (
        <div className="sticky top-20 z-20 border-b border-outline-variant bg-surface/80 backdrop-blur">
          <div className="mx-auto max-w-[1200px] px-8 xl:px-12">{subHeader}</div>
        </div>
      )}

      <main className={cn("flex-1", className)}>
        {frame === "rail" ? (
          <div className="grid grid-cols-[300px_1fr]">
            <aside className="sticky top-20 h-[calc(100svh-5rem)] overflow-y-auto border-r border-outline-variant bg-surface-container-low">
              {rail}
            </aside>
            {/* fluid, edge-to-edge content column — no max-w cap */}
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1200px] px-8 pt-12 xl:px-12">{children}</div>
        )}
      </main>
    </div>
  );
}
