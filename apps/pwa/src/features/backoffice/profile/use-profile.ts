import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOwnerJwt } from "@/store/owner-session";

const PROFILE_KEY = ["admin", "profile"] as const;

export interface DmChannels {
  in_app: boolean;
  telegram: boolean;
  whatsapp_link: boolean;
  whatsapp_cloud: boolean;
}

export interface OwnerProfile {
  owner_id: string;
  bio: Record<string, string> | null;
  photo: string | null;
  phone: string | null;
  call_enabled: boolean;
  dm_channels: DmChannels | null;
  email: string | null;
  updated_at: string;
}

function authHeader(jwt: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}` };
}

export function useProfile() {
  const jwt = useOwnerJwt();
  return useQuery<OwnerProfile | null>({
    queryKey: PROFILE_KEY,
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/v1/admin/profile", { headers: authHeader(jwt!) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`profile fetch ${res.status}`);
      return res.json() as Promise<OwnerProfile>;
    },
  });
}

export function useUpsertProfile() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => {
      const res = await fetch("/v1/admin/profile", {
        method: "PUT",
        headers: { ...authHeader(jwt!), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`upsert profile ${res.status}`);
      return res.json() as unknown;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}
