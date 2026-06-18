import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));
// Empty picks → HomeBodyGrid renders only the plan panels (no PlaceCard), so the
// assembly test needs no DiscoverPlace fixture or motion mock.
vi.mock("@/features/home/use-hosts-picks", () => ({ useHostsPicks: () => ({ data: [] }) }));

import { HomeDesktop } from "@/features/home/home-desktop";

describe("HomeDesktop", () => {
  it("renders the masthead, the 6 verbs-as-nav, and the 2 plan panels in the desktop shell", () => {
    const { container } = render(
      <MemoryRouter>
        <HomeDesktop />
      </MemoryRouter>,
    );

    // masthead greeting stepped to the display-lg tier
    const masthead = container.querySelector("h1.text-display-lg");
    expect(masthead?.textContent).toBe("greeting");

    // 6 section-opener nav links (scoped to DesktopSectionNav, not the TopNav)
    const sectionLinks = [...container.querySelectorAll("nav[aria-label='nav.discover'] a")];
    expect(sectionLinks.map((a) => a.getAttribute("href"))).toEqual([
      "/a/eat",
      "/a/drink",
      "/a/see",
      "/a/do",
      "/a/buy",
      "/a/move",
    ]);

    // 2 plan panels as clear secondaries
    expect(screen.getByRole("link", { name: /premium\.plan_my_day/i }).getAttribute("href")).toBe(
      "/tour/new",
    );
    expect(screen.getByRole("link", { name: /premium\.message_host/i }).getAttribute("href")).toBe(
      "/chat",
    );
  });
});
