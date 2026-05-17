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
