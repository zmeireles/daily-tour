import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NavCountBadge, NAV_GROUPS, BOTTOM_TABS, MORE_ITEMS } from "../nav";

describe("NavCountBadge (count-badge slot)", () => {
  it("renders the count when > 0", () => {
    const { getByText } = render(<NavCountBadge count={3} />);
    expect(getByText("3")).toBeDefined();
  });

  it("caps at 99+", () => {
    const { getByText } = render(<NavCountBadge count={150} />);
    expect(getByText("99+")).toBeDefined();
  });

  it("renders nothing for a 0 or undefined count", () => {
    const zero = render(<NavCountBadge count={0} />);
    expect(zero.container.firstChild).toBeNull();
    const missing = render(<NavCountBadge />);
    expect(missing.container.firstChild).toBeNull();
  });
});

describe("admin nav model", () => {
  it("puts a badge slot on Reservations + Messages only", () => {
    const badged = NAV_GROUPS.flatMap((g) => g.items)
      .filter((i) => i.badge)
      .map((i) => i.key)
      .sort();
    expect(badged).toEqual(["chat", "reservations"]);
  });

  it("bottom bar exposes the four primary destinations in order", () => {
    expect(BOTTOM_TABS.map((i) => i.key)).toEqual(["today", "reservations", "chat", "places"]);
  });

  it("More reveals the overflow destinations", () => {
    expect(MORE_ITEMS.map((i) => i.key)).toEqual(["guesthouses", "profile", "beta"]);
  });
});
