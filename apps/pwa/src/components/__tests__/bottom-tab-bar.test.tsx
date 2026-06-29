import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BottomTabBar, type BottomTabBarProps } from "@/components/bottom-tab-bar";

function renderBar(props: BottomTabBarProps = {}) {
  return render(
    <MemoryRouter>
      <BottomTabBar {...props} />
    </MemoryRouter>,
  );
}

describe("BottomTabBar", () => {
  it("renders all four tab labels", () => {
    renderBar();
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders Explore as a link to /", () => {
    renderBar();
    const explore = screen.getByRole("link", { name: /explore/i });
    expect(explore.getAttribute("href")).toBe("/");
  });

  it("marks the active tab with aria-current", () => {
    renderBar({ active: "explore" });
    expect(screen.getByRole("link", { name: /explore/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders the three non-Explore tabs as disabled stubs with coming-soon labels", () => {
    renderBar();
    for (const label of ["Saved", "Host", "Profile"]) {
      const btn = screen.getByRole("button", { name: `${label} — Coming soon` });
      expect(btn).toBeDisabled();
    }
  });

  it("applies the active highlight only to the active tab icon", () => {
    const { container } = renderBar({ active: "explore" });
    // Exactly one icon wrapper carries the bg-primary/10 highlight pill.
    const highlighted = container.querySelectorAll(".bg-primary\\/10");
    expect(highlighted.length).toBe(1);
  });
});
