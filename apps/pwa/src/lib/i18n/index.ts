import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "../../locales/en/common.json";
import enPublic from "../../locales/en/public.json";
import enHome from "../../locales/en/home.json";
import enPlace from "../../locales/en/place.json";
import enDiscover from "../../locales/en/discover.json";
import enAdmin from "../../locales/en/admin.json";

import ptCommon from "../../locales/pt-PT/common.json";
import ptPublic from "../../locales/pt-PT/public.json";
import ptHome from "../../locales/pt-PT/home.json";
import ptPlace from "../../locales/pt-PT/place.json";
import ptDiscover from "../../locales/pt-PT/discover.json";
import ptAdmin from "../../locales/pt-PT/admin.json";

// Lazy-loading via i18next-resources-to-backend deferred — bundle size of
// 12 small JSON files is negligible for v1.
const resources = {
  en: {
    common: enCommon,
    public: enPublic,
    home: enHome,
    place: enPlace,
    discover: enDiscover,
    admin: enAdmin,
  },
  "pt-PT": {
    common: ptCommon,
    public: ptPublic,
    home: ptHome,
    place: ptPlace,
    discover: ptDiscover,
    admin: ptAdmin,
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ["common", "public", "home", "place", "discover", "admin"],
    defaultNS: "common",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
