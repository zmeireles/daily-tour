import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("Select (smoke)", () => {
  it("renders the trigger", () => {
    render(
      <Select>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Escolha..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">Portugal</SelectItem>
          <SelectItem value="es">Espanha</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
  });

  it("shows placeholder text", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Escolha..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">Portugal</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByText("Escolha...")).toBeInTheDocument();
  });

  it("applies data-slot to trigger", () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(container.querySelector("[data-slot='select-trigger']")).toBeInTheDocument();
  });

  it("includes min-h-11 on trigger for 44px touch target", () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = container.querySelector("[data-slot='select-trigger']");
    expect(trigger?.className).toMatch(/min-h-11/);
  });
});
