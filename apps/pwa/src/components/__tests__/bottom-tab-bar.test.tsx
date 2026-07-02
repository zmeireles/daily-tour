import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BottomTabBar, type BottomTabBarProps } from "@/components/bottom-tab-bar";
import i18n from "@/lib/i18n";

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

  // Regression guard (was: labels hardcoded English, leaked on every authed
  // mobile screen). Each non-en locale must render its translated tab labels
  // with no English leak.
  it.each([
    ["fr", "Explorer", "Enregistrés", "Hôte", "Profil"],
    ["es", "Explorar", "Guardados", "Anfitrión", "Perfil"],
  ])(
    "renders translated tab labels for %s with no English leak",
    async (lng, explore, saved, host, profile) => {
      await i18n.changeLanguage(lng);
      renderBar();
      for (const label of [explore, saved, host, profile]) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
      for (const en of ["Explore", "Saved", "Host", "Profile"]) {
        expect(screen.queryByText(en)).not.toBeInTheDocument();
      }
      await i18n.changeLanguage("en");
    },
  );
});
