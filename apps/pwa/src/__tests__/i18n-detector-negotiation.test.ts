import { describe, it, expect, afterEach } from "vitest";
import { createInstance } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import appI18n from "@/lib/i18n";

// The browser-detection half of locale negotiation.
//
// ⚠️ Why this file exists next to i18n-locale-negotiation.test.ts, which looks
// like it already covers this. That suite calls `i18n.changeLanguage('pt')`
// with a single string, which produces the code list ['pt'] and negotiates
// correctly. Real browsers never take that path — the LanguageDetector builds
// the list, and it CONCATENATES every detector in `order` rather than stopping
// at the first hit. With `htmlTag` in the default order and index.html
// hardcoding `<html lang="en">`, a `pt` browser produced ['pt', 'en'];
// i18next scans the entire list for an exact match before trying any prefix
// match, so 'en' won and 'pt' never reached pt-PT.
//
// The result: #383 shipped "fixed" and green while pt, pt-BR, es-MX and fr-CA
// all still rendered English on qual. The old suite could not see it because
// it never exercised the detector. This one does.
const RESOURCES = {
  en: { common: { hi: "Hello" } },
  "pt-PT": { common: { hi: "Olá" } },
  fr: { common: { hi: "Bonjour" } },
  es: { common: { hi: "Hola" } },
};

// Read the SHIPPED config rather than restating it, so this cannot pass against
// a matrix that has drifted away from what the app actually initialises with.
const shippedDetection = appI18n.options.detection;
const shippedSupported = appI18n.options.supportedLngs;

async function negotiate(navigatorLanguages: string[], htmlLang: string) {
  Object.defineProperty(window.navigator, "languages", {
    value: navigatorLanguages,
    configurable: true,
  });
  Object.defineProperty(window.navigator, "language", {
    value: navigatorLanguages[0],
    configurable: true,
  });
  document.documentElement.lang = htmlLang;
  localStorage.clear();

  const instance = createInstance();
  await instance.use(LanguageDetector).init({
    resources: RESOURCES,
    ns: ["common"],
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: shippedSupported,
    detection: { ...shippedDetection, caches: [] },
  });
  return instance.resolvedLanguage;
}

describe("browser locale negotiation through the real LanguageDetector", () => {
  afterEach(() => {
    document.documentElement.lang = "en";
    localStorage.clear();
  });

  // Every one of these except pt-PT resolved to 'en' before the htmlTag
  // removal — verified live on qual, not only in this harness.
  it.each([
    ["pt-PT", "pt-PT"], // exact match — the only case that ever worked
    ["pt", "pt-PT"], // region-less
    ["pt-BR", "pt-PT"], // other-region Portuguese
    ["es-MX", "es"], // regional Spanish
    ["fr-CA", "fr"], // regional French
    ["en-US", "en"],
    ["de", "en"], // not shipped — English is the correct fallback
    ["zz", "en"], // nonsense tag must fall back, not throw
  ])("a browser reporting %s resolves to %s", async (tag, expected) => {
    // html lang is deliberately "en" here: that is what index.html ships, and
    // it is precisely the value that used to hijack the result.
    expect(await negotiate([tag], "en")).toBe(expected);
  });

  it("renders the negotiated language, not merely resolves to it", async () => {
    Object.defineProperty(window.navigator, "languages", { value: ["pt-BR"], configurable: true });
    Object.defineProperty(window.navigator, "language", { value: "pt-BR", configurable: true });
    document.documentElement.lang = "en";
    localStorage.clear();

    const instance = createInstance();
    await instance.use(LanguageDetector).init({
      resources: RESOURCES,
      ns: ["common"],
      defaultNS: "common",
      fallbackLng: "en",
      supportedLngs: shippedSupported,
      detection: { ...shippedDetection, caches: [] },
    });

    // A resolvedLanguage assertion alone passes even when no bundle is loaded.
    expect(instance.t("hi")).toBe("Olá");
  });

  // ⚠️ THE VECTORS THAT MATTER. Everything above feeds a single-entry list —
  // a shape no real browser produces. Chrome appends `en-US,en` to almost
  // every list, and does so even when told only `pt-BR,pt`. Because i18next
  // scans the WHOLE list for an exact `supportedLngs` member before trying any
  // prefix match, that appended `en` won and the regional tag never resolved.
  //
  // Removing `htmlTag` alone did NOT fix these: measured in real Chrome
  // against a built bundle, pt-BR, pt, es-MX and fr-CA all still rendered
  // English. The single-entry suite passed the whole time. If you are adding
  // a case here, add it in this shape, not the one above.
  it.each([
    [["pt-PT", "pt", "en-US", "en"], "pt-PT"],
    [["pt-BR", "pt", "en-US", "en"], "pt-PT"],
    [["pt", "en-US", "en"], "pt-PT"],
    // Chrome drops the bare base from the list when it has the regional form.
    [["es-MX", "en-US", "en"], "es"],
    [["fr-CA", "en-US", "en"], "fr"],
    [["en-US", "en"], "en"],
    [["de-DE", "de", "en-US", "en"], "en"],
    // Preference ORDER must survive normalization: this guest reads French
    // before English, and we ship French.
    [["de", "fr", "en"], "fr"],
  ])("a real browser list %j resolves to %s", async (languages, expected) => {
    expect(await negotiate(languages, "en")).toBe(expected);
  });

  it("ships a detector order that excludes htmlTag", () => {
    // The direct guard on the defect. `htmlTag` reads our own static markup,
    // which is never a statement about the user's preference — and because the
    // detector concatenates, including it poisons the whole list.
    expect(shippedDetection?.order).toBeDefined();
    expect(shippedDetection?.order).not.toContain("htmlTag");
  });
});

describe("<html lang> follows the rendered language", () => {
  const original = appI18n.language;
  afterEach(async () => {
    await appI18n.changeLanguage(original);
  });

  // It shipped hardcoded as "en" for every locale, so assistive tech applied
  // English pronunciation to Portuguese, French and Spanish pages.
  it.each([
    ["pt-PT", "pt-PT"],
    ["fr", "fr"],
    ["es", "es"],
    ["en", "en"],
  ])("changing to %s sets document lang to %s", async (tag, expected) => {
    await appI18n.changeLanguage(tag);
    expect(document.documentElement.lang).toBe(expected);
  });
});
