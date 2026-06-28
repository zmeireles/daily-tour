import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "@/store/session";
import type { DiscoverPlace } from "@/features/discover/sort-utils";

async function fetchHostsPicks(jwt: string): Promise<DiscoverPlace[]> {
  // Host's picks span ALL categories — is_hosts_pick is a place-level flag — so this
  // hits the dedicated cross-category endpoint, not /v1/discover?action=see, which
  // only ever returned the "see" picks and hid eat/drink/do/… picks (daily-tour
  // #160). Photoless picks are gated out server-side so they never read as blank tiles.
  const res = await fetch("/v1/discover/hosts-picks", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`hosts-picks ${res.status}`);
  const data = (await res.json()) as { places: DiscoverPlace[] };
  return data.places;
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
