import * as React from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type BackLinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
};

// Editorial back affordance — a lucide ArrowLeft + label in tea-green, medium
// weight, NO underline, with a subtle "slide back" micro-motion on hover.
// Replaces the bare Unicode "←" text links that clashed with the design system
// (DESIGN.md bans bare arrows; the editorial style has no underlined links).
export function BackLink({ to, children, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80",
        className,
      )}
    >
      <ArrowLeft
        size={16}
        aria-hidden="true"
        className="shrink-0 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
      />
      {children}
    </Link>
  );
}
