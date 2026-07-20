import { z } from "zod";

export const SAO_MIGUEL_CENTER = { lng: -25.67, lat: 37.74, zoom: 10 } as const;

export function clampZoom(z: number): number {
  return Math.min(18, Math.max(6, z));
}

/**
 * Parse a form-held coordinate value to a number. A blank or non-numeric input
 * yields NaN (not `0`) so callers can fall back to a default map center — avoids
 * the `Number("") === 0` trap that recenters the picker to (0, lng).
 */
export function toCoordinate(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number.parseFloat(value);
  return Number.NaN;
}

/**
 * A required latitude/longitude form field. A blank, whitespace-only, or
 * non-numeric input is a validation error ("Required") — never silently coerced
 * to 0 (the `Number("") === 0` / `Number("  ") === 0` trap). Shared by the place
 * and guesthouse forms so the picker parser (`toCoordinate`) and the schema
 * agree on what counts as "blank".
 */
export function coordinateField(min: number, max: number) {
  return z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.coerce.number({ invalid_type_error: "Required" }).min(min).max(max),
  );
}
