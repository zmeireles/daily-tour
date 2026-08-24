import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TourPlanRequest {
  wishes: string[];
  duration_hours: number;
  vehicle: string;
  free_text?: string;
}

export interface TourPlan {
  id: string;
  status: "queued" | "ready" | "rejected";
  plan_payload: Record<string, unknown> | null;
  // dt-tests #40 — ISO timestamp while the plan is shared, null when private.
  // Absent on older cached responses, hence optional.
  shared_at?: string | null;
}

async function postPlan(data: TourPlanRequest, jwt: string): Promise<TourPlan> {
  const res = await fetch("/v1/tour-plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = new Error(`create plan failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as TourPlan;
}

async function fetchPlan(planId: string, jwt: string): Promise<TourPlan> {
  const res = await fetch(`/v1/tour-plans/${planId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const err = new Error(`fetch plan failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as TourPlan;
}

export function useCreateTourPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, jwt }: { data: TourPlanRequest; jwt: string }) => postPlan(data, jwt),
    onSuccess: (plan) => {
      queryClient.setQueryData(["tour-plan", plan.id], plan);
    },
  });
}

export function useTourPlan(planId: string, jwt: string) {
  return useQuery({
    queryKey: ["tour-plan", planId],
    queryFn: () => fetchPlan(planId, jwt),
    enabled: !!planId && !!jwt,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status === "queued") return 2000;
      return false;
    },
    retry: false,
  });
}

async function setShared(planId: string, jwt: string, shared: boolean): Promise<TourPlan> {
  const res = await fetch(`/v1/tour-plans/${planId}/share`, {
    method: shared ? "POST" : "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const err = new Error(`${shared ? "share" : "unshare"} plan failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as TourPlan;
}

/**
 * Grant or withdraw the public link for a plan (dt-tests #40).
 *
 * The server returns the plan's new `shared_at`, and that response — not an
 * optimistic guess — is what updates the cache. Sharing is a privacy boundary:
 * showing "shared" before the server agrees would tell the guest their link is
 * live when it may not be, and showing "private" after a failed revoke is worse
 * still.
 */
export function useSetPlanShared(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jwt, shared }: { jwt: string; shared: boolean }) =>
      setShared(planId, jwt, shared),
    onSuccess: (plan) => {
      queryClient.setQueryData(["tour-plan", plan.id], (prev: TourPlan | undefined) =>
        prev ? { ...prev, shared_at: plan.shared_at ?? null } : plan,
      );
    },
  });
}
