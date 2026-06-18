import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DesktopSectionNav } from "@/features/home/desktop-section-nav";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

describe("DesktopSectionNav", () => {
  it("renders the 6 verbs as ≥44px section-opener links to /a/:slug", () => {
    const { container } = render(
      <MemoryRouter>
        <DesktopSectionNav />
      </MemoryRouter>,
    );
    const links = [...container.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/a/eat",
      "/a/drink",
      "/a/see",
      "/a/do",
      "/a/buy",
      "/a/move",
    ]);
    // Bounded card (icon + label same box) — not an aspect-square tile.
    links.forEach((a) => expect(a.className).toMatch(/min-h-\[110px\]/));
  });
});
