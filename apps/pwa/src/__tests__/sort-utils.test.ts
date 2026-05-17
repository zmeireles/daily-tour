import { describe, it, expect } from "vitest";
import { sortPlaces, flattenGroups } from "@/features/discover/sort-utils";
import type { DiscoverPlace, WishGroup } from "@/features/discover/sort-utils";

const makePlace = (id: string, overrides: Partial<DiscoverPlace> = {}): DiscoverPlace => ({
  id,
  name: { en: `Place ${id}` },
  description: { en: `Desc ${id}` },
  hero_image_url: null,
  wishes: ["wish-a"],
  ...overrides,
});

describe("sortPlaces", () => {
  it("sorts by distance ascending, placing undefined last", () => {
    const places = [
      makePlace("a", { distance_km: 5 }),
      makePlace("b", { distance_km: 1 }),
      makePlace("c"),
    ];
    const result = sortPlaces(places, "distance", "en");
    expect(result.map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by name alphabetically in locale order", () => {
    const places = [
      makePlace("1", { name: { en: "Zebra Cafe" } }),
      makePlace("2", { name: { en: "Apple Bar" } }),
      makePlace("3", { name: { en: "Mango Grill" } }),
    ];
    const result = sortPlaces(places, "name", "en");
    expect(result.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by rating falls back to id descending when no rating field", () => {
    const places = [makePlace("aaa"), makePlace("ccc"), makePlace("bbb")];
    const result = sortPlaces(places, "rating", "en");
    expect(result.map((p) => p.id)).toEqual(["ccc", "bbb", "aaa"]);
  });
});

describe("flattenGroups", () => {
  it("deduplicates places that appear in multiple wish groups", () => {
    const place1 = makePlace("p1");
    const place2 = makePlace("p2");
    const groups: WishGroup[] = [
      { wish: "wish-a", places: [place1, place2] },
      { wish: "wish-b", places: [place1] },
    ];
    const result = flattenGroups(groups);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("preserves first-encounter order across groups", () => {
    const groups: WishGroup[] = [
      { wish: "wish-a", places: [makePlace("x"), makePlace("y")] },
      { wish: "wish-b", places: [makePlace("y"), makePlace("z")] },
    ];
    const result = flattenGroups(groups);
    expect(result.map((p) => p.id)).toEqual(["x", "y", "z"]);
  });

  it("returns empty array for empty groups", () => {
    expect(flattenGroups([])).toEqual([]);
  });
});
