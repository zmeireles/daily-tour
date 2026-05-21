import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import TourNewRoute from "@/routes/_authed.tour.new";
import TourPlanRoute from "@/routes/_authed.tour.$planId";

vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));

const MOCK_JWT = "header.payload.sig";
const MOCK_CLAIMS = {
  sub: "guest-uuid-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};
const PLAN_ID = "ccccdddd-0000-4000-8000-000000000001";

function renderNewRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createMemoryRouter(
    [
      { path: "/tour/new", element: <TourNewRoute /> },
      { path: "/tour/:planId", element: <TourPlanRoute /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: ["/tour/new"] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function renderPlanRoute(planId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createMemoryRouter(
    [
      { path: "/tour/new", element: <TourNewRoute /> },
      { path: "/tour/:planId", element: <TourPlanRoute /> },
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

describe("Tour intake form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
    void i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to home when JWT is absent", async () => {
    renderNewRoute();
    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
    });
  });

  it("renders form with all fields when authed", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderNewRoute();

    expect(screen.getByRole("heading", { level: 1, name: /plan your day/i })).toBeInTheDocument();
    // Wish chips present
    expect(screen.getByRole("checkbox", { name: /eat/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /see/i })).toBeInTheDocument();
    // Duration + vehicle selects
    expect(screen.getByLabelText(/how long/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/getting around/i)).toBeInTheDocument();
    // Notes textarea
    expect(screen.getByLabelText(/anything else/i)).toBeInTheDocument();
    // Submit button
    expect(screen.getByRole("button", { name: /plan my day/i })).toBeInTheDocument();
  });

  it("submits form data and redirects to plan status page", async () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: PLAN_ID, status: "queued", plan_payload: null }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // Second fetch for plan status poll
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ id: PLAN_ID, status: "ready", plan_payload: { stops: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderNewRoute();

    // Select "Eat" wish
    fireEvent.click(screen.getByRole("checkbox", { name: /eat/i }));

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /plan my day/i }));

    // Should POST to /v1/tour-plans
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/v1/tour-plans",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // After redirect → plan status page shows ready state
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /your plan is ready/i })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("plan status page shows queued spinner while status=queued", async () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: PLAN_ID, status: "queued", plan_payload: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderPlanRoute(PLAN_ID);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/planning your day/i)).toBeInTheDocument();
    });
  });

  it("plan status page shows rejected message when status=rejected", async () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: PLAN_ID, status: "rejected", plan_payload: { error: "timeout" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderPlanRoute(PLAN_ID);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/plan not available/i)).toBeInTheDocument();
    });
  });
});
