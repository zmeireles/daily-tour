import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState (smoke)", () => {
  it("renders i18n default title and description", () => {
    render(<ErrorState />);
    expect(screen.getByText("Couldn't load")).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it("renders custom title and description", () => {
    render(
      <ErrorState
        title="Falhou a carregar reservas"
        description="Verifique a ligação à internet."
      />,
    );
    expect(screen.getByText("Falhou a carregar reservas")).toBeInTheDocument();
    expect(screen.getByText("Verifique a ligação à internet.")).toBeInTheDocument();
  });

  it("does not render retry button when onRetry is absent", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("fires onRetry callback when button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("applies data-slot attribute", () => {
    const { container } = render(<ErrorState />);
    expect(container.querySelector("[data-slot='error-state']")).toBeInTheDocument();
  });
});
