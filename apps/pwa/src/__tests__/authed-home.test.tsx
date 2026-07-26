import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import IndexRoute from "@/routes/index";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const MOCK_JWT = "header.payload.sig";
const MOCK_CLAIMS = {
  sub: "guest-uuid-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};

function renderRoute(path = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const router = createMemoryRouter([{ path: "/", element: <IndexRoute /> }], {
    initialEntries: [path],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const EMPTY_DISCOVER = { action: "eat", count: 0, groups: [] };

describe("Authed home (IndexRoute dispatcher)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
    void i18n.changeLanguage("en");
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(EMPTY_DISCOVER), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders public landing when JWT is null (no data-premium elements)", () => {
    renderRoute();

    // Hero h1 should be visible (public landing)
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

    // No premium stubs on public landing
    expect(document.querySelector("[data-premium='true']")).toBeNull();
  });

  it("renders authed home with all 6 action bento cards linking to /a/<slug> when JWT is present", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    // Each bento card is a Link with an accessible name (the action label) and
    // an href to /a/<slug>. Querying by exact name avoids substring collisions
    // (e.g. "Do" matching "Explore") now that the BottomTabBar is mounted.
    const expected: Array<[RegExp, string]> = [
      [/^eat$/i, "/a/eat"],
      [/^drink$/i, "/a/drink"],
      [/^see$/i, "/a/see"],
      [/^do$/i, "/a/do"],
      [/^buy$/i, "/a/buy"],
      [/^move$/i, "/a/move"],
    ];
    for (const [name, href] of expected) {
      const link = screen.getByRole("link", { name });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe(href);
    }

    // Premium-namespaced CTA present (Plan my day) — now an enabled link, not a disabled stub
    expect(document.querySelector("[data-premium='true']")).not.toBeNull();
  });

  it("renders an editorial 'Message Miguel' card linking to /chat on the authed home", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    // The Miguel avatar is aria-hidden, so the link's accessible name is the
    // text label alone (not doubled by the fallback initial).
    const chatCta = screen.getByRole("link", { name: /message miguel/i });
    expect(chatCta).toBeInTheDocument();
    expect(chatCta.getAttribute("href")).toBe("/chat");
  });

  it("mounts the bottom tab bar with Explore active", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    const exploreTab = screen.getByRole("link", { name: /explore/i });
    expect(exploreTab.getAttribute("href")).toBe("/");
    expect(exploreTab).toHaveAttribute("aria-current", "page");
  });

  it("renders an enabled 'Plan my day' CTA linking to /tour/new on the authed home", () => {
    // Regression for the pre-#164 state where the CTA was a disabled
    // "Coming soon" stub even though T-3.1.0 had shipped the intake form.
    // Removing the link or reverting to a disabled button would flip this red.
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    const planCta = screen.getByRole("link", { name: /plan my day/i });
    expect(planCta).toBeInTheDocument();
    expect(planCta.getAttribute("href")).toBe("/tour/new");
  });

  it("does NOT call i18n.changeLanguage on mount — locale is applied at /r/:token exchange only", () => {
    // Regression guard for DT-TESTS-10: applying the JWT's locale on every
    // mount of AuthedIndexRoute (via the old useLocaleAuto hook) raced
    // LanguageDetector reading localStorage and overrode the user's
    // explicit toggle choice on F5. The fix moved locale application
    // into RTokenRoute (verified in r-token-route.test.tsx). This test
    // ensures AuthedIndexRoute stays out of the locale-management
    // business — re-introducing useLocaleAuto here would flip this red.
    const spy = vi
      .spyOn(i18n, "changeLanguage")
      .mockImplementation(
        () => Promise.resolve(() => "") as ReturnType<typeof i18n.changeLanguage>,
      );

    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, { ...MOCK_CLAIMS, locale: "pt-PT" });
    });

    act(() => {
      renderRoute();
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("wraps content in max-w-5xl container so it doesn't go edge-to-edge on desktop", () => {
    // Regression guard for dt-tests UAT #19 step C: PR #150 added the
    // mx-auto/max-w-5xl wrapper to PublicIndex and the action pages but
    // missed AuthedIndexRoute, so the authed home rendered full-bleed on
    // wide desktops. Removing the wrapper would flip this red.
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    const wrapper = document.querySelector("div.max-w-5xl.mx-auto");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("main")).not.toBeNull();
  });

  it("theme auto sets data-theme to light during São Miguel daytime", () => {
    // 2026-06-21T12:00:00Z — solar noon in UTC, São Miguel is UTC-1 so 11:00 local — well within daylight
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));

    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    act(() => {
      renderRoute();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
