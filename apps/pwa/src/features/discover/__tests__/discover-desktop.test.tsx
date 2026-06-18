import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { DiscoverPlace } from "@/features/discover/sort-utils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));
// MapLibre can't render in jsdom — stub the shared MapView.
vi.mock("@/components/map-view", () => ({ MapView: () => <div data-testid="map-view" /> }));

import { DiscoverDesktop } from "@/features/discover/discover-desktop";

const PLACES: DiscoverPlace[] = [
  {
    id: "p1",
    name: { en: "Lagoa do Fogo" },
    description: { en: "" },
    hero_image_url: null,
    wishes: [],
    geom_lat: 37.7,
    geom_lng: -25.5,
  },
  {
    id: "p2",
    name: { en: "Sete Cidades" },
    description: { en: "" },
    hero_image_url: null,
    wishes: [],
    geom_lat: 37.8,
    geom_lng: -25.8,
  },
];

function renderDesktop(override: Partial<React.ComponentProps<typeof DiscoverDesktop>> = {}) {
  return render(
    <MemoryRouter>
      <DiscoverDesktop
        action="see"
        actionIcon="Eye"
        places={PLACES}
        center={{ lat: 37.74, lng: -25.67 }}
        selectedId={null}
        onSelect={() => {}}
        search=""
        onSearchChange={() => {}}
        onOpenPlace={() => {}}
        onLocateMe={() => {}}
        km={20}
        isLoading={false}
        isError={false}
        {...override}
      />
    </MemoryRouter>,
  );
}

describe("DiscoverDesktop", () => {
  it("renders the masthead nav, the map canvas, the category segmented, and the list rows", () => {
    renderDesktop();
    expect(document.querySelector("nav[aria-label='Primary']")).not.toBeNull();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
    expect(screen.getByLabelText("actions.see")).toBeInTheDocument();
    expect(screen.getByText("Lagoa do Fogo")).toBeInTheDocument();
    expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
  });

  it("shows the empty state in the rail when there are no places", () => {
    renderDesktop({ places: [] });
    expect(screen.getByText("empty")).toBeInTheDocument();
  });
});
