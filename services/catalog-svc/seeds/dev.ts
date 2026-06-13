/* eslint-disable no-console, no-restricted-syntax */
// Action/wish taxonomy from docs/exploration/05-tourism-domain.md §3.
// Fixed UUIDs ensure idempotent re-runs — onConflictDoNothing() relies on PK collision.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { actionTable, guesthouseTable, wishTable } from "../src/db/schema.js";

const DEV_DB_URL =
  process.env.CATALOG_SVC_DATABASE_URL ??
  "postgres://catalog_svc:change-me-please-catalog@localhost:27432/dailytour";

// ── Actions ──────────────────────────────────────────────────────────────────
// Pattern: a0000001-0000-4000-a000-00000000000N  (N = 1..6)
const ACTIONS = [
  {
    id: "a0000001-0000-4000-a000-000000000001",
    slug: "eat",
    i18n: { en: "Eat", "pt-PT": "Comer" },
    sortOrder: 1,
    icon: "utensils",
  },
  {
    id: "a0000001-0000-4000-a000-000000000002",
    slug: "drink",
    i18n: { en: "Drink", "pt-PT": "Beber" },
    sortOrder: 2,
    icon: "wine",
  },
  {
    id: "a0000001-0000-4000-a000-000000000003",
    slug: "see",
    i18n: { en: "See", "pt-PT": "Ver" },
    sortOrder: 3,
    icon: "eye",
  },
  {
    id: "a0000001-0000-4000-a000-000000000004",
    slug: "do",
    i18n: { en: "Do", "pt-PT": "Fazer" },
    sortOrder: 4,
    icon: "activity",
  },
  {
    id: "a0000001-0000-4000-a000-000000000005",
    slug: "buy",
    i18n: { en: "Buy", "pt-PT": "Comprar" },
    sortOrder: 5,
    icon: "shopping-bag",
  },
  {
    id: "a0000001-0000-4000-a000-000000000006",
    slug: "move",
    i18n: { en: "Move", "pt-PT": "Deslocar" },
    sortOrder: 6,
    icon: "car",
  },
] as const;

