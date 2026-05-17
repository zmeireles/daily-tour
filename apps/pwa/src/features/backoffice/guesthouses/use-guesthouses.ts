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
