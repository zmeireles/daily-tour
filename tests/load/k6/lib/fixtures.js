/**
 * Shared fixtures and helpers for k6 load test scenarios.
 *
 * Token flow:
 *   token-svc: POST /v1/reservations/:id/token  → opaque token
 *   BFF:       GET  /r/:token                   → { jwt, exp }
 *
 * All authenticated scenarios (discover, place-detail, tour-plan) need a
 * valid JWT. Call getJwt() in k6's setup() and pass the returned string as
 * shared data to VUs.
 *
 * For token-exchange scenario only: provide comma-separated opaque tokens via
 * K6_OPAQUE_TOKENS env var, or mint fresh ones via mintTokensForReservation().
 */

import http from "k6/http";
import { check } from "k6";

// ── env helpers ─────────────────────────────────────────────────────────────

export function baseUrl() {
  return __ENV.BASE_URL || "http://localhost:8080";
}

export function tokenSvcUrl() {
  return __ENV.TOKEN_SVC_URL || "http://localhost:8088";
}

// ── fixtures ─────────────────────────────────────────────────────────────────

// Dev-seed place IDs from services/catalog-svc/seeds/places-sao-miguel.sql.
// Accept override via K6_PLACE_IDS (comma-separated UUIDs) for QA / prod.
export const PLACE_IDS = (__ENV.K6_PLACE_IDS || "").split(",").filter(Boolean).length
  ? __ENV.K6_PLACE_IDS.split(",").map((s) => s.trim())
  : [
      "c0000001-0000-4000-a000-000000000001",
      "c0000001-0000-4000-a000-000000000002",
      "c0000001-0000-4000-a000-000000000003",
      "c0000001-0000-4000-a000-000000000004",
      "c0000001-0000-4000-a000-000000000005",
      "c0000001-0000-4000-a000-000000000006",
      "c0000001-0000-4000-a000-000000000007",
      "c0000001-0000-4000-a000-000000000008",
      "c0000001-0000-4000-a000-000000000009",
      "c0000001-0000-4000-a000-000000000010",
      "c0000001-0000-4000-a000-000000000011",
      "c0000001-0000-4000-a000-000000000012",
      "c0000001-0000-4000-a000-000000000013",
      "c0000001-0000-4000-a000-000000000014",
      "c0000001-0000-4000-a000-000000000015",
    ];

// São Miguel GPS centre — used as default loc for discover tests.
// Override via K6_LOC (lat,lng) for QA / prod targets.
export const DEFAULT_LOC = __ENV.K6_LOC || "37.7412,-25.6756";
export const VALID_ACTIONS = ["eat", "drink", "see", "do", "buy", "move"];

// Dev-seed reservation IDs from services/token-svc/src/seed/run.ts.
// Override via K6_RESERVATION_IDS for QA environments.
const DEFAULT_RESERVATION_IDS = [
  "ccc00001-0000-4000-c000-000000000001",
  "ccc00001-0000-4000-c000-000000000002",
];
export const RESERVATION_IDS = (__ENV.K6_RESERVATION_IDS || "")
  .split(",")
  .filter(Boolean)
  .map((s) => s.trim())
  .concat(DEFAULT_RESERVATION_IDS.filter(() => !__ENV.K6_RESERVATION_IDS));

// ── utilities ─────────────────────────────────────────────────────────────────

export function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── token helpers ─────────────────────────────────────────────────────────────

/**
 * Mint a new opaque token for a reservation via token-svc's internal route.
 * Only callable from k6 setup() or teardown() (not hot path — one round-trip).
 * Requires TOKEN_SVC_URL to reach token-svc directly (internal network).
 *
 * Returns the opaque token string or throws on failure.
 */
export function mintToken(reservationId) {
  const url = `${tokenSvcUrl()}/v1/reservations/${reservationId}/token`;
  const res = http.post(url, null, { tags: { name: "mint_token" } });
  check(res, { "mint_token 200": (r) => r.status === 200 });
  if (res.status !== 200) {
    throw new Error(
      `mintToken failed for ${reservationId}: status=${res.status} body=${res.body}`,
    );
  }
  return res.json("token");
}

/**
 * Exchange an opaque token via the BFF guest-link route.
 * GET /r/:token → { jwt, exp }
 *
 * Returns { jwt, exp } or throws on failure.
 */
export function exchangeToken(opaque) {
  const url = `${baseUrl()}/r/${opaque}`;
  const res = http.get(url, { tags: { name: "exchange_token" } });
  check(res, { "exchange_token 200": (r) => r.status === 200 });
  if (res.status !== 200) {
    throw new Error(`exchangeToken failed: status=${res.status} body=${res.body}`);
  }
  return res.json();
}

/**
 * Obtain a valid JWT for use in authenticated scenario setup().
 *
 * Tries K6_OPAQUE_TOKENS first (comma-separated, pre-minted out-of-band).
 * Falls back to minting a fresh token from the first RESERVATION_ID via
 * token-svc (requires TOKEN_SVC_URL to be reachable — local dev only).
 *
 * Returns the JWT string.
 */
export function getJwt() {
  const opaquePool = (__ENV.K6_OPAQUE_TOKENS || "")
    .split(",")
    .filter(Boolean)
    .map((s) => s.trim());

  const opaque = opaquePool.length > 0 ? opaquePool[0] : mintToken(RESERVATION_IDS[0]);

  const { jwt } = exchangeToken(opaque);
  return jwt;
}

/**
 * Return k6 HTTP params with Bearer auth header.
 */
export function authParams(jwt, extra) {
  return {
    headers: { Authorization: `Bearer ${jwt}` },
    ...extra,
  };
}

/**
 * Return the pre-minted opaque token pool for the token-exchange scenario.
 *
 * If K6_OPAQUE_TOKENS is set, use those.
 * Otherwise mint one token per reservation in RESERVATION_IDS (local dev).
 */
export function getOpaquePool() {
  const envTokens = (__ENV.K6_OPAQUE_TOKENS || "")
    .split(",")
    .filter(Boolean)
    .map((s) => s.trim());
  if (envTokens.length > 0) return envTokens;

  return RESERVATION_IDS.map((rid) => mintToken(rid));
}
