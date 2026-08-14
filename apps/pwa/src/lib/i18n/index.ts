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
    supportedLngs: ["en", "pt-PT", "fr", "es"],
    // `htmlTag` is deliberately absent. It is in the detector's DEFAULT order,
    // and it defeated `supportedLngs` entirely for every non-exact tag.
    //
    // The detector does not stop at the first hit — it CONCATENATES every
    // detector's result. With `index.html` hardcoding `<html lang="en">`, a
    // browser sending `pt` produced the code list ['pt', 'en']. i18next then
    // scans that whole list for an EXACT match before it ever tries prefix
    // matching, so 'en' won on the exact pass and 'pt' never reached the
    // pt -> pt-PT step. Measured live on qual: pt, pt-BR, es-MX and fr-CA all
    // rendered English; only an exact 'pt-PT' worked.
    //
    // Our own static markup was never a statement about the user's
    // preference, so it does not belong among the signals. The lang attribute
    // is an OUTPUT of negotiation (kept in sync below), never an input.
    detection: {
      order: ["querystring", "cookie", "localStorage", "sessionStorage", "navigator"],
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
