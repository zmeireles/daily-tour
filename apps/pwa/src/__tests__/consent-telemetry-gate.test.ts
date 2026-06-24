import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionStore } from "@/store/session";
import { useConsentStore } from "@/lib/consent/use-consent";
import { useTourTelemetry } from "@/features/tour/use-tour-telemetry";

const MOCK_JWT = "header.payload.sig";
const MOCK_CLAIMS = {
  sub: "guest-uuid-2",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};
const PLAN_ID = "ccccdddd-0000-4000-8000-000000000003";

// Verifies the T-3.D.1 acceptance criterion: non-essential telemetry only flows
// after explicit consent. "unset" and "denied" must produce zero fetch calls.
describe("consent gate for tour telemetry", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().clearSession();
    useConsentStore.setState({ analytics: "unset" });
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useSessionStore.getState().clearSession();
    useConsentStore.setState({ analytics: "unset" });
    localStorage.clear();
  });

  it("consent denied — no telemetry fetch on mount", () => {
    useConsentStore.setState({ analytics: "denied" });

    renderHook(() => useTourTelemetry(PLAN_ID));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("consent unset — no telemetry fetch on mount", () => {
    useConsentStore.setState({ analytics: "unset" });

    renderHook(() => useTourTelemetry(PLAN_ID));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("consent denied — no telemetry fetch on unmount either", () => {
    useConsentStore.setState({ analytics: "denied" });

    const { unmount } = renderHook(() => useTourTelemetry(PLAN_ID));
    unmount();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("consent granted — telemetry fetch flows as today", () => {
    useConsentStore.setState({ analytics: "granted" });

    renderHook(() => useTourTelemetry(PLAN_ID));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/v1/telemetry/tour");
    const body = JSON.parse(init.body as string) as { event_type: string; plan_id: string };
    expect(body.event_type).toBe("tour.started");
    expect(body.plan_id).toBe(PLAN_ID);
  });
});
