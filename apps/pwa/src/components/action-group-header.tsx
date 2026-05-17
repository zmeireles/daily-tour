import * as React from "react";
import * as LucideIcons from "lucide-react";
import { ChevronRight, MapPin, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionGroupHeaderProps = {
  actionSlug: string;
  actionLabel: string;
  iconName: string;
  href: string;
};

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const IconComp = (LucideIcons as unknown as Record<string, React.FC<LucideProps>>)[name];
  if (!IconComp) return <MapPin {...props} />;
  return <IconComp {...props} />;
}

export function ActionGroupHeader({
  actionSlug: _actionSlug,
  actionLabel,
  iconName,
  href,
}: ActionGroupHeaderProps) {
  return (
    <a
      href={href}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 rounded-lg",
        "hover:bg-muted transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      aria-label={actionLabel}
    >
      {/* Left: action icon + label */}
      <DynamicIcon name={iconName} size={24} className="shrink-0 text-primary" aria-hidden="true" />
      <span
        className="flex-1 font-display text-xl leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {actionLabel}
      </span>

      {/* Right: explore affordance */}
      <span className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-fast">
        <span className="hidden sm:inline">Explore</span>
        <ChevronRight
          size={18}
          aria-hidden="true"
          className="transition-transform duration-fast group-hover:rotate-90"
        />
      </span>
    </a>
  );
}
