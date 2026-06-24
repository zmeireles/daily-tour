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

describe("useTourTelemetry", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useSessionStore.getState().clearSession();
    // Telemetry is consent-gated (T-3.D.1); these tests cover the granted path.
    useConsentStore.setState({ analytics: "granted" });
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useSessionStore.getState().clearSession();
    useConsentStore.setState({ analytics: "unset" });
  });

  it("emits tour.started on mount when authenticated", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    renderHook(() => useTourTelemetry(PLAN_ID));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/v1/telemetry/tour");
    const body = JSON.parse(init.body as string) as { event_type: string; plan_id: string };
    expect(body.event_type).toBe("tour.started");
    expect(body.plan_id).toBe(PLAN_ID);
  });

  it("emits tour.completed on unmount", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    const { unmount } = renderHook(() => useTourTelemetry(PLAN_ID));
    fetchSpy.mockClear();

    unmount();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { event_type: string };
    expect(body.event_type).toBe("tour.completed");
  });
});
