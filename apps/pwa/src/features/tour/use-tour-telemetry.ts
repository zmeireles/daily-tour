import { useEffect } from "react";
import { useSessionStore } from "@/store/session";
import { emit } from "@/lib/telemetry";

export function useTourTelemetry(planId: string): void {
  const jwt = useSessionStore((s) => s.jwt);

  useEffect(() => {
    if (!jwt || !planId) return;
    emit("tour.started", planId);
    return () => {
      emit("tour.completed", planId);
    };
  }, [planId, jwt]);
}
