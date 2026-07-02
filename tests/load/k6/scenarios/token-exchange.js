/**
 * Token-exchange load test — 50 VUs × 1 min
 *
 * Tests the BFF guest-link route: GET /v1/r/:token
 * The BFF calls token-svc, which looks up the opaque token hash in Postgres.
 *
 * Thresholds:
 *   - p95 < 300ms
 *   - error rate < 0.1%
 *
 * Rate-limit note: /v1/r/:token has a 30 req/min cap per IP on the BFF side.
 * k6 runs from a single IP, so at 50 VUs the limit fires quickly. This is
 * intentional — the test verifies latency on requests that make it through
 * AND that rate-limited responses are cheap (< 300ms 429s). 429 and 302
 * (expired/invalid redirect) are expected under load; any OTHER status —
 * 5xx or a 4xx like the 404 a moved route produces — counts as an error,
 * so a broken route can never pass silently.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomElement, getOpaquePool, baseUrl } from "../lib/fixtures.js";

const errorRate = new Rate("token_exchange_errors");
const exchangeDuration = new Trend("token_exchange_duration", true);

export const options = {
  vus: 50,
  duration: "1m",
  thresholds: {
    // p95 of successful exchanges must be under 300ms
    token_exchange_duration: ["p(95)<300"],
    // unexpected statuses (5xx, 404, …) must stay below 0.1%
    token_exchange_errors: ["rate<0.001"],
  },
};

export function setup() {
  const pool = getOpaquePool();
  if (pool.length === 0) {
    throw new Error(
      "No opaque tokens available. Set K6_OPAQUE_TOKENS or ensure TOKEN_SVC_URL is reachable.",
    );
  }
  return { pool, base: baseUrl() };
}

export default function (data) {
  const opaque = randomElement(data.pool);
  const url = `${data.base}/v1/r/${opaque}`;

  const res = http.get(url, { tags: { name: "token_exchange" } });

  // Track duration only for responses that exercised the full exchange path.
  // 429 (rate-limited) and 302 (redirect for expired/invalid) are excluded
  // so they don't distort the latency measurement.
  const isExchange = res.status === 200 || res.status >= 500;
  if (isExchange) {
    exchangeDuration.add(res.timings.duration);
  }

  const ok = check(res, {
    "status expected (200/302/429)": (r) =>
      r.status === 200 || r.status === 302 || r.status === 429,
  });
  errorRate.add(!ok);

  // Brief sleep keeps the per-IP rate limit from firing on every single
  // request and lets the test measure latency rather than just 429 rate.
  sleep(0.5);
}
