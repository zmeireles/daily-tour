import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "i18next";
import { LocaleSwitcher } from "@/features/backoffice/locale-switcher";

describe("Backoffice LocaleSwitcher (Plan-006 6.D follow-up / DAILY-TOUR-156)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders an English + Português toggle, English active by default", () => {
    render(<LocaleSwitcher />);

    const en = screen.getByRole("button", { name: "English" });
    const pt = screen.getByRole("button", { name: "Português" });

    expect(en).toHaveAttribute("aria-pressed", "true");
    expect(pt).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the active language to pt-PT on click", async () => {
    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Português" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Português" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(i18n.language).toBe("pt-PT");
  });

  // ── dt-tests #38: codes, not spelled-out names ─────────────────────────────
  // The full names measured 226px inside the rail's 199px footer row; the
  // overflow crushed the theme toggle to 16px, outside the sidebar. Codes fit.

  it("renders language CODES as the visible label, full names as accessible names", () => {
    render(<LocaleSwitcher />);

    // accessible name unchanged (aria-label) — screen readers and the old
    // tests above still see "English"/"Português"
    const en = screen.getByRole("button", { name: "English" });
    const pt = screen.getByRole("button", { name: "Português" });
    const es = screen.getByRole("button", { name: "Español" });

    // …but what is PAINTED is the code. This is the assertion that fails
    // against the pre-fix component, which painted the full name.
    expect(en.textContent).toBe("EN");
    expect(pt.textContent).toBe("PT");
    expect(es.textContent).toBe("ES");
  });

  it("keeps the full name reachable as a tooltip", () => {
    render(<LocaleSwitcher />);
    expect(screen.getByRole("button", { name: "Português" })).toHaveAttribute("title", "Português");
  });
});
