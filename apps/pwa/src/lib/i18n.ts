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
      home: {
        greeting: "Welcome back",
        locale_hint: "Showing in {{locale}}",
        actions: {
          eat: "Eat",
          drink: "Drink",
          see: "See",
          do: "Do",
          buy: "Buy",
          move: "Move",
        },
        premium: {
          plan_my_day: "Plan my day",
          message_owner: "Message João",
          coming_soon: "Coming soon",
        },
        locale: {
          en: "English",
          "pt-PT": "Português",
        },
      },
      place_detail: {
        translation_pending: "EN",
        loading: "Loading place…",
        error: "Couldn't load this place. Try again.",
        not_found: "Place not found.",
        actions: {
          navigate: "Navigate",
          call: "Call",
          message: "Message",
        },
        wa_prefill: "Hi! I'm at {{placeName}}, can you recommend the next stop?",
      },
      discover: {
        title: "Discover",
        controls: {
          location: {
            me: "Near me",
            guesthouse: "From here",
          },
          range: "Within {{km}} km",
          sort: {
            label: "Sort",
            distance: "Distance",
            rating: "Rating",
            name: "Name",
          },
          group: {
            grouped: "Grouped",
            flat: "List",
          },
        },
        geolocation_denied: "Location access denied. Showing nearby from your guesthouse.",
        empty: "Nothing here for {{action}} within {{km}} km.",
        loading: "Loading…",
        error: "Couldn't load. Try again.",
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
      home: {
        greeting: "Bem-vindo de volta",
        locale_hint: "A mostrar em {{locale}}",
        actions: {
          eat: "Comer",
          drink: "Beber",
          see: "Ver",
          do: "Fazer",
          buy: "Comprar",
          move: "Deslocar-se",
        },
        premium: {
          plan_my_day: "Planear o meu dia",
          message_owner: "Falar com o João",
          coming_soon: "Em breve",
        },
        locale: {
          en: "English",
          "pt-PT": "Português",
        },
      },
      place_detail: {
        translation_pending: "EN",
        loading: "A carregar lugar…",
        error: "Não foi possível carregar. Tente novamente.",
        not_found: "Lugar não encontrado.",
        actions: {
          navigate: "Navegar",
          call: "Ligar",
          message: "Mensagem",
        },
        wa_prefill: "Olá! Estou em {{placeName}}, podes recomendar o próximo lugar?",
      },
      discover: {
        title: "Descobrir",
        controls: {
          location: {
            me: "Perto de mim",
            guesthouse: "Daqui",
          },
          range: "Até {{km}} km",
          sort: {
            label: "Ordenar",
            distance: "Distância",
            rating: "Avaliação",
            name: "Nome",
          },
          group: {
            grouped: "Agrupado",
            flat: "Lista",
          },
        },
        geolocation_denied: "Sem acesso à localização. A mostrar a partir da casa.",
        empty: "Nada aqui para {{action}} até {{km}} km.",
        loading: "A carregar…",
        error: "Não foi possível carregar. Tente novamente.",
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
