import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocationToggle } from "@/components/location-toggle";

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

describe("LocationToggle", () => {
  it("renders both toggle options", () => {
    render(<LocationToggle value="me" onChange={vi.fn()} />);

    // Radix ToggleGroup type="single" renders items as role="radio"
    expect(screen.getByRole("radio", { name: /use my location/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /use guesthouse location/i })).toBeInTheDocument();
  });

  it("calls onChange when toggling to guesthouse", () => {
    const onChange = vi.fn();
    render(<LocationToggle value="me" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /use guesthouse location/i }));
    expect(onChange).toHaveBeenCalledWith("guesthouse");
  });

  it("disables the Me button when geolocationDenied is true", () => {
    render(<LocationToggle value="guesthouse" onChange={vi.fn()} geolocationDenied />);

    const meButton = screen.getByRole("radio", { name: /use my location/i });
    // Radix sets aria-disabled (not HTML disabled) on ToggleGroupItem when disabled prop is passed
    expect(meButton).toHaveAttribute("aria-disabled", "true");
  });
});
