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
  // Guest locale from the JWT claim (e.g. "pt-PT"). Folded into
  // request_payload so plan_worker._build_plan_request reads it without a
  // planner-svc schema change; falls back to "en" when the claim is absent.
  locale?: string;
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
      request_payload: { ...params.requestPayload, locale: params.locale ?? "en" },
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
