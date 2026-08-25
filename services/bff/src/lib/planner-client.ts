import { loadConfig } from "../config.js";
import { plannerHeaders } from "./internal-headers.js";

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
  // dt-tests #40 — ISO timestamp when the guest shared the plan, null when
  // private. The public route gates on this; `status === "ready"` is not a grant.
  shared_at?: string | null;
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
    headers: plannerHeaders({ "Content-Type": "application/json" }),
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
  const res = await fetch(`${PLANNER_SVC_URL}/v1/tour-plans/${encodeURIComponent(planId)}`, {
    headers: plannerHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new PlannerError(res.status, `planner-svc ${res.status}`);
  }
  return (await res.json()) as TourPlanResponse;
}

/**
 * Grant or withdraw public readability for a plan (dt-tests #40).
 *
 * `guestId` comes from the caller's JWT `sub` and is enforced AGAIN inside
 * planner-svc's UPDATE, so a BFF bug cannot let one guest re-share another's
 * plan. Returns null on 404 — which planner-svc also returns for a plan owned
 * by someone else, deliberately, so this cannot be used to probe plan ids.
 */
export async function setTourPlanShared(
  planId: string,
  guestId: string,
  shared: boolean,
): Promise<TourPlanResponse | null> {
  const { PLANNER_SVC_URL } = loadConfig();
  const res = await fetch(`${PLANNER_SVC_URL}/v1/tour-plans/${encodeURIComponent(planId)}/share`, {
    method: shared ? "POST" : "DELETE",
    headers: plannerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ guest_id: guestId }),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new PlannerError(res.status, `planner-svc ${res.status}`);
  }
  return (await res.json()) as TourPlanResponse;
}
