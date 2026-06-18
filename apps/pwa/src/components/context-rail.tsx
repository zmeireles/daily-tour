import * as React from "react";
import { Link } from "react-router";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Overline } from "@/components/overline";

// Generic content for the rail-frame's left panel (the 300px scroll/border/bg is
// owned by DesktopAppShell's <aside>). Screens compose RailSection + RailNavItem
// (or arbitrary children) for Home verbs, Discover filters, or the Tour step rail.
export function ContextRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-block p-6", className)}>{children}</div>;
}

export function RailSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-stack", className)}>
      {title && (
        <Overline size="sm" className="px-3">
          {title}
        </Overline>
      )}
      {children}
    </section>
  );
}

// A focusable rail row: whole row is a ≥44px Link (or button), icon + label, with
// a visible focus-visible ring. Used for Home's 6 verbs-as-navigation.
export function RailNavItem({
  icon: Icon,
  label,
  to,
  active,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  to?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = cn(
    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    active
      ? "bg-surface-container font-medium text-on-surface"
      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
  );
  const inner = (
    <>
      {Icon && <Icon size={18} aria-hidden="true" className="shrink-0" />}
      <span className="truncate">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} aria-current={active ? "page" : undefined} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(cls, "w-full text-left")}
    >
      {inner}
    </button>
  );
}
