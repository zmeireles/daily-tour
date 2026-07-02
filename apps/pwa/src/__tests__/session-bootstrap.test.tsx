import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useSessionStore } from "@/store/session";
import { SessionBootstrap } from "@/components/session-bootstrap";

vi.mock("@/lib/auth/refresh", () => ({
  refreshSession: vi.fn(),
  decodeJwt: vi.fn(),
}));

const { refreshSession, decodeJwt } = await import("@/lib/auth/refresh");

const mockClaims = {
  sub: "guest-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  jti: "jti-1",
  exp: 9_999_999_999,
};

function setPath(pathname: string) {
  // happy-dom/jsdom expose window.location as a mutable object via property
  // assignment; pushing to history keeps router state consistent in case
  // any children inspect it.
  window.history.replaceState({}, "", pathname);
}

describe("SessionBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
    setPath("/");
  });

  it("no JWT in store + not on /r/:token — fetches refresh, sets session, renders children", async () => {
    const testJwt = "header.payload.sig";
    vi.mocked(refreshSession).mockResolvedValue({ jwt: testJwt, exp: mockClaims.exp });
    vi.mocked(decodeJwt).mockReturnValue(mockClaims);

    render(
      <SessionBootstrap>
        <div data-testid="children">authed home</div>
      </SessionBootstrap>,
    );

    // Loading state is visible while the refresh is in flight.
    expect(screen.getByTestId("session-bootstrap-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("children")).toBeInTheDocument();
    });

    expect(refreshSession).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().jwt).toBe(testJwt);
    expect(useSessionStore.getState().guest).toEqual({ id: "guest-1", locale: "en" });
  });

  it("refresh returns null (no cookie) — renders children with empty session", async () => {
    vi.mocked(refreshSession).mockResolvedValue(null);

    render(
      <SessionBootstrap>
        <div data-testid="children">public landing</div>
      </SessionBootstrap>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("children")).toBeInTheDocument();
    });

    expect(refreshSession).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().jwt).toBeNull();
  });

  it("on /r/:token path — skips bootstrap entirely (RTokenRoute owns the exchange)", () => {
    setPath("/r/some-opaque-token");

    render(
      <SessionBootstrap>
        <div data-testid="children">token route</div>
      </SessionBootstrap>,
    );

    // Children render immediately, no loading state, no refresh fetch.
    expect(screen.getByTestId("children")).toBeInTheDocument();
    expect(screen.queryByTestId("session-bootstrap-loading")).not.toBeInTheDocument();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("session already in store (HMR re-mount) — skips bootstrap", () => {
    useSessionStore.getState().setSession("existing.jwt.token", mockClaims);

    render(
      <SessionBootstrap>
        <div data-testid="children">already authed</div>
      </SessionBootstrap>,
    );

    expect(screen.getByTestId("children")).toBeInTheDocument();
    expect(screen.queryByTestId("session-bootstrap-loading")).not.toBeInTheDocument();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  describe("admin-path gating (T-8.0.4)", () => {
    it("on /admin — skips bootstrap, performs zero /v1/auth/refresh calls", () => {
      setPath("/admin");

      render(
        <SessionBootstrap>
          <div data-testid="children">admin root</div>
        </SessionBootstrap>,
      );

      expect(screen.getByTestId("children")).toBeInTheDocument();
      expect(screen.queryByTestId("session-bootstrap-loading")).not.toBeInTheDocument();
      expect(refreshSession).not.toHaveBeenCalled();
    });

    it("on /admin/* sub-routes — skips bootstrap", () => {
      setPath("/admin/reservations");

      render(
        <SessionBootstrap>
          <div data-testid="children">admin reservations</div>
        </SessionBootstrap>,
      );

      expect(screen.getByTestId("children")).toBeInTheDocument();
      expect(screen.queryByTestId("session-bootstrap-loading")).not.toBeInTheDocument();
      expect(refreshSession).not.toHaveBeenCalled();
    });

    it("on a guest route — still fetches refresh (admin gate does not over-apply)", async () => {
      setPath("/p/some-place");
      vi.mocked(refreshSession).mockResolvedValue(null);

      render(
        <SessionBootstrap>
          <div data-testid="children">guest place</div>
        </SessionBootstrap>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("children")).toBeInTheDocument();
      });

      expect(refreshSession).toHaveBeenCalledOnce();
    });
  });
});
