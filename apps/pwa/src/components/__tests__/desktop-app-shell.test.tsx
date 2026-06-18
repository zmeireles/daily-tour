import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DesktopAppShell } from "@/components/desktop-app-shell";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

function renderShell(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DesktopAppShell", () => {
  it("mounts the masthead nav and the children in a contained frame by default", () => {
    const { container } = renderShell(
      <DesktopAppShell>
        <div>page-body</div>
      </DesktopAppShell>,
    );
    expect(container.querySelector("nav[aria-label='Primary']")).not.toBeNull();
    expect(screen.getByText("page-body")).toBeInTheDocument();
    // contained: a centered max-w container, no rail <aside>
    expect(container.querySelector(".max-w-\\[1200px\\]")).not.toBeNull();
    expect(container.querySelector("aside")).toBeNull();
  });

  it("renders a left rail + edge-to-edge content in the rail frame", () => {
    const { container } = renderShell(
      <DesktopAppShell frame="rail" rail={<div>rail-content</div>}>
        <div>map-content</div>
      </DesktopAppShell>,
    );
    expect(screen.getByText("rail-content")).toBeInTheDocument();
    expect(screen.getByText("map-content")).toBeInTheDocument();
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.className).toMatch(/overflow-y-auto/);
  });

  it("renders an optional sub-header strip", () => {
    renderShell(
      <DesktopAppShell subHeader={<div>sub-header</div>}>
        <div>body</div>
      </DesktopAppShell>,
    );
    expect(screen.getByText("sub-header")).toBeInTheDocument();
  });
});
