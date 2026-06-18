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

  it("steps up the logo and wordmark at masthead size", () => {
    const { container } = render(<BrandLockup size="masthead" />);
    expect(container.querySelector("img")?.className).toMatch(/h-10 w-10/);
    expect(screen.getByText("Daily Tour").className).toMatch(/text-2xl/);
  });
});
