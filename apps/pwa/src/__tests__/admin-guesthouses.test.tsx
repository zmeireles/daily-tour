import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOwnerSessionStore } from "@/store/owner-session";
import AdminGuesthousesRoute from "@/routes/admin.guesthouses";
import i18n from "@/lib/i18n";

const MOCK_GH = {
  id: "00000000-0000-0000-0000-000000000001",
  owner_id: "owner-uuid-1",
  name: { en: "Casa das Furnas" },
  slug: "casa-das-furnas",
  address: "Furnas, São Miguel",
  geom_lat: 37.77,
  geom_lng: -25.32,
  media: [],
  status: "active",
  rooms: 4,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

function makeRouter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/admin/guesthouses", element: <AdminGuesthousesRoute /> },
      { path: "/admin/guesthouses/new", element: <div data-testid="new-guesthouse" /> },
    ],
    { initialEntries: ["/admin/guesthouses"] },
  );
  return {
    ui: (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
    router,
  };
}

describe("admin guesthouses route", () => {
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

  it("renders guesthouse list when fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [MOCK_GH], nextCursor: null }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getAllByText("Casa das Furnas").length).toBeGreaterThan(0);
    });
    // Slug is no longer shown in the list (moved to the Advanced collapsible in the edit form)
    expect(screen.queryByText("casa-das-furnas")).toBeNull();
    // Address visible in the list
    expect(screen.getAllByText("Furnas, São Miguel").length).toBeGreaterThan(0);
    // Status badge (Active) + rooms count ("4 rooms") render in the list
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4 rooms").length).toBeGreaterThan(0);
  });

  it("renders empty state when list has no guesthouses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [], nextCursor: null }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("No guesthouses yet")).toBeDefined();
    });
  });

  it("renders error message when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: "catalog_unavailable" }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Failed to load guesthouses.")).toBeDefined();
    });
  });

  // #391 — the wiring test. `formatting-locale.test.ts` proves the helper in
  // isolation; this proves this SCREEN actually uses it. Reverting
  // guesthouse-list.tsx to `i18n.language` turns this red, which the helper's
  // own unit tests would not.
  //
  // MOCK_GH.updated_at is 2025-01-01 — that is the field this screen renders. en-GB renders "1 Jan 2025"; the plain
  // `en` that supportedLngs normalizes an en-GB browser down to renders
  // "Jan 1, 2025".
  it("uses the owner's regional English for the updated date, not US format", async () => {
    const languages = navigator.languages;
    Object.defineProperty(window.navigator, "languages", {
      value: ["en-GB"],
      configurable: true,
    });
    await i18n.changeLanguage("en-GB");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [MOCK_GH], nextCursor: null }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getAllByText("Casa das Furnas").length).toBeGreaterThan(0);
    });

    // supportedLngs normalizes en-GB -> en, which is the whole bug.
    expect(i18n.language).toBe("en");

    // Derive both renderings from the same Date the component formats, rather
    // than hardcoding strings: the mock timestamp is UTC midnight, so the
    // local calendar day depends on the runner's timezone.
    const opts = { year: "numeric", month: "short", day: "numeric" } as const;
    const shown = new Date(MOCK_GH.updated_at);
    const british = new Intl.DateTimeFormat("en-GB", opts).format(shown);
    const american = new Intl.DateTimeFormat("en", opts).format(shown);

    // Control: if these two ever render identically the assertions below prove
    // nothing, so fail loudly rather than pass vacuously.
    expect(british).not.toBe(american);

    expect(screen.getAllByText(british).length).toBeGreaterThan(0);
    expect(screen.queryByText(american)).toBeNull();

    Object.defineProperty(window.navigator, "languages", {
      value: languages,
      configurable: true,
    });
    await i18n.changeLanguage("en");
  });
});
