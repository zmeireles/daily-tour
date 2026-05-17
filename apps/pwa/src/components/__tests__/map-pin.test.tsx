import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapPin } from "@/components/map-pin";

describe("MapPin", () => {
  it("renders SVG with default size 32", () => {
    render(<MapPin />);
    const svg = screen.getByRole("img", { name: /map marker/i });
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "32");
  });

  it("renders at 1.15× size when selected=true", () => {
    render(<MapPin selected />);
    const svg = screen.getByRole("img", { name: /map marker/i });
    const width = parseInt(svg.getAttribute("width") ?? "0", 10);
    expect(width).toBeGreaterThan(32);
    // 32 * 1.15 ≈ 37
    expect(width).toBe(Math.round(32 * 1.15));
  });

  it("applies custom className to the SVG", () => {
    render(<MapPin className="my-pin" />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveClass("my-pin");
  });
});
