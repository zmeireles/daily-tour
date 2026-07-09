import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOwnerSessionStore } from "@/store/owner-session";
import { BetaDashboard } from "@/features/admin-beta/beta-dashboard";

const ZERO = { value: 0, previous: 0, deltaPct: null, available: true };

const MOCK_METRICS = {
  range_days: 30,
  reservations: { value: 15, previous: 10, deltaPct: 50, available: true },
  views: { value: 100, previous: 80, deltaPct: 25, available: true },
  conversion: { value: 0.15, previous: 0.125, deltaPct: 20, available: true },
  messages: { value: 8, previous: 0, deltaPct: null, available: true },
};

const MOCK_EMPTY = {
  range_days: 30,
  reservations: ZERO,
  views: ZERO,
  conversion: ZERO,
  messages: ZERO,
};

function okFetch(body: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

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

  it("renders branded KPI cards with values + trend deltas (default 30d range)", async () => {
    const fetchMock = okFetch(MOCK_METRICS);
    vi.stubGlobal("fetch", fetchMock);

    renderDashboard();

    // The header (h1 + range control) renders in every state, so wait on a KPI
    // label — proof the data has loaded and the card grid is showing.
    await waitFor(() => {
      expect(screen.getByText("Reservations")).toBeDefined();
    });
    expect(screen.getByRole("heading", { name: "Beta metrics" })).toBeDefined();

    // Four KPI labels rendered.
    expect(screen.getByText("Views")).toBeDefined();
    expect(screen.getByText("Conversion")).toBeDefined();
    expect(screen.getByText("Messages")).toBeDefined();

    // Values (conversion is a ratio rendered as a %).
    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText("15%")).toBeDefined();
    expect(screen.getByText("8")).toBeDefined();

    // Trend chips: deltaPct 50/25/20 → "…%", null → "—".
    expect(screen.getByText("50%")).toBeDefined();
    expect(screen.getByText("25%")).toBeDefined();
    expect(screen.getByText("20%")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();

    // Default range → ?range=30d on the owner-auth'd endpoint.
    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/admin/beta-metrics?range=30d",
      expect.objectContaining({ headers: { Authorization: "Bearer test-jwt" } }),
    );
  });

  it("renders 'no data' for an unavailable KPI instead of a fabricated 0", async () => {
    const metrics = {
      ...MOCK_METRICS,
      messages: { value: 0, previous: 0, deltaPct: null, available: false },
    };
    vi.stubGlobal("fetch", okFetch(metrics));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Messages")).toBeDefined();
    });
    // An unavailable KPI shows the "no data" chip, never a misleading 0.
    expect(screen.getByText("no data")).toBeDefined();
  });

  it("re-fetches with the selected range when the date-range control changes", async () => {
    const fetchMock = okFetch(MOCK_METRICS);
    vi.stubGlobal("fetch", fetchMock);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Reservations")).toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledWith("/v1/admin/beta-metrics?range=30d", expect.anything());

    fireEvent.click(screen.getByText("7 days"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/v1/admin/beta-metrics?range=7d", expect.anything());
    });
  });

  it("shows the empty state when there is no beta activity", async () => {
    vi.stubGlobal("fetch", okFetch(MOCK_EMPTY));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("No beta activity yet")).toBeDefined();
    });
    // The KPI grid is not rendered in the empty case.
    expect(screen.queryByText("Reservations")).toBeNull();
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
