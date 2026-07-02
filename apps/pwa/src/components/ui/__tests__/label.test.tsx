import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("Label (smoke)", () => {
  it("renders its text", () => {
    render(<Label>Nome do lugar</Label>);
    expect(screen.getByText("Nome do lugar")).toBeInTheDocument();
  });

  it("applies data-slot attribute", () => {
    const { container } = render(<Label>Nome</Label>);
    expect(container.querySelector("[data-slot='label']")).toBeInTheDocument();
  });

  it("associates with an input via htmlFor", () => {
    render(
      <>
        <Label htmlFor="name-field">Name</Label>
        <input id="name-field" />
      </>,
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
