import { fetchPlaceHydrated } from "./catalog-client.js";
import type { TourPlanResponse } from "./planner-client.js";

// PWA-facing stop shape — mirrors TourStop in apps/pwa/src/components/timeline-stop.tsx.
export interface TourStop {
  id: string;
  time: string;
  kind: "meal" | "activity" | "transit";
  name: string;
  description?: string;
  duration_min?: number;
  // Drive time from the previous stop (OSRM/haversine, populated by planner-svc
  // slice C). Omitted for the first stop and whenever it's absent or zero.
  travel_to_minutes?: number;
}

// planner-svc step shape — what plan_payload.steps[] carries.
interface PlanStep {
  slot: string;
  place_id: string;
  start: string;
  end: string;
  rationale: string;
  travel_to_minutes: number;
  locked: boolean;
}

const MEAL_SLOTS = new Set(["breakfast", "lunch", "dinner"]);

// Slice the wall-clock "HH:MM" straight from the ISO string — never tz-shift.
function isoToHHMM(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match ? match[1]! : "";
}

function slotToKind(slot: string): TourStop["kind"] {
  return MEAL_SLOTS.has(slot) ? "meal" : "activity";
}

// (end - start) in whole minutes; undefined when either side is unparseable.
function durationMinutes(start: string, end: string): number | undefined {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return undefined;
  return Math.round((endMs - startMs) / 60000);
}

function pickName(names: Record<string, string>): string | undefined {
  return names["en"] ?? Object.values(names)[0];
}

// Resolve place_id → display name. Tolerant: any catalog miss/error falls back to the id.
async function resolvePlaceName(placeId: string): Promise<string> {
  try {
    const place = await fetchPlaceHydrated(placeId);
    return pickName(place.name) ?? placeId;
  } catch {
    return placeId;
  }
}

function toStop(step: PlanStep, name: string, idx: number, hasDuplicateId: boolean): TourStop {
  const duration = durationMinutes(step.start, step.end);
  return {
    id: hasDuplicateId ? `${step.place_id}#${idx}` : step.place_id,
    time: isoToHHMM(step.start),
    kind: slotToKind(step.slot),
    name,
    description: step.rationale,
    ...(duration !== undefined ? { duration_min: duration } : {}),
    ...(typeof step.travel_to_minutes === "number" && step.travel_to_minutes > 0
      ? { travel_to_minutes: step.travel_to_minutes }
      : {}),
  };
}

function extractSteps(payload: Record<string, unknown>): PlanStep[] {
  const steps = payload["steps"];
  return Array.isArray(steps) ? (steps as PlanStep[]) : [];
}

function findDuplicateIds(steps: PlanStep[]): Set<string> {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.place_id)) duplicated.add(step.place_id);
    seen.add(step.place_id);
  }
  return duplicated;
}

// Anti-corruption layer: add a PWA-shaped plan_payload.stops[] enriched with place names.
// Additive — leaves the original `steps` (and any other keys) untouched.
export async function withStops(plan: TourPlanResponse): Promise<TourPlanResponse> {
  if (!plan.plan_payload) return plan;

  const steps = extractSteps(plan.plan_payload);
  const names = await Promise.all(steps.map((step) => resolvePlaceName(step.place_id)));
  const duplicated = findDuplicateIds(steps);

  const stops = steps.map((step, idx) =>
    toStop(step, names[idx]!, idx, duplicated.has(step.place_id)),
  );
  return { ...plan, plan_payload: { ...plan.plan_payload, stops } };
}
