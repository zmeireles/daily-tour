import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "@/store/session";
import type { DiscoverResponse, DiscoverPlace } from "@/features/discover/sort-utils";
import { flattenGroups } from "@/features/discover/sort-utils";

async function fetchHostsPicks(jwt: string): Promise<DiscoverPlace[]> {
  const res = await fetch("/v1/discover?action=eat", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`discover ${res.status}`);
  const data = (await res.json()) as DiscoverResponse;
  return flattenGroups(data.groups).filter((p) => p.is_hosts_pick);
}

// Shared host's-picks query so the mobile HostsPicksSection and the desktop
// HomeDesktop read the SAME cache entry (["hosts-picks"]) — no double fetch.
export function useHostsPicks() {
  const jwt = useSessionStore((s) => s.jwt);
  return useQuery({
    queryKey: ["hosts-picks"],
    queryFn: () => fetchHostsPicks(jwt!),
    enabled: !!jwt,
    staleTime: 60_000,
  });
}
