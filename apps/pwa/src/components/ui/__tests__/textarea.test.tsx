import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea (smoke)", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Descrição" />);
    expect(screen.getByPlaceholderText("Descrição")).toBeInTheDocument();
  });

  it("applies data-slot attribute", () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector("[data-slot='textarea']")).toBeInTheDocument();
  });

  it("has defined border class", () => {
    const { container } = render(<Textarea />);
    const el = container.querySelector("[data-slot='textarea']");
    expect(el?.className).toMatch(/border-input/);
  });

  it("renders with aria-invalid when set", () => {
    render(<Textarea aria-invalid="true" data-testid="bio" />);
    expect(screen.getByTestId("bio")).toHaveAttribute("aria-invalid", "true");
  });
});
