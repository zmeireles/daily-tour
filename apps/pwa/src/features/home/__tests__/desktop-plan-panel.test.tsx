import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DesktopPlanPanel } from "@/features/home/desktop-plan-panel";

describe("DesktopPlanPanel", () => {
  it("renders the title + supporting line and links the whole card", () => {
    render(
      <MemoryRouter>
        <DesktopPlanPanel title="Planear o meu dia" supportingLine="sub line" href="/tour/new" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Planear o meu dia/i });
    expect(link.getAttribute("href")).toBe("/tour/new");
    expect(screen.getByText("sub line")).toBeInTheDocument();
  });

  it("renders the avatar initial for the host panel", () => {
    render(
      <MemoryRouter>
        <DesktopPlanPanel
          title="Falar com o Miguel"
          supportingLine="s"
          href="/chat"
          variant="tonal"
          avatar="M"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Falar com o Miguel/i }).getAttribute("href")).toBe(
      "/chat",
    );
  });
});
