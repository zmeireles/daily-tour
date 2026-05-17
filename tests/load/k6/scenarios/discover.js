/**
 * Discover load test — 100 VUs × 2 min
 *
 * Tests: GET /v1/discover?action=<action>&loc=<lat,lng>&km=20
 * Requires JWT auth (Bearer token obtained in setup).
 *
 * Thresholds:
 *   - p95 < 500ms
 *   - error rate < 0.5%
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
    discover_duration: ["p(95)<500"],
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

  discoverDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "has groups": (r) => {
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
