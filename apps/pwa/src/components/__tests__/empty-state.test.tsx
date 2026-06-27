import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <MemoryRouter>
        <EmptyState icon="MapPin" title="No places yet" description="Add the spots you love." />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "No places yet" })).toBeInTheDocument();
    expect(screen.getByText("Add the spots you love.")).toBeInTheDocument();
  });

  it("renders a CTA link to the given href when both label and href are provided", () => {
    render(
      <MemoryRouter>
        <EmptyState
          icon="MapPin"
          title="No places yet"
          description="Add the spots you love."
          ctaLabel="Add your first place"
          ctaHref="/admin/places/new"
        />
      </MemoryRouter>,
    );

    const cta = screen.getByRole("link", { name: "Add your first place" });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/admin/places/new");
  });

  it("renders no CTA when href is missing", () => {
    render(
      <MemoryRouter>
        <EmptyState icon="Inbox" title="Nothing here" description="No items." />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("accepts a lucide element as the icon", () => {
    const { container } = render(
      <MemoryRouter>
        <EmptyState
          icon={<svg data-testid="custom-icon" />}
          title="Custom"
          description="With element icon."
        />
      </MemoryRouter>,
    );

    expect(container.querySelector("[data-testid='custom-icon']")).not.toBeNull();
  });
});
