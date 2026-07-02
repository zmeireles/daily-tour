/**
 * Discover load test — 100 VUs × 2 min
 *
 * Tests: GET /v1/discover?action=<action>&loc=<lat,lng>&km=20
 * Requires JWT auth (Bearer token obtained in setup).
 *
 * 429 is EXPECTED for most requests: /v1/discover is per-guest rate-limited
 * (30/min, #301) and the BFF holds a 200/min global per-IP cap — k6's single
 * IP + shared guest JWT saturate both. The test measures latency on requests
 * that make it through and that rate-limited rejections stay cheap; any
 * other status (401, 404, 5xx) is a real failure.
 *
 * Thresholds:
 *   - p95 < 1500ms on real responses (CI budget, see token-exchange.js)
 *   - unexpected-status rate < 0.5%
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  randomElement,
  getJwt,
  authParams,
  baseUrl,
  DEFAULT_LOC,
  VALID_ACTIONS,
} from "../lib/fixtures.js";

const errorRate = new Rate("discover_errors");
const discoverDuration = new Trend("discover_duration", true);

export const options = {
  vus: 100,
  duration: "2m",
  thresholds: {
    // CI budget: ~3x the 500ms qual SLO (see token-exchange.js note, PR #324)
    discover_duration: ["p(95)<1500"],
    discover_errors: ["rate<0.005"],
  },
};

export function setup() {
  const jwt = getJwt();
  return { jwt, base: baseUrl() };
}

export default function (data) {
  const action = randomElement(VALID_ACTIONS);
  const loc = __ENV.K6_LOC || DEFAULT_LOC;
  const url = `${data.base}/v1/discover?action=${action}&loc=${loc}&km=20`;

  const res = http.get(url, authParams(data.jwt, { tags: { name: "discover" } }));

  // Only real responses inform the latency SLO — 429s return in <1ms and
  // would flatter the trend.
  if (res.status === 200 || res.status >= 500) {
    discoverDuration.add(res.timings.duration);
  }

  const ok = check(res, {
    "status expected (200/429)": (r) => r.status === 200 || r.status === 429,
    "200 has groups": (r) => {
      if (r.status !== 200) return true;
      try {
        const body = r.json();
        return body && typeof body.count === "number";
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);

  sleep(0.2);
}
