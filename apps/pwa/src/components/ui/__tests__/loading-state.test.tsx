import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingState } from "@/components/ui/loading-state";

describe("LoadingState (smoke)", () => {
  it("renders cards variant by default", () => {
    const { container } = render(<LoadingState />);
    const root = container.querySelector("[data-slot='loading-state']");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("data-variant", "cards");
  });

  it("renders table variant", () => {
    const { container } = render(<LoadingState variant="table" />);
    expect(container.querySelector("[data-variant='table']")).toBeInTheDocument();
  });

  it("renders tiles variant", () => {
    const { container } = render(<LoadingState variant="tiles" />);
    expect(container.querySelector("[data-variant='tiles']")).toBeInTheDocument();
  });

  it("renders thread variant", () => {
    const { container } = render(<LoadingState variant="thread" />);
    expect(container.querySelector("[data-variant='thread']")).toBeInTheDocument();
  });

  it("each variant renders skeleton elements", () => {
    const variants = ["cards", "table", "tiles", "thread"] as const;
    for (const variant of variants) {
      const { container } = render(<LoadingState variant={variant} />);
      const skeletons = container.querySelectorAll("[data-slot='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
    }
  });
});
