import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateVariant = "cards" | "table" | "tiles" | "thread";

interface LoadingStateProps {
  variant?: LoadingStateVariant;
  count?: number;
  // `tiles` only: match the consumer's KPI grid so the skeleton doesn't reflow on
  // data arrival (beta = 4-up, Today = 3-up for its 6 tiles).
  columns?: 3 | 4;
  className?: string;
}

function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/5" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 border-b border-border pb-2 mb-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-border/50">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}

function TilesSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-3", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("flex gap-3", i % 2 !== 0 && "flex-row-reverse")}>
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className={cn("space-y-1 max-w-[70%]", i % 2 !== 0 && "items-end flex flex-col")}>
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-48 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState({ variant = "cards", count, columns, className }: LoadingStateProps) {
  return (
    <div data-slot="loading-state" data-variant={variant} className={cn("w-full", className)}>
      {variant === "cards" && <CardsSkeleton count={count} />}
      {variant === "table" && <TableSkeleton count={count} />}
      {variant === "tiles" && <TilesSkeleton count={count} columns={columns} />}
      {variant === "thread" && <ThreadSkeleton count={count} />}
    </div>
  );
}

export { LoadingState };
export type { LoadingStateVariant };
