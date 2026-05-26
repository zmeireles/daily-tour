import * as React from "react";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// São Miguel is ~65 km across; 80 km covers it, well under the BFF's 200 km cap.
// Used when the terminal "Entire island" position is selected.
export const ISLAND_KM = 80;

// A distance selection is either a concrete km radius or the terminal
// "entire island" sentinel (∞), which maps to ISLAND_KM when sent to the BFF.
export type KmSelection = number | "all";

// Discrete km radii the slider snaps to, in ascending order.
const KM_STEPS = [1, 2, 3, 5, 10, 15, 20, 30] as const;

// Ordered thumb positions: every km step followed by the "entire island" terminal.
// The slider is index-based over this array, so positions/ticks are evenly spaced.
const POSITIONS: readonly KmSelection[] = [...KM_STEPS, "all"];
const LAST_INDEX = POSITIONS.length - 1;

// Numeric labels shown under a few key stops (indices into KM_STEPS) to orient
// the user without cluttering every tick. The terminal renders "∞" separately.
const TICK_LABELS: Record<number, string> = { 0: "1", 4: "10", 7: "30" };

export function isEntireIsland(sel: KmSelection): sel is "all" {
  return sel === "all";
}

// Map a selection to its slider index. A numeric value that isn't an exact step
// snaps to the nearest one, keeping an arbitrary incoming default safe.
function selectionToIndex(sel: KmSelection): number {
  if (isEntireIsland(sel)) return LAST_INDEX;
  let best = 0;
  for (let i = 1; i < KM_STEPS.length; i += 1) {
    if (Math.abs(KM_STEPS[i]! - sel) < Math.abs(KM_STEPS[best]! - sel)) best = i;
  }
  return best;
}

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  const debouncedFn = React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return debouncedFn;
}

export type RangeSliderProps = {
  value: KmSelection;
  onChange: (v: KmSelection) => void;
  debounceMs?: number;
};

export function RangeSlider({ value, onChange, debounceMs = 250 }: RangeSliderProps) {
  const { t } = useTranslation("discover");
  const [index, setIndex] = React.useState(() => selectionToIndex(value));
  const debouncedOnChange = useDebounce(onChange, debounceMs);

  React.useEffect(() => {
    setIndex(selectionToIndex(value));
  }, [value]);

  function handleValueChange(values: number[]) {
    const raw = values[0];
    if (raw === undefined) return;
    const next = Math.min(Math.max(raw, 0), LAST_INDEX);
    setIndex(next);
    debouncedOnChange(POSITIONS[next]!);
  }

  const selection = POSITIONS[index]!;
  const label = isEntireIsland(selection)
    ? t("controls.entireIsland")
    : t("controls.range", { km: selection });
  const thumbPct = (index / LAST_INDEX) * 100;

  return (
    <div className="px-2 pt-8 pb-2">
      {/* Track-aligned wrapper: label, thumb and ticks all reference its width. */}
      <div className="relative">
        {/* Floating current-value label, centered above the thumb */}
        <div
          className={cn(
            "absolute bottom-full mb-2 -translate-x-1/2 flex items-center gap-1",
            "text-xs font-medium text-foreground tabular-nums whitespace-nowrap",
            "pointer-events-none select-none",
          )}
          style={{ left: `${thumbPct}%` }}
          aria-live="polite"
          aria-label={label}
          data-testid="range-slider-value"
        >
          <MapPin size={12} className="text-primary" aria-hidden="true" />
          {label}
        </div>

        <Slider
          min={0}
          max={LAST_INDEX}
          step={1}
          value={[index]}
          onValueChange={handleValueChange}
          thumbAriaLabel={label}
        />

        {/* Tick marks: one per position, the ∞ terminal visually emphasized */}
        <div className="relative mt-2 h-5" aria-hidden="true">
          {POSITIONS.map((pos, i) => {
            const terminal = isEntireIsland(pos);
            const tickLabel = terminal ? "∞" : TICK_LABELS[i];
            return (
              <span
                key={String(pos)}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1"
                style={{ left: `${(i / LAST_INDEX) * 100}%` }}
              >
                <span
                  className={cn(
                    "block rounded-full",
                    terminal ? "h-2.5 w-0.5 bg-primary" : "h-1.5 w-px bg-muted-foreground/40",
                  )}
                />
                {tickLabel && (
                  <span
                    className={cn(
                      "text-[10px] leading-none tabular-nums",
                      terminal ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {tickLabel}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
