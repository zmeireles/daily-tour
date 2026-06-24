import { useSessionStore } from "@/store/session";
import { useConsentStore } from "@/lib/consent/use-consent";

export function isBetaSession(): boolean {
  try {
    return localStorage.getItem("dt_beta") === "1";
  } catch {
    return false;
  }
}

export function emit(eventType: string, planId?: string): void {
  // Consent gate: non-essential telemetry only flows after explicit accept.
  // "unset" (undecided) and "denied" both no-op, leaving analytics.tour_event empty.
  if (useConsentStore.getState().analytics !== "granted") return;

  const jwt = useSessionStore.getState().jwt;
  if (!jwt) return;

  void fetch("/v1/telemetry/tour", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      event_type: eventType,
      ...(planId ? { plan_id: planId } : {}),
      is_beta: isBetaSession(),
    }),
    keepalive: true,
  }).catch(() => undefined);
}
