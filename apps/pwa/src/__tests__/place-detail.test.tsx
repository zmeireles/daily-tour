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

// The COMMON case: an owner-pending business — one placeholder image (so the
// Gallery auto-absents) and no season (so the DetailsCard stays empty). Must not
// look broken: rail = actions + map only.
const MOCK_BUSINESS = {
  ...MOCK_PLACE,
  id: "place-uuid-2",
  name: { en: "Café Atlântico" },
  description: { en: "A cosy harbour-front café." },
  season: null,
  media: [
    {
      id: "media-b1",
      kind: "image",
      url: "https://example.com/cafe.jpg",
      alt: { en: "Café Atlântico" },
      sort_order: 1,
    },
  ],
};

// Forces useLayoutMode("lg") to report desktop (matchMedia is absent in jsdom).
function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

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

  // Below the lg floor the route must mount the UNTOUCHED mobile tree — the
  // additive props default to mobile behaviour and no desktop chrome leaks in.
  it("mounts the mobile tree (glass back, no breadcrumb) below the lg floor", async () => {
    mockMatchMedia(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_PLACE) }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => expect(screen.getByText("Sete Cidades")).toBeInTheDocument());

    // Hero chrome defaults to "full": the glass back button is present.
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    // The desktop-only breadcrumb is absent.
    expect(screen.queryByRole("navigation", { name: /breadcrumb/i })).toBeNull();
  });
});

describe("PlaceDetailRoute — desktop layout (≥ lg)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockMatchMedia(true);
    useSessionStore.getState().clearSession();
    useSessionStore.getState().setSession("test-jwt", {
      sub: "guest-1",
      rid: "res-1",
      gh: "gh-1",
      locale: "en",
      exp: 9_999_999_999,
    });
  });

  it("rich landmark: breadcrumb, display title, gallery + full rail (actions + season)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...MOCK_PLACE, season: "summer" }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    // Name appears twice by design (breadcrumb + h1 restatement) — assert the
    // heading specifically.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Sete Cidades" })).toBeInTheDocument(),
    );

    // Desktop chrome: breadcrumb replaces the glass back button.
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();

    // The three rail deep-links survive the fork.
    expect(screen.getByRole("link", { name: /navigate/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /message/i })).toBeInTheDocument();

    // Multi-image → the Gallery renders its slides (distinctive 2nd-image alt).
    expect(screen.getByAltText("Sete Cidades panorama")).toBeInTheDocument();

    // Season lives in the rail META chip (not duplicated in a left DetailsCard).
    expect(screen.getByText("Summer")).toBeInTheDocument();
    expect(screen.queryByTestId("place-details-card")).toBeNull();
  });

  it("single-photo owner-pending business: no gallery, empty details, actions + map only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_BUSINESS) }),
    );

    const { ui } = makeRouter("place-uuid-2");
    render(ui);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Café Atlântico" })).toBeInTheDocument(),
    );

    // Single image → Gallery auto-absents; no degenerate one-slide carousel
    // (the carousel marks each slide with aria-roledescription="slide").
    expect(document.querySelector('[aria-roledescription="slide"]')).toBeNull();
    // No season + no hours → DetailsCard stays empty.
    expect(screen.queryByTestId("place-details-card")).toBeNull();
    // The rail is still functional: the three actions + the single-pin map.
    expect(screen.getByRole("link", { name: /navigate/i })).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });

  // The opaque photo-credit chip is a SHARED token-only contrast fix. It must read
  // ≥4.5:1 in BOTH themes — bg-on-surface ⇄ text-surface flip together, so the
  // pairing holds. Here we assert it under the dark theme.
  it("hardens the photo-credit caption to the opaque on-surface chip (dark theme)", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...MOCK_PLACE,
            media: [
              {
                id: "media-attr",
                kind: "image",
                url: "https://example.com/sete-cidades.jpg",
                alt: { en: "Sete Cidades lake" },
                sort_order: 1,
                attribution: {
                  author: "Jane Doe",
                  license: "CC BY-SA 4.0",
                  source_url: "https://commons.example/sete",
                },
              },
            ],
          }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    const caption = await screen.findByRole("link", { name: /Jane Doe/i });
    expect(caption.className).toContain("bg-on-surface/90");
    expect(caption.className).toContain("text-surface");
    expect(caption.className).not.toContain("bg-black/50");

    document.documentElement.removeAttribute("data-theme");
  });
});
