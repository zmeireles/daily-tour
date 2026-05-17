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
    place_detail_duration: ["p(95)<200"],
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

  placeDetailDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200 or 404": (r) => r.status === 200 || r.status === 404,
    "not 5xx": (r) => r.status < 500,
  });
  errorRate.add(!ok);

  sleep(0.2);
}
