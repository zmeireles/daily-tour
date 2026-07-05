import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOwnerJwt } from "@/store/owner-session";

const GUESTHOUSES_KEY = ["admin", "guesthouses"] as const;

export interface GuesthouseRow {
  id: string;
  owner_id: string;
  name: Record<string, string>;
  slug: string;
  address: string;
  geom_lat: number;
  geom_lng: number;
  media: string[];
  // Plan-006 6.A: global places this guesthouse hides from its guests (opt-out scoping).
  hidden_place_ids: string[];
  created_at: string;
  updated_at: string;
}

interface GuesthousesResponse {
  data: GuesthouseRow[];
  nextCursor: string | null;
}

function authHeader(jwt: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}` };
}

export function useGuesthouses() {
  const jwt = useOwnerJwt();
  return useQuery<GuesthousesResponse>({
    queryKey: GUESTHOUSES_KEY,
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/v1/admin/guesthouses", { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`guesthouses list ${res.status}`);
      return res.json() as Promise<GuesthousesResponse>;
    },
  });
}

export function useGuesthouse(id: string) {
  const jwt = useOwnerJwt();
  return useQuery<GuesthouseRow>({
    queryKey: [...GUESTHOUSES_KEY, id],
    enabled: !!jwt && !!id,
    queryFn: async () => {
      const res = await fetch(`/v1/admin/guesthouses/${id}`, { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`guesthouse fetch ${res.status}`);
      return res.json() as Promise<GuesthouseRow>;
    },
  });
}

export function useCreateGuesthouse() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => {
      const res = await fetch("/v1/admin/guesthouses", {
        method: "POST",
        headers: { ...authHeader(jwt!), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`create guesthouse ${res.status}`);
      return res.json() as unknown;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: GUESTHOUSES_KEY }),
  });
}

export function useUpdateGuesthouse(id: string) {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => {
      const res = await fetch(`/v1/admin/guesthouses/${id}`, {
        method: "PATCH",
        headers: { ...authHeader(jwt!), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`update guesthouse ${res.status}`);
      return res.json() as unknown;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: GUESTHOUSES_KEY }),
  });
}

// Plan-006 6.A.3 — hide/unhide a global place for this guesthouse's guests.
// PUT adds it to hidden_place_ids; DELETE removes it. Idempotent at catalog-svc.
export function useToggleHiddenPlace() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      guesthouseId,
      placeId,
      hide,
    }: {
      guesthouseId: string;
      placeId: string;
      hide: boolean;
    }) => {
      const res = await fetch(`/v1/admin/guesthouses/${guesthouseId}/hidden-places/${placeId}`, {
        method: hide ? "PUT" : "DELETE",
        headers: authHeader(jwt!),
      });
      if (!res.ok) throw new Error(`toggle hidden place ${res.status}`);
      return res.json() as unknown;
    },
    // Optimistic: flip the guesthouse's hidden_place_ids immediately so the
    // visibility switch feels instant on a weak connection; roll back on error.
    onMutate: async ({ guesthouseId, placeId, hide }) => {
      await qc.cancelQueries({ queryKey: GUESTHOUSES_KEY });
      const previous = qc.getQueryData<GuesthousesResponse>(GUESTHOUSES_KEY);
      qc.setQueryData<GuesthousesResponse>(GUESTHOUSES_KEY, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((g) =>
                g.id !== guesthouseId
                  ? g
                  : {
                      ...g,
                      hidden_place_ids: hide
                        ? [...g.hidden_place_ids, placeId]
                        : g.hidden_place_ids.filter((x) => x !== placeId),
                    },
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(GUESTHOUSES_KEY, ctx.previous);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: GUESTHOUSES_KEY }),
  });
}
