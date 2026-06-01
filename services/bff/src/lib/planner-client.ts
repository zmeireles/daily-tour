import { loadConfig } from "../config.js";

export class PlannerError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PlannerError";
  }
}

export interface TourPlanResponse {
  id: string;
  status: string;
  plan_payload: Record<string, unknown> | null;
}

interface CreatePlanParams {
  guestId: string;
  reservationId?: string;
  requestPayload: Record<string, unknown>;
}

export async function createTourPlan(params: CreatePlanParams): Promise<TourPlanResponse> {
  const { PLANNER_SVC_URL } = loadConfig();
  const res = await fetch(`${PLANNER_SVC_URL}/v1/tour-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_id: params.guestId,
      reservation_id: params.reservationId ?? null,
      request_payload: params.requestPayload,
    }),
  });
  if (!res.ok) {
    throw new PlannerError(res.status, `planner-svc ${res.status}`);
  }
  return (await res.json()) as TourPlanResponse;
}

export async function getTourPlan(planId: string): Promise<TourPlanResponse | null> {
  const { PLANNER_SVC_URL } = loadConfig();
  const res = await fetch(`${PLANNER_SVC_URL}/v1/tour-plans/${encodeURIComponent(planId)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new PlannerError(res.status, `planner-svc ${res.status}`);
  }
  return (await res.json()) as TourPlanResponse;
}
