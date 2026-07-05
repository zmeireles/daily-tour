import { describe, it, expect, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "@/lib/i18n";
import { ErrorState } from "@/components/ui/error-state";

// Regression guard for the `es` admin locale. Before this was registered in
// lib/i18n, selecting "Español" rendered the whole admin console in English
// (fallbackLng: "en") and every es/admin.json string was dead. These tests
// assert real Spanish resolution — distinct-from-English values prove it is not
// the fallback.
describe("admin locale (es)", () => {
  afterAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves admin-namespace strings in Spanish, not the en fallback", async () => {
    await i18n.changeLanguage("es");

    expect(i18n.t("shell.nav.today", { ns: "admin" })).toBe("Hoy");
    expect(i18n.t("reservations.title", { ns: "admin" })).toBe("Reservas");
    expect(i18n.t("empty_states.places.cta", { ns: "admin" })).toBe("Añada su primer lugar");
    expect(i18n.t("error_state.title", { ns: "admin" })).toBe("No se pudo cargar");

    // Guard against silently falling back to the English admin strings.
    expect(i18n.t("shell.nav.today", { ns: "admin" })).not.toBe("Today");
    expect(i18n.t("error_state.title", { ns: "admin" })).not.toBe("Couldn't load");
  });

  it("renders an admin surface (ErrorState) in Spanish under es", async () => {
    await i18n.changeLanguage("es");

    render(<ErrorState />);

    expect(screen.getByText("No se pudo cargar")).toBeInTheDocument();
    expect(screen.getByText(/error inesperado/i)).toBeInTheDocument();
  });
});
