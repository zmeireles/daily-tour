import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      auth: {
        exchanging: "Logging you in…",
        token_expired: "Your link has expired. Ask your host for a new one.",
        exchange_failed: "Something went wrong. Try again.",
      },
      landing: {
        expired_message: "Your link expired. Please ask your host for a new one.",
      },
    },
  },
  "pt-PT": {
    translation: {
      auth: {
        exchanging: "A iniciar sessão…",
        token_expired: "O seu link expirou. Peça ao seu anfitrião um novo.",
        exchange_failed: "Algo correu mal. Tente novamente.",
      },
      landing: {
        expired_message: "O seu link expirou. Por favor peça ao seu anfitrião um novo.",
      },
    },
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