// ── Wishes ───────────────────────────────────────────────────────────────────
// Pattern: b<actionN>000001-0000-4000-b000-00000000000<wishN>
// 6 wishes per action × 6 actions = 36 wishes total.
// Source: 05-tourism-domain.md §3.
const WISHES = [
  // Eat (action 1)
  {
    id: "b1000001-0000-4000-b000-000000000001",
    actionId: "a0000001-0000-4000-a000-000000000001",
    slug: "sea-view",
    i18n: { en: "Sea view", "pt-PT": "Vista para o mar" },
    sortOrder: 1,
  },
  {
    id: "b1000001-0000-4000-b000-000000000002",
    actionId: "a0000001-0000-4000-a000-000000000001",
    slug: "traditional",
    i18n: { en: "Traditional (cozido/bife/lapas)", "pt-PT": "Tradicional (cozido/bife/lapas)" },
    sortOrder: 2,
  },
  {
    id: "b1000001-0000-4000-b000-000000000003",
    actionId: "a0000001-0000-4000-a000-000000000001",
    slug: "vegetarian",
    i18n: { en: "Vegetarian", "pt-PT": "Vegetariano" },
    sortOrder: 3,
  },
  {
    id: "b1000001-0000-4000-b000-000000000004",
    actionId: "a0000001-0000-4000-a000-000000000001",
    slug: "romantic",
    i18n: { en: "Romantic", "pt-PT": "Romântico" },
    sortOrder: 4,
  },
  {
    id: "b1000001-0000-4000-b000-000000000005",
    actionId: "a0000001-0000-4000-a000-000000000001",
    slug: "family",
    i18n: { en: "Family-friendly", "pt-PT": "Família" },
    sortOrder: 5,
  },
  {
    id: "b1000001-0000-4000-b000-000000000006",
    actionId: "a0000001-0000-4000-a000-000000000001",
    slug: "quick-local",
    i18n: { en: "Quick & local", "pt-PT": "Rápido e local" },
    sortOrder: 6,
  },

  // Drink (action 2)
  {
    id: "b2000001-0000-4000-b000-000000000001",
    actionId: "a0000001-0000-4000-a000-000000000002",
    slug: "cafe",
    i18n: { en: "Café", "pt-PT": "Café" },
    sortOrder: 1,
  },
  {
    id: "b2000001-0000-4000-b000-000000000002",
    actionId: "a0000001-0000-4000-a000-000000000002",
    slug: "wine-local-liqueur",
    i18n: { en: "Wine / local liqueur", "pt-PT": "Vinho / licor local" },
    sortOrder: 2,
  },
  {
    id: "b2000001-0000-4000-b000-000000000003",
    actionId: "a0000001-0000-4000-a000-000000000002",
    slug: "cocktail-bar",
    i18n: { en: "Cocktail bar", "pt-PT": "Bar de cocktails" },
    sortOrder: 3,
  },
  {
    id: "b2000001-0000-4000-b000-000000000004",
    actionId: "a0000001-0000-4000-a000-000000000002",
    slug: "live-music",
    i18n: { en: "Live music", "pt-PT": "Música ao vivo" },
    sortOrder: 4,
  },
  {
    id: "b2000001-0000-4000-b000-000000000005",
    actionId: "a0000001-0000-4000-a000-000000000002",
    slug: "sea-view",
    i18n: { en: "Sea view", "pt-PT": "Vista para o mar" },
    sortOrder: 5,
  },
  {
    id: "b2000001-0000-4000-b000-000000000006",
    actionId: "a0000001-0000-4000-a000-000000000002",
    slug: "late",
    i18n: { en: "Late night", "pt-PT": "Noite" },
    sortOrder: 6,
  },

  // See (action 3)
  {
    id: "b3000001-0000-4000-b000-000000000001",
    actionId: "a0000001-0000-4000-a000-000000000003",
    slug: "viewpoint",
    i18n: { en: "Viewpoint", "pt-PT": "Miradouro" },
    sortOrder: 1,
  },
  {
    id: "b3000001-0000-4000-b000-000000000002",
    actionId: "a0000001-0000-4000-a000-000000000003",
    slug: "lake-crater",
    i18n: { en: "Lake / crater", "pt-PT": "Lagoa / cratera" },
    sortOrder: 2,
  },
  {
    id: "b3000001-0000-4000-b000-000000000003",
    actionId: "a0000001-0000-4000-a000-000000000003",
    slug: "volcanic-thermal",
    i18n: { en: "Volcanic / thermal", "pt-PT": "Vulcânico / termal" },
    sortOrder: 3,
  },
  {
    id: "b3000001-0000-4000-b000-000000000004",
    actionId: "a0000001-0000-4000-a000-000000000003",
    slug: "historic",
    i18n: { en: "Historic", "pt-PT": "Histórico" },
    sortOrder: 4,
  },
  {
    id: "b3000001-0000-4000-b000-000000000005",
    actionId: "a0000001-0000-4000-a000-000000000003",
    slug: "garden",
    i18n: { en: "Garden", "pt-PT": "Jardim" },
    sortOrder: 5,
  },
  {
    id: "b3000001-0000-4000-b000-000000000006",
    actionId: "a0000001-0000-4000-a000-000000000003",
    slug: "rainy-day-ok",
    i18n: { en: "Rainy-day OK", "pt-PT": "Bom para chuva" },
    sortOrder: 6,
  },

  // Do (action 4)
  {
    id: "b4000001-0000-4000-b000-000000000001",
    actionId: "a0000001-0000-4000-a000-000000000004",
    slug: "hike",
    i18n: { en: "Hike", "pt-PT": "Trilho" },
    sortOrder: 1,
  },
  {
    id: "b4000001-0000-4000-b000-000000000002",
    actionId: "a0000001-0000-4000-a000-000000000004",
    slug: "thermal-soak",
    i18n: { en: "Thermal soak", "pt-PT": "Termas" },
    sortOrder: 2,
  },
  {
    id: "b4000001-0000-4000-b000-000000000003",
    actionId: "a0000001-0000-4000-a000-000000000004",
    slug: "whale-dolphin",
    i18n: { en: "Whale & dolphin", "pt-PT": "Baleias e golfinhos" },
    sortOrder: 3,
  },
  {
    id: "b4000001-0000-4000-b000-000000000004",
    actionId: "a0000001-0000-4000-a000-000000000004",
    slug: "water-sports",
    i18n: { en: "Water sports", "pt-PT": "Desportos náuticos" },
    sortOrder: 4,
  },
  {
    id: "b4000001-0000-4000-b000-000000000005",
    actionId: "a0000001-0000-4000-a000-000000000004",
    slug: "scenic-drive",
    i18n: { en: "Scenic drive", "pt-PT": "Percurso panorâmico" },
    sortOrder: 5,
  },
  {
    id: "b4000001-0000-4000-b000-000000000006",
    actionId: "a0000001-0000-4000-a000-000000000004",
    slug: "with-kids",
    i18n: { en: "With kids", "pt-PT": "Com crianças" },
    sortOrder: 6,
  },

  // Buy (action 5)
  {
    id: "b5000001-0000-4000-b000-000000000001",
    actionId: "a0000001-0000-4000-a000-000000000005",
    slug: "tea-pineapple-liqueur",
    i18n: { en: "Tea / pineapple / liqueur", "pt-PT": "Chá / ananás / licor" },
    sortOrder: 1,
  },
  {
    id: "b5000001-0000-4000-b000-000000000002",
    actionId: "a0000001-0000-4000-a000-000000000005",
    slug: "cheese-canned-fish",
    i18n: { en: "Cheese / canned fish", "pt-PT": "Queijo / conservas" },
    sortOrder: 2,
  },
  {
    id: "b5000001-0000-4000-b000-000000000003",
    actionId: "a0000001-0000-4000-a000-000000000005",
    slug: "crafts-ceramics",
    i18n: { en: "Crafts / ceramics", "pt-PT": "Artesanato / cerâmica" },
    sortOrder: 3,
  },
  {
    id: "b5000001-0000-4000-b000-000000000004",
    actionId: "a0000001-0000-4000-a000-000000000005",
    slug: "bookstore",
    i18n: { en: "Bookstore", "pt-PT": "Livraria" },
    sortOrder: 4,
  },
  {
    id: "b5000001-0000-4000-b000-000000000005",
    actionId: "a0000001-0000-4000-a000-000000000005",
    slug: "supermarket",
    i18n: { en: "Supermarket", "pt-PT": "Supermercado" },
    sortOrder: 5,
  },
  {
    id: "b5000001-0000-4000-b000-000000000006",
    actionId: "a0000001-0000-4000-a000-000000000005",
    slug: "pharmacy",
    i18n: { en: "Pharmacy", "pt-PT": "Farmácia" },
    sortOrder: 6,
  },

  // Move (action 6)
  {
    id: "b6000001-0000-4000-b000-000000000001",
    actionId: "a0000001-0000-4000-a000-000000000006",
    slug: "car-rental",
    i18n: { en: "Car rental", "pt-PT": "Aluguer de carro" },
    sortOrder: 1,
  },
  {
    id: "b6000001-0000-4000-b000-000000000002",
    actionId: "a0000001-0000-4000-a000-000000000006",
    slug: "taxi-transfer",
    i18n: { en: "Taxi / transfer", "pt-PT": "Táxi / transfer" },
    sortOrder: 2,
  },
  {
    id: "b6000001-0000-4000-b000-000000000003",
    actionId: "a0000001-0000-4000-a000-000000000006",
    slug: "gas-station",
    i18n: { en: "Gas station", "pt-PT": "Posto de combustível" },
    sortOrder: 3,
  },
  {
    id: "b6000001-0000-4000-b000-000000000004",
    actionId: "a0000001-0000-4000-a000-000000000006",
    slug: "airport-shuttle",
    i18n: { en: "Airport shuttle", "pt-PT": "Shuttle aeroporto" },
    sortOrder: 4,
  },
  {
    id: "b6000001-0000-4000-b000-000000000005",
    actionId: "a0000001-0000-4000-a000-000000000006",
    slug: "scenic-route-stop",
    i18n: { en: "Scenic-route stop", "pt-PT": "Paragem panorâmica" },
    sortOrder: 5,
  },
  {
    id: "b6000001-0000-4000-b000-000000000006",
    actionId: "a0000001-0000-4000-a000-000000000006",
    slug: "ev-charger",
    i18n: { en: "EV charger", "pt-PT": "Carregador elétrico" },
    sortOrder: 6,
  },
] as const;

