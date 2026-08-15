import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "../../locales/en/common.json";
import enPublic from "../../locales/en/public.json";
import enHome from "../../locales/en/home.json";
import enPlace from "../../locales/en/place.json";
import enDiscover from "../../locales/en/discover.json";
import enAdmin from "../../locales/en/admin.json";
import enLegal from "../../locales/en/legal.json";

import ptCommon from "../../locales/pt-PT/common.json";
import ptPublic from "../../locales/pt-PT/public.json";
import ptHome from "../../locales/pt-PT/home.json";
import ptPlace from "../../locales/pt-PT/place.json";
import ptDiscover from "../../locales/pt-PT/discover.json";
import ptAdmin from "../../locales/pt-PT/admin.json";
import ptLegal from "../../locales/pt-PT/legal.json";

import frCommon from "../../locales/fr/common.json";
import frPublic from "../../locales/fr/public.json";
import frHome from "../../locales/fr/home.json";
import frPlace from "../../locales/fr/place.json";
import frDiscover from "../../locales/fr/discover.json";
import frLegal from "../../locales/fr/legal.json";

import esCommon from "../../locales/es/common.json";
import esPublic from "../../locales/es/public.json";
import esHome from "../../locales/es/home.json";
import esPlace from "../../locales/es/place.json";
import esDiscover from "../../locales/es/discover.json";
import esAdmin from "../../locales/es/admin.json";
import esLegal from "../../locales/es/legal.json";

// Lazy-loading via i18next-resources-to-backend deferred — bundle size of
// these small JSON files is negligible for v1. fr ships the six guest-facing
// namespaces; the admin (owner-only backoffice) namespace ships in en, pt-PT
// and es. fr has no admin namespace and falls back to en (no French owner).
const resources = {
  en: {
    common: enCommon,
    public: enPublic,
    home: enHome,
    place: enPlace,
    discover: enDiscover,
    admin: enAdmin,
    legal: enLegal,
  },
  "pt-PT": {
    common: ptCommon,
    public: ptPublic,
    home: ptHome,
    place: ptPlace,
    discover: ptDiscover,
    admin: ptAdmin,
    legal: ptLegal,
  },
  fr: {
    common: frCommon,
    public: frPublic,
    home: frHome,
    place: frPlace,
    discover: frDiscover,
    legal: frLegal,
  },
  es: {
    common: esCommon,
    public: esPublic,
    home: esHome,
    place: esPlace,
    discover: esDiscover,
    admin: esAdmin,
    legal: esLegal,
  },
};

// The four locales actually present in `resources` above — de/ exists on disk
// but is never imported, so a German browser correctly gets English. Named
// once because the detector's normalization below must agree with it exactly;
// two copies of this list drifting apart is the whole of #383.
//
// ⚠️ Do NOT reach for `nonExplicitSupportedLngs` to widen this. It resolves a
// tag to its BASE language (pt-PT -> pt), and since no `pt` bundle exists it
// sends **pt-PT itself** to English — breaking the primary guest locale.
// Measured against a real i18next instance; it looks and reads correct.
const SUPPORTED_LNGS = ["en", "pt-PT", "fr", "es"] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ["common", "public", "home", "place", "discover", "admin", "legal"],
    defaultNS: "common",
    fallbackLng: "en",
    // The four locales actually present in `resources` above — de/ exists on
    // disk but is never imported, so a German browser correctly gets English.
    //
    // This one line is what routes region-less and other-region Portuguese to
    // the bundle we ship: `pt` and `pt-BR` both resolve to **pt-PT**. Without
    // it they fell straight through to an all-English UI with the pt-PT bundle
    // sitting unused a few bytes away — silently, because it reads as a
    // language preference rather than a failure. A browser reporting
    // ["pt","pt-PT"] is entirely ordinary. (#383)
    //
    // ⚠️ Do NOT reach for `nonExplicitSupportedLngs` here. It resolves a tag to
    // its BASE language (pt-PT -> pt), and since no `pt` bundle exists it sends
    // **pt-PT itself** to English — breaking the primary guest locale. Measured
    // against a real i18next instance; it looks and reads correct.
    supportedLngs: SUPPORTED_LNGS,
    detection: {
      // `htmlTag` is deliberately absent from this order. It is in the
      // detector's DEFAULT order, and since the detector CONCATENATES every
      // detector's result rather than stopping at the first hit, our own
      // `<html lang="en">` was appended to the guest's real preferences.
      // Our static markup is not a statement about what the user wants.
      order: ["querystring", "cookie", "localStorage", "sessionStorage", "navigator"],

      // ⚠️ Removing `htmlTag` is necessary but NOT sufficient, and the gap is
      // invisible to any test that feeds a single-entry language list.
      //
      // i18next scans the WHOLE detected list for an EXACT `supportedLngs`
      // member before it tries prefix matching anywhere. Real browsers send
      // `["pt-BR","pt","en-US","en"]` — Chrome appends `en-US,en` to almost
      // every list, and does so even when told only `pt-BR,pt`. So `en` is an
      // exact member sitting in the list, it wins the exact pass, and the
      // regional tags never reach the `pt-BR -> pt-PT` step. Measured in real
      // Chrome against a built bundle: pt-BR, pt, es-MX and fr-CA all still
      // rendered English with `htmlTag` already gone.
      //
      // Normalizing each entry BEFORE that scan is what actually fixes it.
      // The guest's own ordering then decides, which is the point — a
      // `["de","fr","en"]` browser gets French, not English.
      convertDetectedLanguage: (lng: string) => {
        if ((SUPPORTED_LNGS as readonly string[]).includes(lng)) return lng;
        const base = lng.split("-")[0]?.toLowerCase() ?? "";
        if (!base) return lng;
        return (
          SUPPORTED_LNGS.find((s) => s === base || s.toLowerCase().startsWith(`${base}-`)) ?? lng
        );
      },
    },
    interpolation: { escapeValue: false },
  });

// Keep <html lang> matching what we actually render. It shipped permanently as
// "en", so assistive tech announced every Portuguese, French and Spanish page
// with English pronunciation rules. This is the attribute's correct direction
// of travel: written from the resolved language, never read back into it.
const syncDocumentLang = (lng?: string) => {
  const resolved = lng ?? i18n.resolvedLanguage ?? i18n.language;
  if (resolved) document.documentElement.lang = resolved;
};

i18n.on("languageChanged", syncDocumentLang);
syncDocumentLang();

export default i18n;
