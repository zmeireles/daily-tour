import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import TourPlanRoute from "@/routes/_authed.tour.$planId";
import { FailureFallback } from "@/features/tour/failure-fallback";

vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));
vi.mock("@/lib/locale/use-locale-auto", () => ({ useLocaleAuto: vi.fn() }));

const MOCK_JWT = "header.payload.sig";
const MOCK_CLAIMS = {
  sub: "guest-uuid-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};
const PLAN_ID = "ccccdddd-0000-4000-8000-000000000002";

function renderPlanRoute(planId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createMemoryRouter(
    [
      { path: "/tour/:planId", element: <TourPlanRoute /> },
      { path: "/tour/new", element: <div data-testid="tour-new" /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: [`/tour/${planId}`] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("Tour failure fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
    void i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows rejected failure card when status=rejected", async () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: PLAN_ID, status: "rejected", plan_payload: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderPlanRoute(PLAN_ID);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/plan not available/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /edit preferences/i })).toBeInTheDocument();
    });
  });

  it("timeout failure card renders correct heading and buttons", () => {
    // Test the FailureFallback component directly for the timeout case.
    // The route's 2-minute timer behaviour is exercised through integration;
    // here we verify the component renders the right content when type="timeout".
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <FailureFallback type="timeout" onRetry={onRetry} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/still planning/i)).toBeInTheDocument();
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit preferences/i })).toBeInTheDocument();
  });

  it("retry button invokes onRetry callback", () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <FailureFallback type="rejected" onRetry={onRetry} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
