import * as React from "react";
import * as LucideIcons from "lucide-react";
import { Inbox, type LucideProps } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Accepts either a ready-made lucide element (<Inbox />) or an icon name string
// resolved against the lucide set — same convention as place-card's DynamicIcon.
export type EmptyStateProps = {
  icon: React.ReactNode | string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
};

function renderIcon(icon: React.ReactNode | string): React.ReactNode {
  if (typeof icon !== "string") return icon;
  const IconComp = (LucideIcons as unknown as Record<string, React.FC<LucideProps>>)[icon];
  const Resolved = IconComp ?? Inbox;
  return <Resolved className="size-6" aria-hidden="true" />;
}

// Centered, calm empty-state for backoffice lists: an icon, a title, a short
// explanation, and an optional next-step CTA. Uses the shared Card surface.
export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed shadow-none", className)}>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {renderIcon(icon)}
        </span>
        <h2 className="font-display text-lg text-on-surface">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        {ctaLabel && ctaHref ? (
          <Link to={ctaHref} className={cn(buttonVariants(), "mt-1")}>
            {ctaLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
