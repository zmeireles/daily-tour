import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DesktopTopNav } from "@/components/desktop-top-nav";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DesktopTopNav />
    </MemoryRouter>,
  );
}

describe("DesktopTopNav", () => {
  it("renders the 3 primary destinations with code-verified targets (Descobrir → /a/see)", () => {
    const { container } = renderNav("/");
    const hrefs = [...container.querySelectorAll("nav[aria-label='Primary'] a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(["/a/see", "/tour/new", "/chat"]);
  });

  it("links the brand lockup to Início (/)", () => {
    renderNav("/");
    expect(screen.getByRole("link", { name: /Daily Tour/i }).getAttribute("href")).toBe("/");
  });

  it("keeps Descobrir active on place-detail routes (/p/*), not just /a/*", () => {
    const { container } = renderNav("/p/abc-123");
    const descobrir = container.querySelector("nav[aria-label='Primary'] a[href='/a/see']");
    expect(descobrir?.getAttribute("aria-current")).toBe("page");
    const myDay = container.querySelector("nav[aria-label='Primary'] a[href='/tour/new']");
    expect(myDay?.getAttribute("aria-current")).toBeNull();
  });

  it("lights O meu dia on /tour/*", () => {
    const { container } = renderNav("/tour/new");
    const myDay = container.querySelector("nav[aria-label='Primary'] a[href='/tour/new']");
    expect(myDay?.getAttribute("aria-current")).toBe("page");
  });

  it("renders Saved/Profile as disabled 'coming soon' stubs (out of focus order)", () => {
    renderNav("/");
    const saved = screen.getByRole("button", { name: "nav.saved — nav.coming_soon" });
    const profile = screen.getByRole("button", { name: "nav.profile — nav.coming_soon" });
    expect(saved).toBeDisabled();
    expect(profile).toBeDisabled();
  });
});
