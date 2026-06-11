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
});
