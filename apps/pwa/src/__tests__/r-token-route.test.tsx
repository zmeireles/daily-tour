import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { toast } from "sonner";
import { useSessionStore } from "@/store/session";
import RTokenRoute from "@/routes/r.$token";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/lib/auth/exchange", () => {
  class MockTokenExpiredError extends Error {
    constructor() {
      super("token_expired");
      this.name = "TokenExpiredError";
    }
  }
  class MockTokenInvalidError extends Error {
    constructor() {
      super("token_invalid");
      this.name = "TokenInvalidError";
    }
  }
  return {
    exchangeOpaqueToken: vi.fn(),
    decodeJwt: vi.fn(),
    TokenExpiredError: MockTokenExpiredError,
    TokenInvalidError: MockTokenInvalidError,
  };
});

// Import after vi.mock so we get the mocked versions.
const { exchangeOpaqueToken, decodeJwt, TokenExpiredError } = await import("@/lib/auth/exchange");

const mockClaims = {
  sub: "guest-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  jti: "jti-1",
  exp: 9_999_999_999,
};

function renderRoute(path = "/r/test-opaque") {
  const router = createMemoryRouter(
    [
      { path: "/r/:token", element: <RTokenRoute /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: [path] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}

describe("RTokenRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
  });

  it("happy path: sets session state and navigates to /", async () => {
    const testJwt = "header.payload.sig";
    vi.mocked(exchangeOpaqueToken).mockResolvedValue({ jwt: testJwt, exp: mockClaims.exp });
    vi.mocked(decodeJwt).mockReturnValue(mockClaims);

    const { router } = renderRoute();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });

    const state = useSessionStore.getState();
    expect(state.jwt).toBe(testJwt);
    expect(state.reservation).toEqual({ id: "res-1", guesthouseId: "gh-1", locale: "en" });
    expect(state.guest).toEqual({ id: "guest-1", locale: "en" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("expired: shows toast and navigates to /?reason=expired", async () => {
    vi.mocked(exchangeOpaqueToken).mockRejectedValue(new TokenExpiredError());

    const { router } = renderRoute();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
      expect(router.state.location.search).toBe("?reason=expired");
    });

    expect(toast.error).toHaveBeenCalledWith("Your link has expired. Ask your host for a new one.");
  });

  it("network error: shows generic toast without leaking error details", async () => {
    const internalMsg = "connection refused";
    vi.mocked(exchangeOpaqueToken).mockRejectedValue(new Error(internalMsg));

    const { router } = renderRoute();

    await waitFor(() => {
      expect(router.state.location.search).toBe("?reason=expired");
    });

    expect(toast.error).toHaveBeenCalledWith("Something went wrong. Try again.");
    const call = vi.mocked(toast.error).mock.calls[0]?.[0] as string;
    expect(call).not.toContain(internalMsg);
  });
});
