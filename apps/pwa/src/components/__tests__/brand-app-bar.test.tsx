import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandAppBar } from "@/components/brand-app-bar";

describe("BrandAppBar", () => {
  it("renders the wordmark and São Miguel overline", () => {
    render(<BrandAppBar />);
    expect(screen.getByText("Daily Tour")).toBeInTheDocument();
    expect(screen.getByText("São Miguel")).toBeInTheDocument();
  });

  it("renders the decorative brand mark with empty alt", () => {
    const { container } = render(<BrandAppBar />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/logo.svg");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("is a sticky header with the surface backdrop", () => {
    const { container } = render(<BrandAppBar />);
    const header = container.querySelector("header");
    expect(header?.className).toMatch(/sticky/);
    expect(header?.className).toMatch(/backdrop-blur/);
  });

  it("renders the right slot content", () => {
    render(<BrandAppBar right={<button>menu</button>} />);
    expect(screen.getByRole("button", { name: "menu" })).toBeInTheDocument();
  });
});
