import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "@/store/session";
import type { DiscoverResponse, DiscoverPlace } from "@/features/discover/sort-utils";
import { flattenGroups } from "@/features/discover/sort-utils";

async function fetchHostsPicks(jwt: string): Promise<DiscoverPlace[]> {
  // action=see: the host's picks are photographed must-see landmarks (Sete
  // Cidades, Lagoa do Fogo, …), surfaced via is_hosts_pick. (eat places are the
  // owner-upload-blocked businesses with no photos — they read as blank tiles.)
  // No loc → the BFF returns all is_hosts_pick see places, no distance filter.
  const res = await fetch("/v1/discover?action=see", {
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
