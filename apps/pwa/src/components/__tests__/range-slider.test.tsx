import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RangeSlider } from "@/components/range-slider";

// Mock the shadcn Slider so we can drive onValueChange in jsdom. The slider
// value is a step index (0 = first km step … last = "entire island").
vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    onValueChange,
    value,
    min,
    max,
    thumbAriaLabel,
  }: {
    onValueChange: (v: number[]) => void;
    value: number[];
    min: number;
    max: number;
    thumbAriaLabel?: string;
  }) => (
    <input
      type="range"
      data-testid="slider-input"
      min={min}
      max={max}
      value={value?.[0] ?? min}
      aria-label={thumbAriaLabel}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}));

describe("RangeSlider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the i18n label for the initial km value", () => {
    render(<RangeSlider value={10} onChange={vi.fn()} />);
    expect(screen.getByTestId("range-slider-value")).toHaveTextContent("Within 10 km");
  });

  it("exposes one index position per step plus the entire-island terminal", () => {
    render(<RangeSlider value={10} onChange={vi.fn()} />);
    const input = screen.getByTestId("slider-input");
    // 8 km steps (indices 0–7) + 1 terminal "entire island" (index 8)
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "8");
  });

  it("snaps a non-step initial value to the nearest step label", () => {
    // 7 km → nearest step is 5 (|5-7|=2 < |10-7|=3)
    render(<RangeSlider value={7} onChange={vi.fn()} />);
    expect(screen.getByTestId("range-slider-value")).toHaveTextContent("Within 5 km");
  });

  it("maps the terminal position to the 'entire island' selection", () => {
    const onChange = vi.fn();
    render(<RangeSlider value={10} onChange={onChange} />);

    const input = screen.getByTestId("slider-input");
    act(() => {
      fireEvent.change(input, { target: { value: "8" } }); // terminal index
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByTestId("range-slider-value")).toHaveTextContent("Entire island");
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("debounces onChange and emits the km value at the chosen index", () => {
    const onChange = vi.fn();
    render(<RangeSlider value={1} onChange={onChange} debounceMs={250} />);

    const input = screen.getByTestId("slider-input");

    act(() => {
      fireEvent.change(input, { target: { value: "4" } }); // index 4 → 10 km
      vi.advanceTimersByTime(100); // below debounce threshold
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150); // total: 250ms
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(10);
  });
});
