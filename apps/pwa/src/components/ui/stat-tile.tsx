import * as React from "react";
import { Link } from "react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const statTileVariants = cva(
  "rounded-lg border bg-card p-4 shadow-[var(--shadow-card)] space-y-1",
  {
    variants: {
      variant: {
        default: "border-border",
        warning: "border-amber-200/50 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-950/20",
        emphasis: "border-primary/30 bg-primary/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface StatTileProps extends VariantProps<typeof statTileVariants> {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
}

function TileBody({
  icon,
  value,
  label,
  trend,
  trendUp,
}: Pick<StatTileProps, "icon" | "value" | "label" | "trend" | "trendUp">) {
  return (
    <>
      {icon && (
        <div className="mb-2 flex h-8 w-8 items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {trend && (
        <div
          className={cn(
            "mt-1 flex items-center gap-0.5 text-xs font-medium",
            trendUp === true && "text-emerald-600 dark:text-emerald-400",
            trendUp === false && "text-destructive",
            trendUp === undefined && "text-muted-foreground",
          )}
        >
          {trendUp === true && <TrendingUpIcon className="h-3 w-3" />}
          {trendUp === false && <TrendingDownIcon className="h-3 w-3" />}
          <span>{trend}</span>
        </div>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  icon,
  trend,
  trendUp,
  onClick,
  href,
  variant,
  className,
}: StatTileProps) {
  const interactiveClasses =
    "cursor-pointer transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-11";

  if (href) {
    return (
      <Link
        to={href}
        data-slot="stat-tile"
        data-variant={variant ?? "default"}
        className={cn(
          statTileVariants({ variant }),
          interactiveClasses,
          "block no-underline",
          className,
        )}
      >
        <TileBody icon={icon} value={value} label={label} trend={trend} trendUp={trendUp} />
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-slot="stat-tile"
        data-variant={variant ?? "default"}
        className={cn(
          statTileVariants({ variant }),
          interactiveClasses,
          "w-full text-left",
          className,
        )}
      >
        <TileBody icon={icon} value={value} label={label} trend={trend} trendUp={trendUp} />
      </button>
    );
  }

  return (
    <div
      data-slot="stat-tile"
      data-variant={variant ?? "default"}
      className={cn(statTileVariants({ variant }), className)}
    >
      <TileBody icon={icon} value={value} label={label} trend={trend} trendUp={trendUp} />
    </div>
  );
}

export { StatTile, statTileVariants };
