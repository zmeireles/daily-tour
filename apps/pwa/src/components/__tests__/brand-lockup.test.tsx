import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandLockup } from "@/components/brand-lockup";

describe("BrandLockup", () => {
  it("renders the wordmark, São Miguel overline, and decorative logo (bar)", () => {
    const { container } = render(<BrandLockup size="bar" />);
    expect(screen.getByText("Daily Tour")).toBeInTheDocument();
    expect(screen.getByText("São Miguel")).toBeInTheDocument();
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/logo.svg");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.className).toMatch(/h-8 w-8/);
    // byte-identical to the original BrandAppBar left zone
    expect(screen.getByText("Daily Tour").className).toMatch(/text-lg/);
  });

  // The step-up is now conditional on `lg`, because the 768-1023 masthead band
  // cannot afford the full lockup: the nav is the only shrinking column there
  // and pt-PT was 41px over before this (#417). Asserted as "compact by
  // default, stepped up at lg" rather than as a flat class string — a flat
  // assertion would pass again the moment someone drops the lg: prefixes and
  // hardcodes the big size back, which is exactly the regression to catch.
  it("is compact below lg and steps the logo and wordmark up at lg (masthead)", () => {
    const { container } = render(<BrandLockup size="masthead" />);
    const img = container.querySelector("img")?.className ?? "";
    const word = screen.getByText("Daily Tour").className;

    expect(img).toMatch(/(^|\s)h-8 w-8(\s|$)/);
    expect(img).toMatch(/lg:h-10 lg:w-10/);
    expect(word).toMatch(/(^|\s)text-lg(\s|$)/);
    expect(word).toMatch(/lg:text-2xl/);

    // and it must NOT carry the unconditional big size any more
    expect(img).not.toMatch(/(^|\s)h-10 w-10(\s|$)/);
    expect(word).not.toMatch(/(^|\s)text-2xl(\s|$)/);
  });
});