// ── Guesthouse fixture (#152) ──────────────────────────────────────────────
// One guesthouse so the owner backoffice — which lists ALL guesthouses for any
// staff user (single-owner v1; owner_id filter deferred) — has a row to render
// the per-place visibility toggle, and so the seeded reservation's gh resolves
// to a real guesthouse. UUIDs MUST match the token-svc reservation fixture
// (services/token-svc/src/seed/run.ts): gh = bbb00001-…001, guest/owner =
// aaa00001-…001. ownerId is a bare UUID (no FK, not list-filtered).
const GUESTHOUSES = [
  {
    id: "bbb00001-0000-4000-b000-000000000001",
    ownerId: "aaa00001-0000-4000-a000-000000000001",
    name: { en: "Casa do Sol", "pt-PT": "Casa do Sol" },
    slug: "casa-do-sol",
    address: "Ponta Delgada, São Miguel, Azores",
    geomLat: 37.7394,
    geomLng: -25.6687,
  },
] as const;

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: DEV_DB_URL });
  const db = drizzle(pool);

  console.log(`[seed] inserting ${ACTIONS.length} actions`);
  await db
    .insert(actionTable)
    .values([...ACTIONS])
    .onConflictDoNothing();

  console.log(`[seed] inserting ${WISHES.length} wishes`);
  await db
    .insert(wishTable)
    .values([...WISHES])
    .onConflictDoNothing();

  console.log(`[seed] inserting ${GUESTHOUSES.length} guesthouse fixture(s)`);
  await db
    .insert(guesthouseTable)
    .values([...GUESTHOUSES])
    .onConflictDoNothing();

  await pool.end();
  console.log("[seed] done");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
