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
      public_landing: {
        hero: {
          title: "Daily Tour",
          tagline: "São Miguel · Açores · Where you stay, what you'll love",
        },
        owner_pitch: {
          line1: "Your host's curated picks for São Miguel.",
          line2: "Real places, honest recommendations, zero fuss.",
          line3: "Drop in as a guest. Walk out as a local.",
        },
        sample_places: {
          title: "A taste of São Miguel",
        },
        cta: {
          check_availability: "Check availability",
        },
        locale: {
          en: "English",
          "pt-PT": "Português",
        },
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
      public_landing: {
        hero: {
          title: "Daily Tour",
          tagline: "São Miguel · Açores · Onde fica, o que vai adorar",
        },
        owner_pitch: {
          line1: "As escolhas do seu anfitrião para São Miguel.",
          line2: "Lugares reais, recomendações honestas, sem complicações.",
          line3: "Entre como hóspede. Saia como local.",
        },
        sample_places: {
          title: "Uma amostra de São Miguel",
        },
        cta: {
          check_availability: "Consultar disponibilidade",
        },
        locale: {
          en: "English",
          "pt-PT": "Português",
        },
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
