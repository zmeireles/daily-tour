import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOwnerSessionStore } from "@/store/owner-session";
import { BetaDashboard } from "@/features/admin-beta/beta-dashboard";

const MOCK_METRICS = {
  total_guests: 42,
  tour_completion_rate: 0.75,
  average_rating: 4.3,
  top_places: [
    { place_id: "place-abc", engagement_count: 12 },
    { place_id: "place-def", engagement_count: 7 },
  ],
  drop_off_funnel: { started: 100, completed: 75 },
};

// No retry:false here on purpose — the error path must be exercised by the
// component's own useQuery({ retry: false }) config, not masked by the harness.
function renderDashboard() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BetaDashboard />
    </QueryClientProvider>,
  );
}

describe("BetaDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    useOwnerSessionStore.getState().clearOwnerSession();
    useOwnerSessionStore.getState().setOwnerSession("test-jwt", {
      sub: "owner-uuid-1",
      email: "owner@example.com",
      name: "Owner",
    });
  });

  it("renders metrics from GET /v1/admin/beta-metrics", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_METRICS),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Beta Dashboard")).toBeDefined();
    });

    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("75%")).toBeDefined();
    expect(screen.getByText("4.3")).toBeDefined();
    expect(screen.getByText("place-abc")).toBeDefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/admin/beta-metrics",
      expect.objectContaining({ headers: { Authorization: "Bearer test-jwt" } }),
    );
  });

  it("shows an error message when the fetch fails (component's own retry:false)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Failed to load beta metrics.")).toBeDefined();
    });
    // retry:false lives on the component's useQuery, so a single attempt fails fast.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when the Retry button is clicked", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Failed to load beta metrics.")).toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
