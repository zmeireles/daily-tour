import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { useOwnerSessionStore } from "@/store/owner-session";
import AdminRoute from "@/routes/admin";
import AdminCallbackRoute from "@/routes/admin.callback";

vi.mock("@/lib/auth/owner-oidc", () => ({
  ownerUserManager: {
    getUser: vi.fn(),
    signinRedirect: vi.fn(),
    signinCallback: vi.fn(),
    signoutRedirect: vi.fn(),
  },
}));

vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));

// The shell reads the chat unread count (react-query); stub it so this suite
// doesn't need a QueryClientProvider (production wraps everything in one).
vi.mock("@/features/backoffice/chat/use-chat-unread", () => ({
  useUnreadChatCount: () => 0,
}));

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

  it("valid session → renders grouped rail nav + bottom tabs", async () => {
    mum.getUser.mockResolvedValue(MOCK_USER);

    const { getByRole } = renderAdmin();

    // Desktop rail carries the full grouped nav set (scoped by its aria-label so
    // the identically-labelled mobile Sheet nav — closed here — can't collide).
    const rail = await waitFor(() => getByRole("navigation", { name: "Admin navigation" }));
    const railNav = within(rail);
    for (const label of [
      "Today",
      "Reservations",
      "Messages",
      "Places",
      "Guesthouses",
      "Profile",
      "Beta metrics",
    ]) {
      expect(railNav.getByText(label)).toBeDefined();
    }

    // Mobile bottom tab bar surfaces the four primary destinations + More.
    const bottom = within(getByRole("navigation", { name: "Primary" }));
    expect(bottom.getByText("Reservations")).toBeDefined();
    expect(bottom.getByText("Messages")).toBeDefined();
    expect(bottom.getByText("More")).toBeDefined();

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
