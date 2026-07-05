import { describe, it, expect } from "vitest";
import { dayBucket, nights, formatDate, localTodayISO, BUCKET_ORDER } from "../agenda";

describe("dayBucket", () => {
  const today = "2026-07-15";

  it("buckets the anchor day as today", () => {
    expect(dayBucket("2026-07-15", today)).toBe("today");
  });

  it("buckets an already-started (past) check-in as today so it stays pinned", () => {
    expect(dayBucket("2026-07-10", today)).toBe("today");
  });

  it("buckets the next day as tomorrow", () => {
    expect(dayBucket("2026-07-16", today)).toBe("tomorrow");
  });

  it("buckets days 2–7 out as this_week (inclusive of the 7th day)", () => {
    expect(dayBucket("2026-07-17", today)).toBe("this_week");
    expect(dayBucket("2026-07-22", today)).toBe("this_week");
  });

  it("buckets day 8 and beyond as later", () => {
    expect(dayBucket("2026-07-23", today)).toBe("later");
    expect(dayBucket("2026-09-01", today)).toBe("later");
  });

  it("crosses month and year boundaries on the local calendar", () => {
    expect(dayBucket("2026-08-01", "2026-07-31")).toBe("tomorrow");
    expect(dayBucket("2027-01-01", "2026-12-31")).toBe("tomorrow");
    expect(dayBucket("2026-12-31", "2026-12-31")).toBe("today");
  });

  it("ignores the time portion of a full ISO timestamp", () => {
    expect(dayBucket("2026-07-16T23:30:00Z", today)).toBe("tomorrow");
  });
});

describe("nights", () => {
  it("counts multi-day stays", () => {
    expect(nights("2026-07-01", "2026-07-05")).toBe(4);
  });

  it("returns 0 for a same-day check-in/check-out", () => {
    expect(nights("2026-07-01", "2026-07-01")).toBe(0);
  });

  it("counts a single night", () => {
    expect(nights("2026-07-01", "2026-07-02")).toBe(1);
  });

  it("clamps an inverted pair to 0", () => {
    expect(nights("2026-07-05", "2026-07-01")).toBe(0);
  });

  it("uses only the date portion of ISO timestamps", () => {
    expect(nights("2026-07-01T14:00:00Z", "2026-07-03T09:00:00Z")).toBe(2);
  });
});

describe("formatDate", () => {
  it("renders a localized short date instead of a raw ISO string", () => {
    const out = formatDate("2026-06-25", "en-US");
    expect(out).toBe("Jun 25, 2026");
    expect(out).not.toContain("2026-06-25");
  });

  it("parses on the local calendar (no UTC off-by-one at Jan 1)", () => {
    expect(formatDate("2026-01-01", "en-US")).toBe("Jan 1, 2026");
  });
});

describe("localTodayISO", () => {
  it("formats a local Date as YYYY-MM-DD", () => {
    // Constructed with local components → no TZ shift.
    expect(localTodayISO(new Date(2026, 6, 5))).toBe("2026-07-05");
  });
});

describe("BUCKET_ORDER", () => {
  it("lists the four sections in agenda order", () => {
    expect([...BUCKET_ORDER]).toEqual(["today", "tomorrow", "this_week", "later"]);
  });
});
