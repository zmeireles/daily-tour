import { cn } from "@/lib/utils";
import { formatDistanceKm } from "@/lib/format-distance";

export type DistanceChipProps = {
  km: number;
  // When true (default), prepend a small hydrangea dot before the label.
  withDot?: boolean;
  className?: string;
  // Optional accessible label override. PlaceCard passes "5.2 km away" so
  // screen readers announce intent rather than the bare "5.2 km" label.
  "aria-label"?: string;
};

// Hydrangea pill showing a formatted distance — e.g. "9 km" / "200 m".
// Shares formatDistanceKm with PlaceCard so the two never drift.
export function DistanceChip({
  km,
  withDot = true,
  className,
  "aria-label": ariaLabel,
}: DistanceChipProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-tertiary-container px-2 py-0.5 text-xs font-medium text-on-tertiary-container",
        className,
      )}
    >
      {withDot && <span className="h-1.5 w-1.5 rounded-full bg-tertiary" aria-hidden="true" />}
      {formatDistanceKm(km)}
    </span>
  );
}
