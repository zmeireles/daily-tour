import { describe, it, expect } from "vitest";
import { toCoordinate, coordinateField } from "./center";

describe("toCoordinate", () => {
  it("parses a numeric string to a number", () => {
    expect(toCoordinate("37.74")).toBe(37.74);
    expect(toCoordinate("-25.67")).toBe(-25.67);
  });

  it("passes a number through unchanged", () => {
    expect(toCoordinate(37.74)).toBe(37.74);
    expect(toCoordinate(0)).toBe(0);
  });

  it("yields NaN for a blank or whitespace-only string (not 0)", () => {
    // The bug this guards: Number("") === 0 recenters the picker to (0, lng).
    expect(toCoordinate("")).toBeNaN();
    expect(toCoordinate("   ")).toBeNaN();
  });

  it("yields NaN for nullish or non-numeric input", () => {
    expect(toCoordinate(undefined)).toBeNaN();
    expect(toCoordinate(null)).toBeNaN();
    expect(toCoordinate("abc")).toBeNaN();
  });

  it("distinguishes an explicit '0' (equator) from a blank input", () => {
    expect(toCoordinate("0")).toBe(0);
    expect(toCoordinate("")).toBeNaN();
  });
});

describe("coordinateField", () => {
  const lat = coordinateField(-90, 90);

  it("accepts a numeric string or number", () => {
    expect(lat.parse("37.74")).toBe(37.74);
    expect(lat.parse(-33.5)).toBe(-33.5);
  });

  it("rejects a blank or whitespace-only input as Required — never coerced to 0", () => {
    for (const blank of ["", "   "]) {
      const r = lat.safeParse(blank);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe("Required");
    }
  });

  it("rejects nullish and non-numeric input", () => {
    expect(lat.safeParse(undefined).success).toBe(false);
    expect(lat.safeParse(null).success).toBe(false);
    expect(lat.safeParse("abc").success).toBe(false);
  });

  it("enforces the min/max range", () => {
    expect(lat.safeParse("91").success).toBe(false);
    expect(lat.safeParse("-91").success).toBe(false);
    expect(coordinateField(-180, 180).safeParse("120").success).toBe(true);
  });

  it("accepts an explicit 0 (equator), distinct from a blank", () => {
    expect(lat.parse("0")).toBe(0);
    expect(lat.safeParse("").success).toBe(false);
  });
});
