import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOwnerSessionStore } from "@/store/owner-session";
import AdminProfileRoute from "@/routes/admin.profile";

const MOCK_PROFILE = {
  owner_id: "owner-uuid-1",
  bio: { en: "Welcome to my guesthouse!", "pt-PT": "Bem-vindo!" },
  photo: null,
  phone: "+351 912 000 001",
  call_enabled: true,
  dm_channels: { in_app: true, telegram: false, whatsapp_link: true, whatsapp_cloud: false },
  email: "owner@example.com",
  updated_at: "2025-01-01T00:00:00Z",
};

function makeRouter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/admin/profile", element: <AdminProfileRoute /> }], {
    initialEntries: ["/admin/profile"],
  });
  return {
    ui: (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
  };
}

describe("admin profile route", () => {
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

  it("renders profile form with pre-filled data when fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_PROFILE),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Owner Profile")).toBeDefined();
    });
    expect(screen.getByDisplayValue("+351 912 000 001")).toBeDefined();
  });

  it("renders the avatar image from the persisted photo asset id", async () => {
    const photoId = "22222222-2222-4222-8222-222222222222";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...MOCK_PROFILE, photo: photoId }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    const img = await screen.findByRole("img", { name: "Owner avatar" });
    // dt-tests #37 — the avatar now requests a sized derivative rather than the
    // full-size original. Asserting the width is the point: dropping the `?w=`
    // would silently go back to downloading a multi-megabyte original for an
    // 80 px circle, and a bare-id assertion could not tell the difference.
    expect(img.getAttribute("src")).toBe(`/v1/media/${photoId}?w=200`);
  });

  it("renders no avatar image when the profile has no photo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_PROFILE),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Owner Profile")).toBeDefined();
    });
    expect(screen.queryByRole("img", { name: "Owner avatar" })).toBeNull();
  });

  it("renders form with empty defaults when profile is not found (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "profile_not_found" }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Owner Profile")).toBeDefined();
    });
  });

  it("shows error message when profile fetch fails with server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "internal_error" }),
      }),
    );

    const { ui } = makeRouter();
    render(ui);

    await waitFor(() => {
      expect(screen.getByText("Failed to load profile.")).toBeDefined();
    });
  });
});
