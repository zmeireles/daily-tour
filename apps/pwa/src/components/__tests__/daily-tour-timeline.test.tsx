import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DailyTourTimeline, type TourStop } from "@/components/daily-tour-timeline";

let capturedOnReorder: ((stops: TourStop[]) => void) | null = null;

vi.mock("motion/react", () => ({
  Reorder: {
    Group: ({
      children,
      onReorder,
      values: _values,
      axis: _axis,
      ...props
    }: {
      children: React.ReactNode;
      onReorder: (stops: TourStop[]) => void;
      values: TourStop[];
      axis: string;
      [key: string]: unknown;
    }) => {
      capturedOnReorder = onReorder;
      return <ul {...props}>{children}</ul>;
    },
    Item: ({
      children,
      value: _value,
      dragListener: _dl,
      dragControls: _dc,
      ...props
    }: {
      children: React.ReactNode;
      value: TourStop;
      dragListener?: boolean;
      dragControls?: unknown;
      [key: string]: unknown;
    }) => <li {...props}>{children}</li>,
  },
  useDragControls: () => ({ start: vi.fn() }),
}));

const stops: TourStop[] = [
  { id: "s1", time: "09:00", kind: "meal", name: "Breakfast at Tasca", description: "Local eggs" },
  { id: "s2", time: "10:30", kind: "activity", name: "Sete Cidades hike", duration_min: 90 },
  { id: "s3", time: "13:00", kind: "transit", name: "Drive to Furnas", duration_min: 45 },
];

beforeEach(() => {
  capturedOnReorder = null;
});

describe("DailyTourTimeline", () => {
  it("renders all stops with names and times", () => {
    render(<DailyTourTimeline stops={stops} />);

    expect(screen.getByText("Breakfast at Tasca")).toBeInTheDocument();
    expect(screen.getByText("Sete Cidades hike")).toBeInTheDocument();
    expect(screen.getByText("Drive to Furnas")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
    expect(screen.getByText("13:00")).toBeInTheDocument();
    expect(screen.getByText("90 min")).toBeInTheDocument();
  });

  it("renders drive time from the previous stop, but not on the first stop", () => {
    const withTravel: TourStop[] = [
      { id: "a", time: "09:00", kind: "activity", name: "Stop A" },
      { id: "b", time: "10:00", kind: "activity", name: "Stop B", travel_to_minutes: 14 },
      { id: "c", time: "11:00", kind: "activity", name: "Stop C", travel_to_minutes: 0 },
    ];
    render(<DailyTourTimeline stops={withTravel} />);

    // Second stop shows its inbound drive time; first stop and the zero-travel
    // stop render no travel affordance.
    expect(screen.getByText("14 min")).toBeInTheDocument();
    expect(screen.queryByText("0 min")).not.toBeInTheDocument();
  });

  it("calls onReorder and rerenders in new order after drag completes", () => {
    const onReorder = vi.fn();
    render(<DailyTourTimeline stops={stops} onReorder={onReorder} />);

    const reordered = [stops[2], stops[0], stops[1]];
    act(() => {
      capturedOnReorder!(reordered);
    });

    expect(onReorder).toHaveBeenCalledWith(reordered);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Drive to Furnas");
    expect(items[1]).toHaveTextContent("Breakfast at Tasca");
    expect(items[2]).toHaveTextContent("Sete Cidades hike");
  });

  it("applies correct dot class per stop kind", () => {
    render(<DailyTourTimeline stops={stops} />);

    const dots = document.querySelectorAll("[data-kind]");
    expect(dots[0].getAttribute("data-kind")).toBe("meal");
    expect(dots[0].className).toMatch(/bg-\[var\(--sun-400\)\]/);

    expect(dots[1].getAttribute("data-kind")).toBe("activity");
    expect(dots[1].className).toMatch(/bg-\[var\(--tea-500\)\]/);

    expect(dots[2].getAttribute("data-kind")).toBe("transit");
    expect(dots[2].className).toMatch(/bg-\[var\(--basalt-300\)\]/);
  });
});
