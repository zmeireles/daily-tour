/**
 * Tour-plan load test — 5 VUs × 5 min
 *
 * Tests: POST /v1/tour-plans
 * Low VU count — the planner is rate-limited by Anthropic on the backend.
 * Each iteration generates a full LLM-backed tour plan.
 *
 * Thresholds:
 *   - p95 < 30s  (LLM call included)
 *   - error rate < 5%
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { randomElement, getJwt, authParams, baseUrl, VALID_ACTIONS } from "../lib/fixtures.js";

const errorRate = new Rate("tour_plan_errors");
const tourPlanDuration = new Trend("tour_plan_duration", true);

// Rotating wish selections — each iteration posts a slightly varied payload
// so the planner doesn't hit a trivial cache and we exercise real LLM paths.
const WISH_POOLS = [
  ["eat", "see"],
  ["drink", "do"],
  ["see", "buy"],
  ["eat", "do", "see"],
  ["drink", "see", "buy"],
];

const VEHICLES = ["car", "bike", "walking", "bus"];
const DURATIONS = [2, 3, 4, 6];

export const options = {
  vus: 5,
  duration: "5m",
  thresholds: {
    tour_plan_duration: ["p(95)<30000"],
    tour_plan_errors: ["rate<0.05"],
  },
};

export function setup() {
  const jwt = getJwt();
  return { jwt, base: baseUrl() };
}

export default function (data) {
  const url = `${data.base}/v1/tour-plans`;
  const payload = JSON.stringify({
    wishes: randomElement(WISH_POOLS),
    duration_hours: randomElement(DURATIONS),
    vehicle: randomElement(VEHICLES),
  });

  const res = http.post(
    url,
    payload,
    authParams(data.jwt, {
      headers: {
        Authorization: `Bearer ${data.jwt}`,
        "Content-Type": "application/json",
      },
      timeout: "35s",
      tags: { name: "tour_plan" },
    }),
  );

  tourPlanDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 201": (r) => r.status === 201,
    "has plan_id": (r) => {
      try {
        const body = r.json();
        return body && typeof body.id === "string";
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);

  // Planner calls are expensive — give the LLM time to breathe between VU
  // iterations so Anthropic rate limits don't cascade into hard failures.
  sleep(5);
}
