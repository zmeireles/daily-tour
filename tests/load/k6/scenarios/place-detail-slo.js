/**
 * Place-detail LATENCY SLO — steady arrival, deliberately BELOW the rate limit
 *
 * Tests: GET /v1/places/:id
 *
 * Why this exists alongside place-detail.js
 * ─────────────────────────────────────────
 * place-detail.js offers ~500 req/s from one IP against a 200/min global cap,
 * so >99% of it is rejected and the handful that get through arrive as a
 * thundering herd in the first seconds of each fixed limiter window. Measured
 * on 2026-08-18 (#328): a 2-minute run admits exactly 400 requests, and every
 * one of them lands inside 2-11 seconds of the 120. Its "admitted p95" is the
 * queueing delay of a ~100-way burst — not what a guest experiences, and the
 * mechanical reason that number swings +/-40% between identical runs.
 *
 * This scenario measures the thing the 200ms UX SLO is actually about: what a
 * request costs when it is simply served. It uses an OPEN model (arrival rate,
 * not VUs-with-sleep) so latency cannot feed back into offered load, and it
 * stays under the per-IP cap so nothing is rejected.
 *
 * Keep both. They answer different questions:
 *   place-detail.js      — does the service survive a flood and reject cheaply?
 *   place-detail-slo.js  — how fast is a served request?
 */

import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomElement, getJwt, authParams, baseUrl, PLACE_IDS } from "../lib/fixtures.js";

const errorRate = new Rate("place_detail_slo_errors");
// Self-check: if this run drifts over the limiter's budget the latency numbers
// stop meaning "served" and start meaning "won a race". A threshold on it makes
// the scenario fail as INVALID rather than report a number nobody can read.
const throttled = new Rate("place_detail_slo_throttled");
const duration = new Trend("place_detail_slo_duration", true);

// Global limiter is 200 / minute / IP (services/bff/src/app.ts). 3/s = 180/min
// leaves headroom for setup()'s two token calls and for timing jitter.
const ARRIVAL_RATE = Number(__ENV.K6_SLO_RATE || 3);

export const options = {
  scenarios: {
    steady: {
      executor: "constant-arrival-rate",
      rate: ARRIVAL_RATE,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
  thresholds: {
    // The real UX SLO. Unlike the flood scenario's median tripwire this is a
    // tail bound, because with steady arrival the tail is stable.
    place_detail_slo_duration: ["p(95)<200"],
    place_detail_slo_errors: ["rate<0.001"],
    // Validity gate, not a performance gate.
    place_detail_slo_throttled: ["rate<0.01"],
  },
};

export function setup() {
  const jwt = getJwt();
  return { jwt, base: baseUrl(), placeIds: PLACE_IDS };
}

export default function (data) {
  const placeId = randomElement(data.placeIds);
  const res = http.get(
    `${data.base}/v1/places/${placeId}`,
    authParams(data.jwt, { tags: { name: "place_detail_slo" } }),
  );

  throttled.add(res.status === 429);
  if (res.status === 200) duration.add(res.timings.duration);

  const ok = check(res, {
    "status expected (200/404)": (r) => r.status === 200 || r.status === 404,
  });
  errorRate.add(!ok);
}
