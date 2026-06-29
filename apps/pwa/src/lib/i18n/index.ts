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
import esLegal from "../../locales/es/legal.json";

// Lazy-loading via i18next-resources-to-backend deferred — bundle size of
// these small JSON files is negligible for v1. fr/es ship the six guest-facing
// namespaces; admin (owner-only backoffice) stays en/pt-PT and falls back to en
// via fallbackLng for fr/es guests (no French/Spanish owner exists).
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
    interpolation: { escapeValue: false },
  });

export default i18n;
