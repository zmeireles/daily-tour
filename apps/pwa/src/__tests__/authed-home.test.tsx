import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
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

  it("renders authed home with all 6 action tiles when JWT is present", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderRoute();

    // All 6 EN action labels visible
    expect(screen.getByRole("link", { name: /eat/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /drink/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /do/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /move/i })).toBeInTheDocument();

    // Premium stubs present
    expect(document.querySelector("[data-premium='true']")).not.toBeNull();
  });

  it("locale auto-applies from token claims (pt-PT)", () => {
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

    expect(spy).toHaveBeenCalledWith("pt-PT");
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
