import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const STEPS = [1, 3, 5, 10, 25] as const;
const MIN = 1;
const MAX = 25;

function snapToNearest(v: number): number {
  return STEPS.reduce((prev, curr) => (Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev));
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
  value: number;
  onChange: (v: number) => void;
  debounceMs?: number;
};

export function RangeSlider({ value, onChange, debounceMs = 250 }: RangeSliderProps) {
  const [displayValue, setDisplayValue] = React.useState(() => snapToNearest(value));
  const debouncedOnChange = useDebounce(onChange, debounceMs);

  React.useEffect(() => {
    setDisplayValue(snapToNearest(value));
  }, [value]);

  function handleValueChange(values: number[]) {
    const raw = values[0];
    if (raw === undefined) return;
    const snapped = snapToNearest(raw);
    setDisplayValue(snapped);
    debouncedOnChange(snapped);
  }

  const thumbPct = ((displayValue - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="relative px-2 pt-8 pb-2">
      {/* Value label above thumb */}
      <div
        className={cn(
          "absolute top-0 -translate-x-1/2 text-xs tabular-nums text-foreground font-medium",
          "pointer-events-none select-none",
        )}
        style={{ left: `calc(${thumbPct}% + 0.5rem)` }}
        aria-live="polite"
        aria-label={`${displayValue} km`}
        data-testid="range-slider-value"
      >
        {displayValue} km
      </div>

      <Slider
        min={MIN}
        max={MAX}
        step={1}
        value={[displayValue]}
        onValueChange={handleValueChange}
        thumbAriaLabel={`Distance: ${displayValue} km`}
      />
    </div>
  );
}
