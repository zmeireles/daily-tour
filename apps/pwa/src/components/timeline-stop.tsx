import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStop {
  id: string;
  time: string;
  kind: "meal" | "activity" | "transit";
  name: string;
  description?: string;
  duration_min?: number;
  // Drive time from the previous stop (minutes). Absent on the first stop.
  travel_to_minutes?: number;
}

const DOT_CLASS: Record<TourStop["kind"], string> = {
  meal: "bg-[var(--sun-400)]",
  activity: "bg-[var(--tea-500)]",
  transit: "bg-[var(--basalt-300)]",
};

const CONNECTOR_CLASS: Record<TourStop["kind"], string> = {
  meal: "border-l-2 border-[var(--tea-300)]",
  activity: "border-l-2 border-[var(--tea-300)]",
  transit: "border-l-2 border-dashed border-[var(--basalt-300)]",
};

interface TimelineStopProps {
  stop: TourStop;
  isLast: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function TimelineStop({ stop, isLast, dragHandleProps }: TimelineStopProps) {
  return (
    <div className="flex relative">
      {/* time gutter — 64px, tabular-nums, doubles as drag handle */}
      <div
        className="w-16 shrink-0 pt-2 pr-3 text-right tabular-nums text-sm text-muted-foreground"
        {...dragHandleProps}
      >
        {stop.time}
      </div>

      {/* dot + connector */}
      <div className="relative flex flex-col items-center">
        <span
          data-kind={stop.kind}
          className={cn("mt-2.5 h-3 w-3 shrink-0 rounded-full", DOT_CLASS[stop.kind])}
          aria-hidden="true"
        />
        {!isLast && <div className={cn("w-0 flex-1 min-h-8", CONNECTOR_CLASS[stop.kind])} />}
      </div>

      {/* content card */}
      <div className="flex-1 pb-4 pl-3">
        {stop.travel_to_minutes != null && stop.travel_to_minutes > 0 && (
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <Car className="h-3 w-3 shrink-0" aria-hidden="true" />
            {stop.travel_to_minutes} min
          </p>
        )}
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <p className="text-sm font-medium leading-snug">{stop.name}</p>
          {stop.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{stop.description}</p>
          )}
          {stop.duration_min != null && (
            <p className="mt-1 text-xs text-muted-foreground">{stop.duration_min} min</p>
          )}
        </div>
      </div>
    </div>
  );
}
