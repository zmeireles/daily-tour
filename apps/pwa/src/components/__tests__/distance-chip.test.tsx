import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DistanceChip } from "@/components/distance-chip";

describe("DistanceChip", () => {
  it("formats whole kilometres", () => {
    render(<DistanceChip km={9} />);
    expect(screen.getByText("9.0 km")).toBeInTheDocument();
  });

  it("formats sub-kilometre distances in metres", () => {
    render(<DistanceChip km={0.2} />);
    expect(screen.getByText("200 m")).toBeInTheDocument();
  });

  it("renders the hydrangea dot by default", () => {
    const { container } = render(<DistanceChip km={1.5} />);
    expect(container.querySelector(".bg-tertiary")).not.toBeNull();
  });

  it("omits the dot when withDot is false", () => {
    const { container } = render(<DistanceChip km={1.5} withDot={false} />);
    expect(container.querySelector(".bg-tertiary")).toBeNull();
  });

  it("applies the hydrangea pill classes", () => {
    render(<DistanceChip km={3.2} />);
    const pill = screen.getByText("3.2 km");
    expect(pill.className).toMatch(/bg-tertiary-container/);
    expect(pill.className).toMatch(/text-on-tertiary-container/);
    expect(pill.className).toMatch(/rounded-full/);
  });

  it("merges a caller className", () => {
    render(<DistanceChip km={1} className="ml-2" />);
    expect(screen.getByText("1.0 km").className).toMatch(/ml-2/);
  });
});
