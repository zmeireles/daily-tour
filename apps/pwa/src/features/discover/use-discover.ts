import { useQuery } from "@tanstack/react-query";
import type { DiscoverResponse } from "./sort-utils";

async function fetchDiscover(
  action: string,
  loc: { lat: number; lng: number },
  km: number,
  jwt: string,
): Promise<DiscoverResponse> {
  const params = new URLSearchParams({
    action,
    loc: `${loc.lat},${loc.lng}`,
    km: String(km),
  });
  const res = await fetch(`/v1/discover?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const err = new Error(`discover failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as DiscoverResponse;
}

export function useDiscover(
  action: string,
  loc: { lat: number; lng: number },
  km: number,
  jwt: string,
) {
  return useQuery({
    queryKey: ["discover", action, loc.lat, loc.lng, km],
    queryFn: () => fetchDiscover(action, loc, km, jwt),
    enabled: !!jwt && !!action,
    retry: false,
    staleTime: 30_000,
  });
}
