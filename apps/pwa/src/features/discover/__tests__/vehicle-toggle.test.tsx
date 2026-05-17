import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleToggle } from "../vehicle-toggle";

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      className,
      "aria-hidden": ariaHidden,
    }: React.HTMLAttributes<HTMLDivElement> & { "aria-hidden"?: boolean }) => (
      <div className={className} aria-hidden={ariaHidden}>
        {children}
      </div>
    ),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "vehicle.car": "Car",
        "vehicle.foot": "On foot",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("VehicleToggle", () => {
  it("renders both car and foot options", () => {
    render(<VehicleToggle value="car" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "Car" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "On foot" })).toBeInTheDocument();
  });

  it("calls onChange with 'foot' when foot option is clicked", () => {
    const onChange = vi.fn();
    render(<VehicleToggle value="car" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "On foot" }));
    expect(onChange).toHaveBeenCalledWith("foot");
  });

  it("marks car as checked when value is 'car'", () => {
    render(<VehicleToggle value="car" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "Car" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "On foot" })).toHaveAttribute("aria-checked", "false");
  });
});
