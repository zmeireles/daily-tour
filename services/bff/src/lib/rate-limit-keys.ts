import type { FastifyRequest } from "fastify";

/**
 * Per-guest rate-limit key for the LLM-cost routes (tour-plans, discover).
 *
 * Hook-ordering constraint (T-3.C.3): @fastify/rate-limit's `onRequest` hook
 * runs BEFORE the route `preHandler`s, so `req.user` (populated by the
 * `fastify.authenticate` preHandler in plugins/auth.ts) is still UNDEFINED here.
 * Keying on `req.user.sub` would therefore collapse every guest into one bucket.
 *
 * So we decode (NOT verify) the bearer JWT ourselves to read the `sub` (guest
 * id) claim. The real signature/exp/revocation check still happens later in the
 * authenticate preHandler — this decode only chooses the rate-limit bucket. A
 * forged token earns its own bucket but is rejected milliseconds later by the
 * verifying preHandler, so there's no security regression.
 *
 * MUST NEVER THROW: a throwing keyGenerator turns into a 500. On any failure —
 * missing/garbage token, missing `sub` — we fall back to `req.ip` (the same key
 * the global limiter uses), so unauthenticated/malformed traffic is still
 * bucketed, just per-IP rather than per-guest.
 */
export function guestKeyGenerator(req: FastifyRequest): string {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return req.ip;
    const token = header.slice("Bearer ".length).trim();
    if (!token) return req.ip;

    // Decode-only: no signature verification (the authenticate preHandler does
    // the real verify). `decode` returns null on a malformed token.
    const decoded = req.server.jwt.decode<{ sub?: string }>(token);
    const sub = decoded?.sub;
    return typeof sub === "string" && sub.length > 0 ? sub : req.ip;
  } catch {
    return req.ip;
  }
}
