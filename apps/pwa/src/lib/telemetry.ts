import { useSessionStore } from "@/store/session";

export function isBetaSession(): boolean {
  try {
    return localStorage.getItem("dt_beta") === "1";
  } catch {
    return false;
  }
}

export function emit(eventType: string, planId?: string): void {
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
