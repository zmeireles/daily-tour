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

async function readPlan(url: string): Promise<TourPlanResponse | null> {
  const res = await fetch(url);
  // planner-svc answers 404 for "no such plan", "not yours" and "not shared"
  // alike, so neither read can be used to discover which plan ids exist.
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new PlannerError(res.status, `planner-svc ${res.status}`);
  }
  return (await res.json()) as TourPlanResponse;
}

/**
 * Read a plan on behalf of the guest who owns it (dt-tests #42).
 *
 * `guestId` is the caller's JWT `sub` and is REQUIRED — both here, where
 * TypeScript refuses a caller that omits it, and again in planner-svc, whose
 * `guest_id` query param has no default. Before this, the authed read was
 * scoped by nothing: any valid token read any plan by id.
 *
 * Do NOT reach for this on the public path — use getPublicTourPlan.
 */
export async function getTourPlan(
  planId: string,
  guestId: string,
): Promise<TourPlanResponse | null> {
  const { PLANNER_SVC_URL } = loadConfig();
  const qs = new URLSearchParams({ guest_id: guestId });
  return await readPlan(
    `${PLANNER_SVC_URL}/v1/tour-plans/${encodeURIComponent(planId)}?${qs.toString()}`,
  );
}

/**
 * Read a plan its owner has shared — the unauthenticated path (dt-tests #40).
 *
 * A distinct planner-svc route, not the owner read with the scope left off:
 * that route enforces `shared_at IS NOT NULL` itself, so an unshared plan is
 * unreachable here even if the calling route stopped checking.
 */
export async function getPublicTourPlan(planId: string): Promise<TourPlanResponse | null> {
  const { PLANNER_SVC_URL } = loadConfig();
  return await readPlan(`${PLANNER_SVC_URL}/v1/public/tour-plans/${encodeURIComponent(planId)}`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_id: guestId }),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new PlannerError(res.status, `planner-svc ${res.status}`);
  }
  return (await res.json()) as TourPlanResponse;
}
