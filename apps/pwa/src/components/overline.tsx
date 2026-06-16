import * as React from "react";
import { cn } from "@/lib/utils";

export type OverlineProps = {
  children: React.ReactNode;
  // "md" (default) = text-sm, "sm" = text-xs.
  size?: "sm" | "md";
  className?: string;
};

// Uppercase Inter eyebrow label — e.g. "NATURAL LANDMARK · 14 KM".
// Colour defaults to text-on-surface-variant and can be overridden via
// className (twMerge resolves the conflict in favour of the override).
export function Overline({ children, size = "md", className }: OverlineProps) {
  return (
    <span
      className={cn(
        "font-medium uppercase tracking-[0.05em] text-on-surface-variant",
        size === "md" ? "text-sm" : "text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}
