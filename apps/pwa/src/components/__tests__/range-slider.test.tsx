import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RangeSlider } from "@/components/range-slider";

// Mock the shadcn Slider so we can control onValueChange in jsdom
vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    onValueChange,
    value,
    min,
    max,
    "aria-label": ariaLabel,
  }: {
    onValueChange: (v: number[]) => void;
    value: number[];
    min: number;
    max: number;
    "aria-label"?: string;
  }) => (
    <input
      type="range"
      data-testid="slider-input"
      min={min}
      max={max}
      value={value?.[0] ?? min}
      aria-label={ariaLabel}
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

  it("renders the initial value above the thumb", () => {
    render(<RangeSlider value={5} onChange={vi.fn()} />);
    expect(screen.getByTestId("range-slider-value")).toHaveTextContent("5 km");
  });

  it("snaps to nearest discrete step when the slider changes", () => {
    const onChange = vi.fn();
    render(<RangeSlider value={5} onChange={onChange} />);

    const input = screen.getByTestId("slider-input");
    // Raw value 7: nearest steps are 5 (|7-5|=2) and 10 (|7-10|=3) → snaps to 5
    fireEvent.change(input, { target: { value: "7" } });

    expect(screen.getByTestId("range-slider-value")).toHaveTextContent("5 km");
  });

  it("debounces onChange by 250 ms before firing", () => {
    const onChange = vi.fn();
    render(<RangeSlider value={1} onChange={onChange} debounceMs={250} />);

    const input = screen.getByTestId("slider-input");

    act(() => {
      fireEvent.change(input, { target: { value: "7" } });
      // Advance < debounce threshold — onChange must not have been called yet
      vi.advanceTimersByTime(100);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150); // total: 250ms
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(5); // snapped from 7 → 5
  });
});
