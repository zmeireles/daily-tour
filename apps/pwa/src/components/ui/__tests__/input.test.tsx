import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input (smoke)", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("applies data-slot attribute", () => {
    const { container } = render(<Input />);
    expect(container.querySelector("[data-slot='input']")).toBeInTheDocument();
  });

  it("includes min-h-11 for 44px mobile touch target", () => {
    const { container } = render(<Input />);
    const input = container.querySelector("[data-slot='input']");
    expect(input?.className).toMatch(/min-h-11/);
  });

  it("renders with aria-invalid when set", () => {
    render(<Input aria-invalid="true" data-testid="field" />);
    const input = screen.getByTestId("field");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("forwards type prop", () => {
    render(<Input type="email" data-testid="email-field" />);
    expect(screen.getByTestId("email-field")).toHaveAttribute("type", "email");
  });
});
