import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "i18next";
import { LocaleSwitcher } from "@/components/locale-switcher";

// #382 — the guest switcher renders four translated language words, which
// overflowed a 390px phone and clipped "Español" off-screen. The fix narrows
// the *visible* label to an ISO code below `sm` while keeping the full name in
// the accessible name.
//
// ⚠️ What these tests can and cannot prove. jsdom does no layout and loads no
// CSS, so `sm:hidden` / `sr-only` are inert here and BOTH spans render. That
// means nothing below measures the overflow — the 390px measurement is a
// real-browser job. What these guard is the part a plausible "just use
// aria-label" fix silently breaks: the accessible name.
describe("Guest LocaleSwitcher (#382)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each([
    ["en", "EN", "English"],
    ["pt-PT", "PT", "Português"],
    ["fr", "FR", "Français"],
    ["es", "ES", "Español"],
  ])("%s keeps the full language name in its accessible name", (_tag, code, name) => {
    render(<LocaleSwitcher />);

    // Regex, not an exact string: with CSS inert both spans contribute, so the
    // name is "PT Português". In a real browser one span is display:none and
    // it collapses to one or the other. Asserting containment is the claim
    // that holds at every width — and it is the claim that matters, because a
    // voice-control user says the visible text and a screen-reader user hears
    // the full name.
    const button = screen.getByRole("button", { name: new RegExp(name) });

    expect(button).toBeInTheDocument();
    expect(button.textContent).toContain(code);
    expect(button.textContent).toContain(name);
  });

  it("marks exactly one locale active, and it is the current language", () => {
    render(<LocaleSwitcher />);

    const pressed = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");

    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain("English");
  });

  it("switches language on click and moves the active state with it", async () => {
    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /Español/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Español/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(i18n.language).toBe("es");
    expect(screen.getByRole("button", { name: /English/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  // A regional tag must still light up the button it actually resolved to.
  // `supportedLngs` normalizes i18n.language itself (es-MX -> es), which is
  // what makes the `i18n.language === locale` comparison in the component
  // correct; measured, because reading i18next's docs suggested otherwise.
  it("highlights the resolved locale for a regional tag (es-MX)", async () => {
    await i18n.changeLanguage("es-MX");
    render(<LocaleSwitcher />);

    expect(screen.getByRole("button", { name: /Español/ })).toHaveAttribute("aria-pressed", "true");
  });
});
