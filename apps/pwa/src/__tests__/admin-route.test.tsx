import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { useOwnerSessionStore } from "@/store/owner-session";
import AdminRoute from "@/routes/admin";
import AdminCallbackRoute from "@/routes/admin.callback";

vi.mock("@/lib/auth/owner-oidc", () => ({
  ownerUserManager: {
    getUser: vi.fn(),
    signinRedirect: vi.fn(),
    signinCallback: vi.fn(),
  },
}));

vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));

const { ownerUserManager } = await import("@/lib/auth/owner-oidc");

const mum = vi.mocked(ownerUserManager);

const MOCK_USER = {
  access_token: "mock-access-token",
  expired: false,
  profile: { sub: "owner-1", email: "owner@example.com", name: "Owner" },
};

function renderAdmin(initialPath = "/admin") {
  const router = createMemoryRouter(
    [
      { path: "/admin", element: <AdminRoute /> },
      { path: "/admin/callback", element: <AdminCallbackRoute /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: [initialPath] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}

describe("AdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOwnerSessionStore.getState().clearOwnerSession();
  });

  it("no owner session → calls signinRedirect", async () => {
    mum.getUser.mockResolvedValue(null);
    mum.signinRedirect.mockResolvedValue(undefined);

    renderAdmin();

    await waitFor(() => {
      expect(mum.signinRedirect).toHaveBeenCalledOnce();
    });
  });

  it("expired session → calls signinRedirect", async () => {
    mum.getUser.mockResolvedValue({ ...MOCK_USER, expired: true });
    mum.signinRedirect.mockResolvedValue(undefined);

    renderAdmin();

    await waitFor(() => {
      expect(mum.signinRedirect).toHaveBeenCalledOnce();
    });
  });

  it("valid session → renders shell with 4 nav links", async () => {
    mum.getUser.mockResolvedValue(MOCK_USER);

    const { getByText } = renderAdmin();

    await waitFor(() => {
      expect(getByText("Guesthouses")).toBeDefined();
      expect(getByText("Places")).toBeDefined();
      expect(getByText("Profile")).toBeDefined();
      expect(getByText("Beta metrics")).toBeDefined();
    });

    const state = useOwnerSessionStore.getState();
    expect(state.jwt).toBe(MOCK_USER.access_token);
    expect(state.profile?.sub).toBe("owner-1");
  });
});

describe("AdminCallbackRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOwnerSessionStore.getState().clearOwnerSession();
  });

  it("calls signinCallback and navigates to /admin", async () => {
    mum.signinCallback.mockResolvedValue(MOCK_USER as never);

    const router = createMemoryRouter(
      [
        { path: "/admin/callback", element: <AdminCallbackRoute /> },
        { path: "/admin", element: <div data-testid="admin-shell" /> },
      ],
      { initialEntries: ["/admin/callback"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin");
    });

    expect(mum.signinCallback).toHaveBeenCalledOnce();
    const state = useOwnerSessionStore.getState();
    expect(state.jwt).toBe(MOCK_USER.access_token);
  });

  it("signinCallback throws (state mismatch) → still navigates to /admin", async () => {
    mum.signinCallback.mockRejectedValue(new Error("state mismatch"));

    const router = createMemoryRouter(
      [
        { path: "/admin/callback", element: <AdminCallbackRoute /> },
        { path: "/admin", element: <div data-testid="admin-shell" /> },
      ],
      { initialEntries: ["/admin/callback"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin");
    });
  });
});
