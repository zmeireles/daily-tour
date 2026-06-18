import * as React from "react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand-lockup";

export type BrandAppBarProps = {
  // Slot rendered at the right edge — screens pass <LocaleSwitcher/> and/or
  // an avatar here. Pure presentational; no behaviour of its own.
  right?: React.ReactNode;
  className?: string;
};

// Sticky top app bar with the Daily Tour brand lockup on the left and a
// caller-supplied slot on the right.
export function BrandAppBar({ right, className }: BrandAppBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between gap-3 bg-surface/80 px-6 py-3 backdrop-blur",
        className,
      )}
    >
      <BrandLockup size="bar" />
      {right}
    </header>
  );
}
