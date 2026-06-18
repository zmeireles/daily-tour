import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Utensils } from "lucide-react";
import { ContextRail, RailSection, RailNavItem } from "@/components/context-rail";

function withRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ContextRail", () => {
  it("renders a titled section with its children", () => {
    render(
      <RailSection title="Categorias">
        <span>child</span>
      </RailSection>,
    );
    expect(screen.getByText("Categorias")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("RailNavItem renders a ≥44px link to its target with the verb label", () => {
    withRouter(<RailNavItem icon={Utensils} label="Comer" to="/a/eat" />);
    const link = screen.getByRole("link", { name: "Comer" });
    expect(link.getAttribute("href")).toBe("/a/eat");
    expect(link.className).toMatch(/min-h-\[44px\]/);
  });

  it("RailNavItem marks the active row with aria-current", () => {
    withRouter(<RailNavItem label="Ver" to="/a/see" active />);
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("aria-current", "page");
  });

  it("RailNavItem falls back to a button when given onClick instead of to", () => {
    const onClick = vi.fn();
    render(
      <ContextRail>
        <RailNavItem label="Eat" onClick={onClick} />
      </ContextRail>,
    );
    expect(screen.getByRole("button", { name: "Eat" })).toBeInTheDocument();
  });
});
