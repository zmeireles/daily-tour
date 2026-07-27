import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import ActionDrillDownRoute from "@/routes/_authed.a.$action";
import type { DiscoverResponse } from "@/features/discover/sort-utils";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// MapView wraps a maplibre canvas that can't run in jsdom. Replace it with a
// lightweight stub that surfaces the pin count it would render so the route's
// pin data (one per place with coords) is assertable without the canvas.
vi.mock("@/components/map-view", () => ({
  MapView: ({ pins }: { pins?: { id: string }[] }) => (
    <div data-testid="map-view" data-pin-count={(pins ?? []).length} />
  ),
}));

// Suppress timer-based side effects from theme/locale auto hooks.
vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));

const MOCK_JWT = "header.payload.sig";
const MOCK_CLAIMS = {
  sub: "guest-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};

function makeDiscoverResponse(
  groups: { wish: string; places: { id: string; name: string }[] }[],
): DiscoverResponse {
  const count = groups.reduce((n, g) => n + g.places.length, 0);
  return {
    action: "eat",
    count,
    groups: groups.map((g) => ({
      wish: g.wish,
      places: g.places.map((p) => ({
        id: p.id,
        name: { en: p.name },
        description: { en: `Desc of ${p.name}` },
        hero_image_url: null,
        geom_lat: 37.74,
        geom_lng: -25.67,
        wishes: [g.wish],
        distance_km: 1,
      })),
    })),
  };
}

const DEFAULT_RESPONSE = makeDiscoverResponse([
  {
    wish: "scenic-views",
    places: [
      { id: "p1", name: "Sete Cidades" },
      { id: "p2", name: "Furnas Valley" },
    ],
  },
  {
    wish: "family-friendly",
    places: [{ id: "p3", name: "Terra Nostra" }],
  },
]);

function renderRoute(path = "/a/eat") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createMemoryRouter(
    [
      { path: "/a/:action", element: <ActionDrillDownRoute /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockFetch(response: DiscoverResponse = DEFAULT_RESPONSE) {
  return vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("ActionDrillDownRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
    void i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("redirects to home when JWT is absent", async () => {
    mockFetch();
    renderRoute();
    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
    });
  });

  // Expand the draggable sheet so the relocated controls + full grouped/flat
  // list become reachable (peek state shows only the horizontal ribbon).
  function expandSheet() {
    fireEvent.click(screen.getByRole("button", { name: /show all places and filters/i }));
  }

  it("peek ribbon shows all place names; expanding reveals the two wish groups", async () => {
    mockFetch();
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    // Peek state: the "Nearby" sheet title + ribbon cards (place names) are visible.
    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /nearby/i })).toBeInTheDocument();
    expect(screen.getByText("Furnas Valley")).toBeInTheDocument();
    expect(screen.getByText("Terra Nostra")).toBeInTheDocument();

    // Expanded state: the grouped wish-group sections appear.
    expandSheet();
    expect(screen.getByRole("region", { name: /scenic views/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /family friendly/i })).toBeInTheDocument();
  });

  it("feeds one map pin per place that carries coordinates", async () => {
    mockFetch();
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    // 3 places in DEFAULT_RESPONSE, all carry geom_lat/geom_lng → 3 pins.
    await waitFor(() => {
      expect(screen.getByTestId("map-view")).toHaveAttribute("data-pin-count", "3");
    });
  });

  it("map search field filters the visible places by name", async () => {
    mockFetch();
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });

    const searchField = screen.getByRole("textbox", { name: /search places/i });
    fireEvent.change(searchField, { target: { value: "furnas" } });

    await waitFor(() => {
      expect(screen.queryByText("Sete Cidades")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Furnas Valley")).toBeInTheDocument();
  });

  it("LocationToggle to 'me' with denied permission snaps back and shows toast", async () => {
    mockFetch();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
          // code 1 = PERMISSION_DENIED (numeric constant — jsdom lacks GeolocationPositionError)
          error({
            code: 1,
            message: "denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        }),
      },
    });

    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });

    // Controls live in the expanded sheet now.
    expandSheet();
    const meButton = screen.getByRole("radio", { name: /use my location/i });
    fireEvent.click(meButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Location access denied. Showing nearby from your guesthouse.",
      );
    });

    // Toggle snapped back to guesthouse
    expect(meButton).toHaveAttribute("aria-checked", "false");
  });

  it("RangeSlider change triggers a new fetch after debounce", async () => {
    const fetchSpy = mockFetch();

    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });

    // The RangeSlider lives in the expanded sheet controls.
    expandSheet();
    const initialCount = fetchSpy.mock.calls.length;

    // Find slider by its role — Radix Slider renders thumbs with role="slider"
    const slider = screen.getAllByRole("slider")[0]!;
    // Simulate dragging to value 25
    fireEvent.focus(slider);
    fireEvent.keyDown(slider, { key: "End" }); // jump to max

    // Debounce is 250ms — wait up to 1500ms for re-fetch
    await waitFor(
      () => {
        expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCount);
      },
      { timeout: 1500 },
    );
  });

  it("group-toggle switches to flat view without ActionGroupHeader sections", async () => {
    mockFetch();
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });

    // Controls + grouped sections live in the expanded sheet.
    expandSheet();
    expect(screen.getByRole("region", { name: /scenic views/i })).toBeInTheDocument();

    // Click the "List" flat toggle
    const flatToggle = screen.getByRole("radio", { name: /list/i });
    fireEvent.click(flatToggle);

    // Flat view: sections gone, places still present
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /scenic views/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    expect(screen.getByText("Terra Nostra")).toBeInTheDocument();
  });

  it("sort by name renders FlatList places in alphabetical order", async () => {
    // Radix DropdownMenu doesn't open reliably in jsdom due to pointer-event internals.
    // Test the sort rendering via FlatList component directly instead.
    const { FlatList } = await import("@/features/discover/flat-list");
    const places = [
      {
        id: "p1",
        name: { en: "Zebra Bar" },
        description: { en: "" },
        hero_image_url: null,
        wishes: ["w"],
        distance_km: 1,
      },
      {
        id: "p2",
        name: { en: "Apple Cafe" },
        description: { en: "" },
        hero_image_url: null,
        wishes: ["w"],
        distance_km: 2,
      },
      {
        id: "p3",
        name: { en: "Mango Grill" },
        description: { en: "" },
        hero_image_url: null,
        wishes: ["w"],
        distance_km: 3,
      },
    ];

    const router = createMemoryRouter(
      [{ path: "/", element: <FlatList places={places} sortBy="name" /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    // Apple < Mango < Zebra alphabetically
    // Compare DOM order: Apple should appear before Mango, Mango before Zebra
    const apple = screen.getByText("Apple Cafe");
    const mango = screen.getByText("Mango Grill");
    const zebra = screen.getByText("Zebra Bar");

    // Node.DOCUMENT_POSITION_FOLLOWING = 4 means the argument comes after
    expect(apple.compareDocumentPosition(mango) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mango.compareDocumentPosition(zebra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
