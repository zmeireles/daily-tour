import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton (smoke)", () => {
  it("renders a div with data-slot", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector("[data-slot='skeleton']")).toBeInTheDocument();
  });

  it("has animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector("[data-slot='skeleton']");
    expect(el?.className).toMatch(/animate-pulse/);
  });

  it("has bg-muted class", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector("[data-slot='skeleton']");
    expect(el?.className).toMatch(/bg-muted/);
  });

  it("merges additional classNames", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.querySelector("[data-slot='skeleton']");
    expect(el?.className).toMatch(/h-4/);
    expect(el?.className).toMatch(/w-32/);
  });
});
