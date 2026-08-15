import { describe, it, expect } from "vitest";
import { formattingLocale } from "@/lib/i18n/formatting-locale";

// #391 — `supportedLngs` normalizes i18n.language, so an en-GB browser reports
// `en`, and every Intl call fed i18n.language started giving British and
// Australian owners US date and time formats.
describe("formattingLocale", () => {
  it.each([
    // ui,      browser prefers,        expected,  why
    ["en", ["en-GB"], "en-GB", "the #391 regression itself"],
    ["en", ["en-AU"], "en-AU", "same, Australian"],
    ["en", ["en-US"], "en-US", "identical output to plain en"],
    ["es", ["es-MX"], "es-MX", "Mexican conventions under a Spanish UI"],
    ["fr", ["fr-CA"], "fr-CA", "Canadian conventions under a French UI"],
    ["en", ["de", "en-GB"], "en-GB", "region taken from further down the list"],
    ["es", ["en-GB"], "es", "different language — nothing to borrow"],
    ["en", [], "en", "no preferences at all"],
    ["en", ["en"], "en", "browser offers no region either"],
  ])("ui=%s browser=%j -> %s (%s)", (ui, preferred, expected) => {
    expect(formattingLocale(ui, preferred)).toBe(expected);
  });

  // The load-bearing negative. The obvious fix for #391 — hand Intl
  // navigator.language — reintroduces exactly this, and #388 records that a
  // Brazilian default was the more damaging case for this product's audience.
  it.each([
    ["pt-PT", ["pt-BR"]],
    ["pt-PT", ["pt-BR", "pt"]],
    ["pt-PT", ["en-GB"]],
  ])("keeps %s against a browser preferring %j", (ui, preferred) => {
    expect(formattingLocale(ui, preferred)).toBe("pt-PT");
  });

  it("falls back to en for an empty ui language rather than returning empty", () => {
    expect(formattingLocale("")).toBe("en");
  });

  it("is case-insensitive when matching the base language", () => {
    expect(formattingLocale("en", ["EN-GB"])).toBe("EN-GB");
  });
});

// Asserting the resolved tag alone would pass even if the tag meant nothing to
// Intl. These pin the actual rendered output — the thing the owner sees, and
// the exact strings #391 quotes.
describe("what Intl actually renders", () => {
  const d = new Date(2026, 11, 31, 14, 30);
  const fmt = (locale: string) =>
    new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
  const time = (locale: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);

  it("restores British date and 24h time for an en-GB owner", () => {
    const locale = formattingLocale("en", ["en-GB"]);
    expect(fmt(locale)).toBe("31 Dec 2026");
    expect(time(locale)).toBe("14:30");
  });

  it("the un-fixed path is what produced the US format", () => {
    // Control: this is what the four call sites did before, and it is why the
    // bug was visible. If this ever stops differing from the line above, the
    // test above has stopped proving anything.
    expect(fmt("en")).toBe("Dec 31, 2026");
    expect(fmt("en")).not.toBe(fmt(formattingLocale("en", ["en-GB"])));
  });

  it("keeps European Portuguese formatting for a pt-BR browser", () => {
    const locale = formattingLocale("pt-PT", ["pt-BR"]);
    expect(fmt(locale)).toBe("31/12/2026");
    // And is genuinely different from the Brazilian rendering it avoids.
    expect(fmt(locale)).not.toBe(fmt("pt-BR"));
  });
});

// `navigator.languages` is not guaranteed well-formed — Firefox exposes
// `intl.accept_languages` as free text. Every Intl constructor THROWS on a
// malformed tag, so an unvalidated one crashes the component at render, which
// is far worse than a wrong date format.
describe("a malformed browser tag cannot reach Intl", () => {
  it.each([["en-"], ["en-a"], ["en--GB"], ["en-verylongsubtagxx"]])(
    "falls back to the UI language for %s",
    (bad) => {
      expect(formattingLocale("en", [bad])).toBe("en");
    },
  );

  it("still borrows a well-formed tag that appears after a malformed one", () => {
    expect(formattingLocale("en", ["en-", "en-GB"])).toBe("en-GB");
  });

  it("control: the malformed tags really do throw, so the guard is not decorative", () => {
    for (const bad of ["en-", "en-a", "en--GB", "en-verylongsubtagxx"]) {
      expect(() => new Intl.DateTimeFormat(bad)).toThrow(RangeError);
    }
  });

  it("whatever it returns is always usable by Intl", () => {
    for (const bad of ["en-", "en-a", "en--GB", "zz", "", "-", "es-419"]) {
      const locale = formattingLocale("en", [bad]);
      expect(() => new Intl.DateTimeFormat(locale).format(new Date())).not.toThrow();
      expect(() => new Intl.RelativeTimeFormat(locale).format(-1, "day")).not.toThrow();
    }
  });
});
