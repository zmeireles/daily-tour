// Hardcoded sample fixture for the public landing (option 1 per T-1.5.0 design decision).
// UUIDs match the canonical seed in services/catalog-svc/seeds/places-sao-miguel.sql.
// Hero image is the shared dev-placeholder Unsplash URL from that seed.
// Trade-off: data drifts from seed if the seed changes; acceptable for v1.
// Convert to a public BFF endpoint in a future phase when needed elsewhere.

const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1559825481-12a05cc00344?w=1200&q=80";

export type SamplePlace = {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  heroImageUrl: string;
  wishes: string[];
  actions: { slug: string; icon: string }[];
};

export const SAMPLE_PLACES: SamplePlace[] = [
  {
    id: "c0000001-0000-4000-a000-000000000001",
    name: {
      en: "Sete Cidades (Vista do Rei + Lagoa Azul)",
      "pt-PT": "Sete Cidades (Vista do Rei + Lagoa Azul)",
    },
    description: {
      en: "Twin volcanic crater lakes — one blue, one green — viewed from the Vista do Rei lookout. The most iconic landscape on São Miguel.",
      "pt-PT":
        "Lagoas vulcânicas gémeas — uma azul, uma verde — vistas do miradouro Vista do Rei. A paisagem mais icónica de São Miguel.",
    },
    heroImageUrl: HERO_IMAGE_URL,
    wishes: ["scenic-views", "outdoor-walk"],
    actions: [{ slug: "see", icon: "eye" }],
  },
  {
    id: "c0000001-0000-4000-a000-000000000002",
    name: {
      en: "Lagoa do Fogo (Fire Lake)",
      "pt-PT": "Lagoa do Fogo (Miradouro + descida)",
    },
    description: {
      en: "A pristine volcanic crater lake at the heart of the island, accessible by trail. Remote and rarely crowded.",
      "pt-PT":
        "Uma lagoa vulcânica prístina no centro da ilha, acessível por trilho. Remota e raramente movimentada.",
    },
    heroImageUrl: HERO_IMAGE_URL,
    wishes: ["scenic-views", "outdoor-walk"],
    actions: [
      { slug: "see", icon: "eye" },
      { slug: "do", icon: "activity" },
    ],
  },
  {
    id: "c0000001-0000-4000-a000-000000000003",
    name: {
      en: "Furnas — Caldeiras Village Walk",
      "pt-PT": "Furnas — Caldeiras (passeio pela aldeia)",
    },
    description: {
      en: "Walk among boiling volcanic mud pools and fumaroles in the village of Furnas. Free to explore, atmospheric at any hour.",
      "pt-PT":
        "Passeie entre piscinas de lama vulcânica a ferver e fumarolas na aldeia das Furnas. Entrada livre, atmosférico a qualquer hora.",
    },
    heroImageUrl: HERO_IMAGE_URL,
    wishes: ["thermal-soak", "scenic-views"],
    actions: [
      { slug: "see", icon: "eye" },
      { slug: "do", icon: "activity" },
    ],
  },
  {
    id: "c0000001-0000-4000-a000-000000000004",
    name: {
      en: "Terra Nostra Park + Thermal Pool",
      "pt-PT": "Parque Terra Nostra + piscina termal",
    },
    description: {
      en: "A 19th-century botanical garden in Furnas with a large iron-rich thermal pool. Iconic, family-friendly, and unmissable.",
      "pt-PT":
        "Jardim botânico do século XIX em Furnas com uma grande piscina termal rica em ferro. Icónico, para a família e imperdível.",
    },
    heroImageUrl: HERO_IMAGE_URL,
    wishes: ["thermal-soak"],
    actions: [
      { slug: "do", icon: "activity" },
      { slug: "see", icon: "eye" },
    ],
  },
];
