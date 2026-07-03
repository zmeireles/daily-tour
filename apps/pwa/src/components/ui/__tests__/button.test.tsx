import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button size variants", () => {
  it("touch renders with min-h-11", () => {
    const { getByRole } = render(<Button size="touch">Save</Button>);
    expect(getByRole("button").className).toMatch(/min-h-11/);
  });

  it("icon-touch renders with h-11 and w-11", () => {
    const { getByRole } = render(<Button size="icon-touch">X</Button>);
    const cls = getByRole("button").className;
    expect(cls).toMatch(/\bh-11\b/);
    expect(cls).toMatch(/\bw-11\b/);
  });

  it("default size is unchanged (h-9)", () => {
    const { getByRole } = render(<Button>Click</Button>);
    expect(getByRole("button").className).toMatch(/\bh-9\b/);
  });

  it("icon size is unchanged (h-9 w-9)", () => {
    const { getByRole } = render(<Button size="icon">+</Button>);
    const cls = getByRole("button").className;
    expect(cls).toMatch(/\bh-9\b/);
    expect(cls).toMatch(/\bw-9\b/);
  });
});
