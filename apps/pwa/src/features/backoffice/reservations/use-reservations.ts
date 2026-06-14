import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOwnerJwt } from "@/store/owner-session";

const RESERVATIONS_KEY = ["admin", "reservations"] as const;

export type TokenState = "none" | "active" | "revoked";

export interface ReservationRow {
  id: string;
  guesthouse_id: string;
  guest_id: string;
  guest_name: string;
  checkin: string;
  checkout: string;
  party_size: number;
  locale: string;
  status: string;
  token_state: TokenState;
}

interface ReservationsResponse {
  data: ReservationRow[];
}

interface IssueTokenResponse {
  token: string;
}

function authHeader(jwt: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}` };
}

export function useReservations() {
  const jwt = useOwnerJwt();
  return useQuery<ReservationsResponse>({
    queryKey: RESERVATIONS_KEY,
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/v1/admin/reservations", { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`reservations list ${res.status}`);
      return res.json() as Promise<ReservationsResponse>;
    },
  });
}

// Mint a guest-entry token for a reservation. token-svc returns the opaque
// token; the UI builds the `/r/<token>` shareable link from it.
export function useIssueToken() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation<IssueTokenResponse, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/v1/admin/reservations/${id}/token`, {
        method: "POST",
        headers: authHeader(jwt!),
      });
      if (!res.ok) throw new Error(`issue token ${res.status}`);
      return res.json() as Promise<IssueTokenResponse>;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESERVATIONS_KEY }),
  });
}

// Revoke a reservation's active token(s). token-svc returns 204 (no body).
export function useRevokeToken() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/v1/admin/reservations/${id}/token`, {
        method: "DELETE",
        headers: authHeader(jwt!),
      });
      if (!res.ok) throw new Error(`revoke token ${res.status}`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESERVATIONS_KEY }),
  });
}
