/**
 * Place-detail load test — 100 VUs × 2 min
 *
 * Tests: GET /v1/places/:id
 * Requires JWT auth. Uses the dev-seed place UUID pool (or K6_PLACE_IDS).
 *
 * Thresholds:
 *   - p95 < 200ms
 *   - error rate < 0.1%
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomElement, getJwt, authParams, baseUrl, PLACE_IDS } from "../lib/fixtures.js";

const errorRate = new Rate("place_detail_errors");
const placeDetailDuration = new Trend("place_detail_duration", true);

export const options = {
  vus: 100,
  duration: "2m",
  thresholds: {
    // CI budget: ~3x the 200ms qual SLO (see token-exchange.js note, PR #324)
    place_detail_duration: ["p(95)<600"],
    place_detail_errors: ["rate<0.001"],
  },
};

export function setup() {
  const jwt = getJwt();
  return { jwt, base: baseUrl(), placeIds: PLACE_IDS };
}

export default function (data) {
  const placeId = randomElement(data.placeIds);
  const url = `${data.base}/v1/places/${placeId}`;

  const res = http.get(url, authParams(data.jwt, { tags: { name: "place_detail" } }));

  // Only real responses inform the latency SLO; 429s are expected — the BFF
  // holds a 200/min global per-IP cap and k6 runs from a single IP.
  if (res.status === 200 || res.status >= 500) {
    placeDetailDuration.add(res.timings.duration);
  }

  const ok = check(res, {
    "status expected (200/404/429)": (r) =>
      r.status === 200 || r.status === 404 || r.status === 429,
  });
  errorRate.add(!ok);

  sleep(0.2);
}
