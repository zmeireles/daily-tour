import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { TourStop } from "@/components/timeline-stop";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
    i18n: { language: "pt-PT", changeLanguage: vi.fn() },
  }),
}));
// motion/react drives PlaceCard / Reorder — stub to plain DOM so jsdom can render.
vi.mock("motion/react", () => ({
  Reorder: {
    Group: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <ul className={className}>{children}</ul>
    ),
    Item: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  },
  useDragControls: () => ({ start: vi.fn() }),
}));
// MapLibre can't render in jsdom — stub the shared MapView, surfacing the additive
// pins (with their numeral labels) + route so the route map can be asserted.
vi.mock("@/components/map-view", () => ({
  MapView: ({
    pins = [],
    route,
  }: {
    pins?: { id: string; label?: string }[];
    route?: unknown[];
  }) => (
    <div
      data-testid="map-view"
      data-pin-labels={pins.map((p) => p.label ?? "").join(",")}
      data-route-len={route ? String(route.length) : "0"}
    />
  ),
}));

import { DailyTourDesktop } from "@/features/tour/daily-tour-desktop";

const STOPS: TourStop[] = [
  {
    id: "s1",
    time: "09:30",
    kind: "activity",
    name: "The View Point",
    description: "Start the morning",
    geom_lat: 37.74,
    geom_lng: -25.67,
  },
  {
    id: "s2",
    time: "10:20",
    kind: "meal",
    name: "The Escape",
    description: "A short drive",
    geom_lat: 37.8,
    geom_lng: -25.5,
  },
  // No coords — must be skipped on the map but still listed in the rail/timeline.
  { id: "s3", time: "11:10", kind: "activity", name: "The View" },
];

function renderIntake(override: Partial<React.ComponentProps<typeof DailyTourDesktop>> = {}) {
  return render(
    <MemoryRouter>
      <DailyTourDesktop
        stage="intake"
        onSubmit={() => {}}
        submitting={false}
        errorMessage={null}
        {...override}
      />
    </MemoryRouter>,
  );
}

function renderTimeline(stops: TourStop[] = STOPS) {
  return render(
    <MemoryRouter>
      <DailyTourDesktop
        stage="timeline"
        planId="plan-1"
        stops={stops}
        subline="3 paragens"
        weatherAware
      />
    </MemoryRouter>,
  );
}

describe("DailyTourDesktop — intake stage", () => {
  it("renders the masthead nav, the intake form, and the imagery panel", () => {
    renderIntake();
    expect(document.querySelector("nav[aria-label='Primary']")).not.toBeNull();
    // IntakeForm verbatim: its wish chips + submit are present.
    expect(screen.getByRole("button", { name: "tour.new.submit" })).toBeInTheDocument();
    expect(screen.getAllByTestId("editorial-imagery-panel").length).toBeGreaterThan(0);
  });

  it("surfaces the error message when the mutation failed", () => {
    renderIntake({ errorMessage: "tour.new.error" });
    expect(screen.getByRole("alert")).toHaveTextContent("tour.new.error");
  });
});

describe("DailyTourDesktop — timeline stage", () => {
  it("renders the route map and the itinerary rail with the toolbar", () => {
    renderTimeline();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
    // Pinned toolbar: Voltar (BackLink) + Partilhar (ShareButton) are present.
    expect(screen.getByText("tour.status.back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tour.share.button" })).toBeInTheDocument();
  });

  it("numbers only the stops with coordinates and draws the route between them", () => {
    renderTimeline();
    const map = screen.getByTestId("map-view");
    // Two located stops → numeral badges "1,2"; the coord-less stop is skipped.
    expect(map.getAttribute("data-pin-labels")).toBe("1,2");
    // Route LineString spans the two located stops.
    expect(map.getAttribute("data-route-len")).toBe("2");
  });

  it("lists every stop in the numbered index, including the coord-less one", () => {
    renderTimeline();
    const index = screen.getByRole("navigation", { name: "tour.desktop.index_label" });
    expect(index).toHaveTextContent("The View Point");
    expect(index).toHaveTextContent("The Escape");
    expect(index).toHaveTextContent("The View");
  });

  it("highlights a stop's index row on hover (rail→map activeStopId sync)", () => {
    renderTimeline();
    const index = screen.getByRole("navigation", { name: "tour.desktop.index_label" });
    const firstRow = index.querySelector("button")!;
    fireEvent.pointerEnter(firstRow);
    expect(firstRow).toHaveAttribute("aria-current", "true");
  });

  it("syncs activeStopId from a timeline hover via the StopSyncBridge", () => {
    renderTimeline();
    // Hovering the 2nd stop's title inside the unforked timeline should bubble to
    // the bridge's delegated pointerover and light the 2nd index row.
    const secondTitle = screen.getAllByText("The Escape")[1]!;
    fireEvent.pointerOver(secondTitle);
    const index = screen.getByRole("navigation", { name: "tour.desktop.index_label" });
    const rows = index.querySelectorAll("button");
    expect(rows[1]).toHaveAttribute("aria-current", "true");
    expect(rows[0]).not.toHaveAttribute("aria-current");
  });

  it("frames the island with no markers when no stop has coordinates", () => {
    renderTimeline([{ id: "x", time: "09:00", kind: "activity", name: "Nowhere" }]);
    const map = screen.getByTestId("map-view");
    expect(map.getAttribute("data-pin-labels")).toBe("");
    expect(map.getAttribute("data-route-len")).toBe("0");
  });
});
