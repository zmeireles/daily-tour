import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "@/store/session";
import PlaceDetailRoute from "@/routes/_authed.p.$id";

// Prevent MapLibre from crashing in jsdom
vi.mock("@/components/map-view", () => ({
  MapView: () => <div data-testid="map-view" />,
}));

// Prevent embla from crashing in jsdom
vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), null],
}));

const MOCK_PLACE = {
  id: "place-uuid-1",
  name: { en: "Sete Cidades" },
  description: { en: "A stunning twin lake." },
  geom_lat: 37.86,
  geom_lng: -25.78,
  address: "São Miguel, Azores",
  contacts: { phone: "+351912000001" },
  hours: [],
  season: null,
  status: "published",
  is_hosts_pick: true,
  media: [
    {
      id: "media-1",
      kind: "image",
      url: "https://example.com/sete-cidades.jpg",
      alt: { en: "Sete Cidades lake" },
      sort_order: 1,
    },
    {
      id: "media-2",
      kind: "image",
      url: "https://example.com/sete-cidades-2.jpg",
      alt: { en: "Sete Cidades panorama" },
      sort_order: 2,
    },
  ],
  actions: [{ slug: "hike", label_i18n: { en: "Hike" } }],
  wishes: [],
  weather_ok_today: true,
};

function makeRouter(placeId = "place-uuid-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/p/:id", element: <PlaceDetailRoute /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: [`/p/${placeId}`] },
  );
  return {
    queryClient,
    ui: (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
    router,
  };
}

describe("PlaceDetailRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setSession("test-jwt", {
      sub: "guest-1",
      rid: "res-1",
      gh: "gh-1",
      locale: "en",
      exp: 9_999_999_999,
    });
  });

  it("renders hydrated payload: place name, description, all 3 action buttons", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_PLACE),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });

    expect(screen.getByText("A stunning twin lake.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /navigate/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /message/i })).toBeInTheDocument();
  });

  it("shows translation fallback badge when locale is pt-PT and only en is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...MOCK_PLACE,
            description: { en: "A stunning twin lake." },
          }),
      }),
    );

    const { ui } = makeRouter();

    // Switch i18n to pt-PT before render
    const i18n = (await import("@/lib/i18n")).default;
    await i18n.changeLanguage("pt-PT");

    render(ui);

    await waitFor(() => {
      expect(screen.getByText("A stunning twin lake.")).toBeInTheDocument();
    });

    // Badge shows "EN" for translation pending
    expect(screen.getAllByText("EN").length).toBeGreaterThan(0);

    await i18n.changeLanguage("en");
  });

  it("action hrefs match deep-link contracts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_PLACE),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /navigate/i })).toBeInTheDocument();
    });

    const navigateLink = screen.getByRole("link", { name: /navigate/i });
    const callLink = screen.getByRole("link", { name: /call/i });
    const messageLink = screen.getByRole("link", { name: /message/i });

    expect(navigateLink.getAttribute("href")).toMatch(/^https:\/\/maps\.apple\.com\//);
    expect(callLink.getAttribute("href")).toMatch(/^tel:/);
    expect(messageLink.getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  });

  it("redirects to /?reason=expired when jwt is null on mount", async () => {
    useSessionStore.getState().clearSession();

    const { ui, router } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
      expect(router.state.location.search).toBe("?reason=expired");
    });
  });

  it("omits the Details card when season and hours are both empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_PLACE),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Sete Cidades")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("place-details-card")).not.toBeInTheDocument();
  });

  it("renders the Details card with a Best season row when season is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...MOCK_PLACE, season: "summer" }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByTestId("place-details-card")).toBeInTheDocument();
    });

    // Capitalized season label rendered inside the card.
    expect(screen.getByText("Summer")).toBeInTheDocument();
    expect(screen.getByText("Best season")).toBeInTheDocument();
  });
});
