import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/features/backoffice/theme-toggle";
import {
  nextPreference,
  resolveTheme,
  setThemePreference,
  THEME_STORAGE_KEY,
} from "@/lib/theme/use-theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  // Deterministic OS preference (light) for `system` resolution.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("theme preference (use-theme)", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextPreference("system")).toBe("light");
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("system");
  });

  it("resolves explicit light/dark, and system via matchMedia", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("system")).toBe("light"); // matchMedia matches:false
  });

  it("persists the preference and applies it via data-theme", () => {
    setThemePreference("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("ThemeToggle", () => {
  it("cycles the persisted preference on click and updates data-theme", () => {
    setThemePreference("system");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    fireEvent.click(btn); // system → light
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    fireEvent.click(btn); // light → dark
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    fireEvent.click(btn); // dark → system (→ light via matchMedia)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("keeps cycling when localStorage.setItem throws (in-memory source of truth)", () => {
    setThemePreference("system"); // known start, persisted
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    fireEvent.click(btn); // system → light despite storage throwing
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    // A store that re-read (throwing/empty) storage would be stuck on light here;
    // the in-memory preference advances instead.
    fireEvent.click(btn); // light → dark
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    setItem.mockRestore();
  });
});
