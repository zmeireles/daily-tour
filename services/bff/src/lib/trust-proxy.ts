import { BlockList, isIPv4 } from "node:net";

/**
 * Number of reverse-proxy hops in front of this service whose
 * `X-Forwarded-For` contribution may be believed. Deployments put exactly one
 * (Traefik) in the path; see infra/compose/docker-compose.traefik.yml.
 */
export const TRUSTED_PROXY_HOPS = 1;

/**
 * Where that hop can sit: loopback, link-local and private ranges. Traefik
 * reaches us over `dt_internal`, whose subnet Docker assigns per host, so the
 * range is the whole private space rather than a pinned CIDR — a stale CIDR
 * fails closed into "every client shares one bucket".
 */
const PROXY_NETWORKS = new BlockList();
PROXY_NETWORKS.addSubnet("127.0.0.0", 8, "ipv4");
PROXY_NETWORKS.addSubnet("10.0.0.0", 8, "ipv4");
PROXY_NETWORKS.addSubnet("172.16.0.0", 12, "ipv4");
PROXY_NETWORKS.addSubnet("192.168.0.0", 16, "ipv4");
PROXY_NETWORKS.addSubnet("169.254.0.0", 16, "ipv4");
PROXY_NETWORKS.addAddress("::1", "ipv6");
PROXY_NETWORKS.addSubnet("fc00::", 7, "ipv6");
PROXY_NETWORKS.addSubnet("fe80::", 10, "ipv6");

const IPV4_MAPPED_PREFIX = "::ffff:";

function isProxyNetworkAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  const unmapped = address.toLowerCase().startsWith(IPV4_MAPPED_PREFIX)
    ? address.slice(IPV4_MAPPED_PREFIX.length)
    : address;
  return isIPv4(unmapped)
    ? PROXY_NETWORKS.check(unmapped, "ipv4")
    : PROXY_NETWORKS.check(unmapped, "ipv6");
}

/**
 * Fastify `trustProxy` function. Hop 0 is the socket peer; trusting it makes
 * `req.ip` the last `X-Forwarded-For` entry, i.e. the address the proxy saw.
 *
 * Fastify >= 5.12 makes a bare hop count (`trustProxy: 1`) fail closed, because
 * a count cannot tell a proxy from a direct client that sends enough hops of
 * its own. This keeps the one-hop semantics and adds that missing check: the
 * peer must be on a proxy network, and only the first hop is ever trusted.
 */
export function isTrustedProxyHop(address: string, hop: number): boolean {
  return hop < TRUSTED_PROXY_HOPS && isProxyNetworkAddress(address);
}
