import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Branded right-rail planning panel — the whole card is the link (mirrors the
// mobile PremiumStubs pattern). Promotes the ex-full-width Home CTA rows into
// clear editorial secondaries. "filled" = tea-green hero card (Planear o meu
// dia); "tonal" = quiet surface card (Falar com o Miguel, Avatar "M").
export function DesktopPlanPanel({
  title,
  supportingLine,
  href,
  variant = "filled",
  avatar,
}: {
  title: string;
  supportingLine: string;
  href: string;
  variant?: "filled" | "tonal";
  avatar?: string;
}) {
  const filled = variant === "filled";
  return (
    <Link
      to={href}
      className={cn(
        "group flex min-h-[44px] flex-col gap-2 rounded-xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        filled
          ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container",
      )}
    >
      <div className="flex items-center gap-2">
        {avatar && (
          <Avatar className="size-7">
            <AvatarFallback
              className={cn(
                "text-xs font-medium",
                filled
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {avatar}
            </AvatarFallback>
          </Avatar>
        )}
        <h3 className="font-display text-xl leading-tight">{title}</h3>
        <ChevronRight
          size={20}
          aria-hidden="true"
          className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <p
        className={cn("text-sm", filled ? "text-primary-foreground/80" : "text-on-surface-variant")}
      >
        {supportingLine}
      </p>
    </Link>
  );
}
