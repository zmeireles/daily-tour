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

const PHOTO_URL = "https://cdn.example.com/terra-nostra.jpg";

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
  });

  it("renders the sun-amber connector pill only when travel_to_minutes is present", () => {
    const withTravel: TourStop[] = [
      { id: "a", time: "09:00", kind: "activity", name: "Stop A" },
      { id: "b", time: "10:00", kind: "activity", name: "Stop B", travel_to_minutes: 14 },
      { id: "c", time: "11:00", kind: "activity", name: "Stop C", travel_to_minutes: 0 },
    ];
    render(<DailyTourTimeline stops={withTravel} />);

    // Exactly one connector pill — the middle stop. The first stop has no
    // inbound travel; the zero-travel stop renders no affordance.
    const connectors = screen.getAllByTestId("timeline-stop-connector");
    expect(connectors).toHaveLength(1);
    expect(connectors[0]).toHaveTextContent("14 min");
    expect(screen.queryByText("0 min")).not.toBeInTheDocument();
  });

  it("shows a photo thumbnail when hero_image_url is set, else the branded fallback", () => {
    const mixed: TourStop[] = [
      { id: "p", time: "09:00", kind: "activity", name: "With Photo", hero_image_url: PHOTO_URL },
      { id: "n", time: "10:00", kind: "meal", name: "No Photo" },
    ];
    render(<DailyTourTimeline stops={mixed} />);

    const photo = screen.getByTestId("timeline-stop-thumb");
    expect(photo).toHaveAttribute("src", PHOTO_URL);
    expect(photo).toHaveAttribute("alt", "With Photo");

    expect(screen.getByTestId("timeline-stop-thumb-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-stop-thumb")).toBe(photo);
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

  it("preserves data-kind on each node dot and renders them tea-green", () => {
    render(<DailyTourTimeline stops={stops} />);

    const dots = document.querySelectorAll("[data-kind]");
    expect(dots[0].getAttribute("data-kind")).toBe("meal");
    expect(dots[1].getAttribute("data-kind")).toBe("activity");
    expect(dots[2].getAttribute("data-kind")).toBe("transit");

    // Editorial timeline uses a uniform tea-green dot (bg-primary) for every kind.
    for (const dot of dots) {
      expect(dot.className).toMatch(/bg-primary/);
    }
  });
});
