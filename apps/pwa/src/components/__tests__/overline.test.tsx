import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Overline } from "@/components/overline";

describe("Overline", () => {
  it("renders its children inside a span", () => {
    render(<Overline>Natural Landmark</Overline>);
    const el = screen.getByText("Natural Landmark");
    expect(el.tagName).toBe("SPAN");
  });

  it("applies the editorial base classes", () => {
    render(<Overline>label</Overline>);
    const el = screen.getByText("label");
    expect(el.className).toMatch(/uppercase/);
    expect(el.className).toMatch(/tracking-\[0\.05em\]/);
    expect(el.className).toMatch(/text-on-surface-variant/);
  });

  it("defaults to md (text-sm)", () => {
    render(<Overline>md</Overline>);
    expect(screen.getByText("md").className).toMatch(/text-sm/);
  });

  it("uses text-xs when size is sm", () => {
    render(<Overline size="sm">sm</Overline>);
    expect(screen.getByText("sm").className).toMatch(/text-xs/);
  });

  it("allows colour override via className", () => {
    render(<Overline className="text-tertiary">override</Overline>);
    const el = screen.getByText("override");
    expect(el.className).toMatch(/text-tertiary/);
    // twMerge drops the conflicting default colour.
    expect(el.className).not.toMatch(/text-on-surface-variant/);
  });
});
