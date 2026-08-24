import { describe, it, expect } from "vitest";
import { paginate, sortRows, type SortState } from "../data-table";

interface Row {
  id: string;
  name: string;
}

const compareByName = (a: Row, b: Row) => a.name.localeCompare(b.name);

describe("paginate (DAILY-TOUR-154)", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}` }));

  it("slices the requested page and reports the page count", () => {
    expect(paginate(rows, 1, 10)).toMatchObject({ totalPages: 2, currentPage: 1 });
    expect(paginate(rows, 1, 10).pageRows).toHaveLength(10);
    expect(paginate(rows, 2, 10).pageRows).toEqual([{ id: "r10" }, { id: "r11" }]);
  });

  // The load-bearing case: a refetch (or a filter applied elsewhere) can shrink
  // the set while the caller still holds page 3. Without the clamp the slice
  // would be empty and the screen would render a blank table that looks broken.
  it("clamps a page beyond the end instead of returning an empty slice", () => {
    const shrunk = rows.slice(0, 4);
    const result = paginate(shrunk, 3, 10);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.pageRows).toHaveLength(4);
  });

  it("reports one page for an empty set rather than zero", () => {
    // totalPages: 0 would make "Page 1 of 0" reachable in the UI.
    expect(paginate([], 1, 10)).toMatchObject({ totalPages: 1, currentPage: 1, pageRows: [] });
  });
});

describe("sortRows (DAILY-TOUR-154)", () => {
  const asc: SortState<"name"> = { column: "name", direction: "asc" };
  const desc: SortState<"name"> = { column: "name", direction: "desc" };

  it("orders ascending and descending by the active column", () => {
    const rows: Row[] = [
      { id: "b", name: "Beta" },
      { id: "a", name: "Alpha" },
    ];
    expect(sortRows(rows, asc, compareByName).map((r) => r.name)).toEqual(["Alpha", "Beta"]);
    expect(sortRows(rows, desc, compareByName).map((r) => r.name)).toEqual(["Beta", "Alpha"]);
  });

  it("does not mutate the input array", () => {
    const rows: Row[] = [
      { id: "b", name: "Beta" },
      { id: "a", name: "Alpha" },
    ];
    sortRows(rows, asc, compareByName);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("breaks ties on id so equal keys keep a stable order in both directions", () => {
    // Every name is identical, so the comparator returns 0 for every pair and
    // ONLY the id tiebreak decides. Fed in reverse id order to prove the output
    // is the tiebreak's doing and not the input's.
    const tied: Row[] = [
      { id: "c", name: "Same" },
      { id: "a", name: "Same" },
      { id: "b", name: "Same" },
    ];
    expect(sortRows(tied, asc, compareByName).map((r) => r.id)).toEqual(["a", "b", "c"]);
    // A tie must NOT flip with direction — the tiebreak is applied after the
    // direction, so descending keeps the same stable order.
    expect(sortRows(tied, desc, compareByName).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
