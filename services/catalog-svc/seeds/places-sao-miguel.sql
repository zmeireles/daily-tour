-- places-sao-miguel.sql — 28 day-1 São Miguel places seed.
-- Authority: docs/exploration/05-tourism-domain.md §2 (places) + §3 (action/wish taxonomy).
-- Apply: pnpm seed && pnpm seed:places  (dev.ts must run first to populate actions + wishes).
--
-- UUID convention (mirrors T-1.1.0 pattern, all chars are valid hex):
--   place:       c0000001-0000-4000-a000-0000000000NN  (NN = 01..28)
--   place_media: d0000001-0000-4000-a000-0000000000NN  (NN = 01..28, one hero per place)
--   place_action_wish: composite PK (place_id, action_id, wish_id) — no surrogate.
--
-- Action/wish UUIDs sourced from seeds/dev.ts (canonical). Do not modify them here.
--
-- "Relax" remap: §3 drops "Relax" as a top-level action; §3 note says "Relax merges into
-- Do (thermal soak) + Eat (sea view)". Every §2 "Relax" entry is mapped to the "Do"
-- action with wish "thermal-soak" (b4000001-...-000000000002), documented per row.
--
-- Wish mapping gaps: several §2 freeform wishes have no exact §3 equivalent. The closest
-- §3 wish is selected and the original §2 wish is noted in a comment. Dropped wishes are
-- also noted. "summer-only", "evening-open", "morning", "lunch-only", "dinner" are hours /
-- seasonal flags — not wishes — and are skipped entirely (TODO: place.season column in
-- T-1.3.x or T-1.4.x owner-edit).
--
-- Hero images: one stable Unsplash URL reused for all 28 places as a dev placeholder.
-- Photo: https://images.unsplash.com/photo-1559825481-12a05cc00344?w=1200&q=80
-- (generic São Miguel volcanic landscape). Per-place imagery comes from owner uploads via
-- the media pipeline landing in T-1.4.x. Alt text is a placeholder; accessibility audit
-- in T-5.2 will refine.
--
-- Descriptions: EN + pt-PT placeholders (1-2 sentences each). Owner-side editing in
-- T-1.4.x will replace these with authoritative content.
--
-- Coordinates: approximate 5-decimal GPS from OpenStreetMap / Google Maps knowledge.
-- Source noted per place group. Sufficient for haversine geo-filter (T-1.2.0).
--
-- Hours: [] (empty) for all 28. Hours data entry is deferred to T-1.4.x owner-edit flow.
-- Contacts: {} (empty object) for all 28. Owner-edit in T-1.4.x.
-- is_hosts_pick: true for 4 representative eat-tagged places (#18 Mercado da
-- Graça, #19 Tony's Cozido das Furnas, #22 Cais 20, #25 Quinta dos Açores Ice
-- Cream). All other 24 stay false. The proper editorial workflow (owner UI
-- marking picks per guesthouse) is T-1.4.x admin work. This seed-level marking
-- is a dev-env stopgap so the home page's hosts' picks ribbon renders in UAT
-- and manual testing. Discovered via DT-TESTS-5 (UAT-G04 FAIL); admin gap
-- tracked in daily-tour project ("Backoffice UI for is_hosts_pick management").
-- guesthouse_scope: {"all": true} for all 28 (globally visible). Per-guesthouse scoping
-- is a Phase 1.4+ flow.

-- ─── PLACES ─────────────────────────────────────────────────────────────────

-- #1 Sete Cidades (Vista do Rei + Lagoa Azul)
-- Coords: Vista do Rei lookout, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000001',
  '{"all": true}'::jsonb,
  '{"en": "Sete Cidades (Vista do Rei + Lagoa Azul)", "pt-PT": "Sete Cidades (Vista do Rei + Lagoa Azul)"}'::jsonb,
  '{"en": "Twin volcanic crater lakes — one blue, one green — viewed from the Vista do Rei lookout. The most iconic landscape on São Miguel.", "pt-PT": "Lagoas vulcânicas gémeas — uma azul, uma verde — vistas do miradouro Vista do Rei. A paisagem mais icónica de São Miguel."}'::jsonb,
  37.85810, -25.79030,
  'Vista do Rei, Sete Cidades, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #2 Lagoa do Fogo (Miradouro + descida)
-- Coords: Lagoa do Fogo viewpoint, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000002',
  '{"all": true}'::jsonb,
  '{"en": "Lagoa do Fogo (Fire Lake)", "pt-PT": "Lagoa do Fogo (Miradouro + descida)"}'::jsonb,
  '{"en": "A pristine volcanic crater lake at the heart of the island, accessible by trail. Remote and rarely crowded.", "pt-PT": "Uma lagoa vulcânica prístina no centro da ilha, acessível por trilho. Remota e raramente movimentada."}'::jsonb,
  37.77640, -25.52850,
  'Lagoa do Fogo, Ribeira Grande, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #3 Furnas — caldeiras village walk
-- Coords: Caldeiras das Furnas, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000003',
  '{"all": true}'::jsonb,
  '{"en": "Furnas — Caldeiras Village Walk", "pt-PT": "Furnas — Caldeiras (passeio pela aldeia)"}'::jsonb,
  '{"en": "Walk among boiling volcanic mud pools and fumaroles in the village of Furnas. Free to explore, atmospheric at any hour.", "pt-PT": "Passeie entre piscinas de lama vulcânica a ferver e fumarolas na aldeia das Furnas. Entrada livre, atmosférico a qualquer hora."}'::jsonb,
  37.76720, -25.31790,
  'Caldeiras das Furnas, Furnas, Vila Franca do Campo, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #4 Terra Nostra Park + thermal pool
-- Coords: Terra Nostra Garden, Furnas, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000004',
  '{"all": true}'::jsonb,
  '{"en": "Terra Nostra Park + Thermal Pool", "pt-PT": "Parque Terra Nostra + piscina termal"}'::jsonb,
  '{"en": "A 19th-century botanical garden in Furnas with a large iron-rich thermal pool. Iconic, family-friendly, and unmissable.", "pt-PT": "Jardim botânico do século XIX em Furnas com uma grande piscina termal rica em ferro. Icónico, para a família e imperdível."}'::jsonb,
  37.76890, -25.31870,
  'Rua Manuel de Arriaga, Furnas, Vila Franca do Campo, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #5 Poça da Dona Beija
-- Coords: Poça da Dona Beija thermal springs, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000005',
  '{"all": true}'::jsonb,
  '{"en": "Poça da Dona Beija", "pt-PT": "Poça da Dona Beija"}'::jsonb,
  '{"en": "Natural thermal pools open into the evening — the most affordable soak in Furnas. Best at dusk when the steam rises.", "pt-PT": "Piscinas termais naturais abertas até à noite — o mergulho mais económico nas Furnas. Melhor ao anoitecer quando o vapor sobe."}'::jsonb,
  37.76930, -25.33600,
  'Rua da Poça, Furnas, Vila Franca do Campo, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #6 Gorreana Tea Factory
-- Coords: Gorreana, Maia, Ribeira Grande, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000006',
  '{"all": true}'::jsonb,
  '{"en": "Gorreana Tea Factory", "pt-PT": "Fábrica de Chá Gorreana"}'::jsonb,
  '{"en": "The oldest tea plantation in Europe, still operating since 1883. Free entry, factory tour, and tasting. A rainy-day favourite.", "pt-PT": "A mais antiga plantação de chá da Europa, em funcionamento desde 1883. Entrada livre, visita à fábrica e prova. Ideal para dias de chuva."}'::jsonb,
  37.80700, -25.40270,
  'Gorreana, Maia, Ribeira Grande, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #7 Plantações de Ananás (Faja de Baixo)
-- Coords: Faja de Baixo pineapple greenhouses, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000007',
  '{"all": true}'::jsonb,
  '{"en": "Pineapple Plantations (Faja de Baixo)", "pt-PT": "Plantações de Ananás (Faja de Baixo)"}'::jsonb,
  '{"en": "Traditional glass-house pineapple plantations unique to the Azores. A short visit with a sweet souvenir opportunity.", "pt-PT": "Plantações tradicionais de ananás em estufas de vidro únicas nos Açores. Visita rápida com oportunidade de souvenir delicioso."}'::jsonb,
  37.73670, -25.69080,
  'Faja de Baixo, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #8 Whale watching — Futurismo / Terra Azul (PDL)
-- Coords: Marina de Ponta Delgada departure point, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000008',
  '{"all": true}'::jsonb,
  '{"en": "Whale Watching — Futurismo / Terra Azul (PDL)", "pt-PT": "Observação de Baleias — Futurismo / Terra Azul (PDL)"}'::jsonb,
  '{"en": "Year-round sperm whale sightings; blue and fin whales in Apr–May migration. Family-friendly boats depart from PDL marina.", "pt-PT": "Avistamento de cachalotes durante todo o ano; baleias azuis e sardinheiras em migração de abr–mai. Barcos para famílias partem da marina de PDL."}'::jsonb,
  37.74130, -25.66250,
  'Marina de Ponta Delgada, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #9 Ilhéu Vila Franca do Campo (summer ferry)
-- Coords: Vila Franca do Campo harbor, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000009',
  '{"all": true}'::jsonb,
  '{"en": "Ilhéu Vila Franca do Campo (summer ferry)", "pt-PT": "Ilhéu de Vila Franca do Campo (barco de verão)"}'::jsonb,
  '{"en": "A small volcanic islet with a natural sea-pool. Ferry runs Jun–Sep; iconic summer swim spot with limited daily slots.", "pt-PT": "Um pequeno ilhéu vulcânico com piscina natural. Barco de jun–set; icónico para nadar no verão com lugares diários limitados."}'::jsonb,
  37.71470, -25.42170,
  'Ilhéu de Vila Franca do Campo, Vila Franca do Campo, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #10 Praia de Santa Bárbara (Ribeira Grande)
-- Coords: Praia de Santa Bárbara, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000010',
  '{"all": true}'::jsonb,
  '{"en": "Praia de Santa Bárbara (Ribeira Grande)", "pt-PT": "Praia de Santa Bárbara (Ribeira Grande)"}'::jsonb,
  '{"en": "The best surf beach on São Miguel, facing the open Atlantic. Black volcanic sand, consistent swell, beautiful sunsets.", "pt-PT": "A melhor praia de surf de São Miguel, voltada para o Atlântico aberto. Areia vulcânica negra, ondulação consistente, pôres do sol deslumbrantes."}'::jsonb,
  37.82900, -25.50400,
  'Praia de Santa Bárbara, Ribeira Grande, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #11 Praia dos Mosteiros + sunset
-- Coords: Mosteiros beach, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000011',
  '{"all": true}'::jsonb,
  '{"en": "Praia dos Mosteiros + Sunset", "pt-PT": "Praia dos Mosteiros + por do sol"}'::jsonb,
  '{"en": "A dramatic black-sand beach framed by sea stacks, famous for the most scenic sunsets on São Miguel. Swim in calm weather.", "pt-PT": "Uma dramática praia de areia negra emoldurada por rochedos, famosa pelos pôres do sol mais cenográficos de São Miguel. Nadar com tempo calmo."}'::jsonb,
  37.88340, -25.81980,
  'Mosteiros, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #12 Salto do Cabrito waterfall
-- Coords: Salto do Cabrito near Sete Cidades, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000012',
  '{"all": true}'::jsonb,
  '{"en": "Salto do Cabrito Waterfall", "pt-PT": "Salto do Cabrito (cascata)"}'::jsonb,
  '{"en": "A hidden waterfall reached via a short family-friendly trail in the Sete Cidades caldera area. Lush and photogenic.", "pt-PT": "Uma cascata escondida acessível por um curto trilho para a família na área da caldeira de Sete Cidades. Exuberante e fotogénica."}'::jsonb,
  37.82390, -25.67450,
  'Sete Cidades, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #13 Caldeira Velha (interpretive + thermal)
-- Coords: Caldeira Velha, Ribeira Grande, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000013',
  '{"all": true}'::jsonb,
  '{"en": "Caldeira Velha (Thermal + Forest)", "pt-PT": "Caldeira Velha (termal + floresta)"}'::jsonb,
  '{"en": "Warm thermal pools in a lush forest setting, with an interpretive trail. Family-friendly and refreshingly wild.", "pt-PT": "Piscinas termais quentes numa floresta exuberante, com percurso interpretativo. Ideal para famílias e refrescantemente selvagem."}'::jsonb,
  37.79000, -25.50650,
  'Ribeira Grande, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #14 Ponta da Ferraria (ocean thermal pool)
-- Coords: Ponta da Ferraria, Mosteiros, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000014',
  '{"all": true}'::jsonb,
  '{"en": "Ponta da Ferraria (Ocean Thermal Pool)", "pt-PT": "Ponta da Ferraria (piscina termal oceânica)"}'::jsonb,
  '{"en": "A unique natural thermal pool where geothermal water meets the Atlantic. Tide-dependent — best accessed 1h either side of low tide.", "pt-PT": "Uma piscina termal natural única onde água geotérmica encontra o Atlântico. Depende da maré — melhor acessível 1h antes ou depois da baixa-mar."}'::jsonb,
  37.88760, -25.84760,
  'Mosteiros, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #15 Nordeste viewpoints loop (Ponta da Madrugada, Sossego)
-- Coords: Ponta da Madrugada, Nordeste, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000015',
  '{"all": true}'::jsonb,
  '{"en": "Nordeste Viewpoints Loop (Ponta da Madrugada, Sossego)", "pt-PT": "Circuito de Miradouros do Nordeste (Ponta da Madrugada, Sossego)"}'::jsonb,
  '{"en": "A full-day scenic drive along the eastern tip of São Miguel, stopping at dramatic cliffside viewpoints. Remote and unspoiled.", "pt-PT": "Um percurso panorâmico de dia inteiro ao longo da ponta leste de São Miguel, com paragens em miradouros dramáticos. Remoto e intocado."}'::jsonb,
  37.83420, -25.15330,
  'Ponta da Madrugada, Nordeste, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #16 Pico do Carvão / Pico da Barrosa
-- Coords: Pico do Carvão, Lagoa, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000016',
  '{"all": true}'::jsonb,
  '{"en": "Pico do Carvão / Pico da Barrosa", "pt-PT": "Pico do Carvão / Pico da Barrosa"}'::jsonb,
  '{"en": "Easy roadside viewpoints at altitude offering panoramic views of the island interior. Perfect for a quick sunrise stop.", "pt-PT": "Miradouros de beira de estrada em altitude com vistas panorâmicas do interior da ilha. Perfeito para uma paragem rápida ao amanhecer."}'::jsonb,
  37.79750, -25.53250,
  'Lagoa, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #17 Centro Histórico Ponta Delgada (Portas da Cidade)
-- Coords: Portas da Cidade, Ponta Delgada, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000017',
  '{"all": true}'::jsonb,
  '{"en": "Historic Centre of Ponta Delgada (Portas da Cidade)", "pt-PT": "Centro Histórico de Ponta Delgada (Portas da Cidade)"}'::jsonb,
  '{"en": "A walkable historic waterfront with the iconic 18th-century Portas da Cidade arch, churches, and black-and-white cobblestone squares. Perfect for a rainy afternoon.", "pt-PT": "Um centro histórico ribeirinho para explorar a pé, com o icónico arco Portas da Cidade do século XVIII, igrejas e praças de calçada preta e branca. Perfeito para uma tarde de chuva."}'::jsonb,
  37.74180, -25.66550,
  'Portas da Cidade, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #18 Mercado da Graça (PDL)
-- Coords: Mercado da Graça, Ponta Delgada, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000018',
  '{"all": true}'::jsonb,
  '{"en": "Mercado da Graça (PDL)", "pt-PT": "Mercado da Graça (PDL)"}'::jsonb,
  '{"en": "The main covered market in Ponta Delgada, best visited in the morning for local cheese, fresh fish, and Azorean produce.", "pt-PT": "O principal mercado coberto de Ponta Delgada, melhor visitado de manhã para queijo local, peixe fresco e produtos açorianos."}'::jsonb,
  37.74160, -25.66630,
  'Rua Machado dos Santos, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', true, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #19 Restaurante Tony's (Furnas) — cozido das Furnas
-- Coords: Tony's Restaurant, Furnas, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000019',
  '{"all": true}'::jsonb,
  '{"en": "Restaurante Tony''s (Furnas) — Cozido das Furnas", "pt-PT": "Restaurante Tony''s (Furnas) — cozido das Furnas"}'::jsonb,
  '{"en": "The iconic cozido das Furnas — a slow-cooked stew prepared underground by geothermal heat. Lunch only; reserve by 11:00.", "pt-PT": "O icónico cozido das Furnas — ensopado cozinhado lentamente sob o solo por calor geotérmico. Só ao almoço; reserve antes das 11:00."}'::jsonb,
  37.76930, -25.31930,
  'Furnas, Vila Franca do Campo, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', true, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #20 Restaurante Alcides (PDL) — bife à regional
-- Coords: Restaurante Alcides, Ponta Delgada, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000020',
  '{"all": true}'::jsonb,
  '{"en": "Restaurante Alcides (PDL) — Bife à Regional", "pt-PT": "Restaurante Alcides (PDL) — bife à regional"}'::jsonb,
  '{"en": "A PDL institution for the traditional bife à regional — beef with garlic butter, bay leaf and lard. Dinner, hearty portions.", "pt-PT": "Uma instituição em PDL para o tradicional bife à regional — vaca com manteiga de alho, louro e banha. Jantar, doses generosas."}'::jsonb,
  37.74330, -25.66130,
  'Rua Hintze Ribeiro 69, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #21 A Tasca (PDL) — petiscos
-- Coords: A Tasca, Ponta Delgada, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000021',
  '{"all": true}'::jsonb,
  '{"en": "A Tasca (PDL) — Petiscos", "pt-PT": "A Tasca (PDL) — petiscos"}'::jsonb,
  '{"en": "A lively local bar with small plates (petiscos) and an informal atmosphere — great for groups, open late.", "pt-PT": "Um animado bar local com petiscos e ambiente informal — ótimo para grupos, aberto até tarde."}'::jsonb,
  37.74280, -25.65980,
  'Rua do Aljube, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #22 Cais 20 (Ribeira Quente) — fresh fish
-- Coords: Ribeira Quente harbor, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000022',
  '{"all": true}'::jsonb,
  '{"en": "Cais 20 (Ribeira Quente) — Fresh Fish", "pt-PT": "Cais 20 (Ribeira Quente) — peixe fresco"}'::jsonb,
  '{"en": "A simple waterfront restaurant at Ribeira Quente with sea views and grilled-to-order fresh fish. Worth the scenic drive from PDL.", "pt-PT": "Restaurante simples à beira-mar na Ribeira Quente com vista para o mar e peixe fresco grelhado. Vale a pena a viagem panorâmica desde PDL."}'::jsonb,
  37.72900, -25.34020,
  'Ribeira Quente, Povoação, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', true, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #23 Bar Caloura (sea pool + grilled fish)
-- Coords: Porto de Caloura, Lagoa, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000023',
  '{"all": true}'::jsonb,
  '{"en": "Bar Caloura (Sea Pool + Grilled Fish)", "pt-PT": "Bar Caloura (piscina natural + peixe grelhado)"}'::jsonb,
  '{"en": "A natural sea pool with a bar serving grilled fish right at the water''s edge. A summer classic with sea views.", "pt-PT": "Uma piscina natural com um bar que serve peixe grelhado mesmo à beira-mar. Um clássico de verão com vista para o oceano."}'::jsonb,
  37.72000, -25.40620,
  'Porto de Caloura, Lagoa, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #24 Louvre Michaelense (PDL)
-- Coords: Louvre Michaelense, Ponta Delgada, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000024',
  '{"all": true}'::jsonb,
  '{"en": "Louvre Michaelense (PDL)", "pt-PT": "Louvre Michaelense (PDL)"}'::jsonb,
  '{"en": "A classic PDL café-restaurant with an art deco interior, good brunch and coffee. Walkable from the historic centre.", "pt-PT": "Um clássico café-restaurante de PDL com interior art déco, bom brunch e café. A pé do centro histórico."}'::jsonb,
  37.74300, -25.66430,
  'Rua Marquês de Praia e Monforte 32, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #25 Quinta dos Açores ice-cream (Ribeira Grande)
-- Coords: Ribeira Grande, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000025',
  '{"all": true}'::jsonb,
  '{"en": "Quinta dos Açores Ice Cream (Ribeira Grande)", "pt-PT": "Quinta dos Açores gelados (Ribeira Grande)"}'::jsonb,
  '{"en": "Artisan dairy ice cream made from Azorean milk — rich, fresh, and family-loved. A quick stop en route between PDL and the north coast.", "pt-PT": "Gelados artesanais de leite açoriano — ricos, frescos e adorados pelas famílias. Paragem rápida entre PDL e a costa norte."}'::jsonb,
  37.82980, -25.51310,
  'Ribeira Grande, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', true, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #26 Arruda Açores Pineapple Liqueur tasting
-- Coords: Faja de Baixo (near pineapple plantations), source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000026',
  '{"all": true}'::jsonb,
  '{"en": "Arruda Açores — Pineapple Liqueur Tasting", "pt-PT": "Arruda Açores — prova de licor de ananás"}'::jsonb,
  '{"en": "Free tasting of the famous Azorean pineapple liqueur, a unique local spirit. Quick visit; bottles make excellent souvenirs.", "pt-PT": "Prova gratuita do famoso licor de ananás açoriano, um espirituoso local único. Visita rápida; garrafas são excelentes souvenirs."}'::jsonb,
  37.73650, -25.68900,
  'Faja de Baixo, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #27 Picos de Aventura — kayak / coasteering
-- Coords: Ponta Delgada base, source: operator website knowledge
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000027',
  '{"all": true}'::jsonb,
  '{"en": "Picos de Aventura — Kayak / Coasteering", "pt-PT": "Picos de Aventura — caiaque / coasteering"}'::jsonb,
  '{"en": "Active sea kayaking and coasteering tours along the volcanic coastline. Family-friendly options available; best May–Sep.", "pt-PT": "Passeios ativos de caiaque marítimo e coasteering ao longo da costa vulcânica. Opções para famílias disponíveis; melhor de mai–set."}'::jsonb,
  37.74180, -25.66250,
  'Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #28 Azores Sub-Dive / snorkel with mobula rays
-- Coords: Ponta Delgada marina, source: OpenStreetMap
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000028',
  '{"all": true}'::jsonb,
  '{"en": "Azores Sub-Dive / Snorkel with Mobula Rays", "pt-PT": "Azores Sub — mergulho / snorkel com raias mobula"}'::jsonb,
  '{"en": "Snorkelling and diving with mobula rays and other pelagic species in crystal-clear Atlantic waters. An advanced bucket-list experience, best Jun–Sep.", "pt-PT": "Snorkeling e mergulho com raias mobula e outras espécies pelágicas em águas atlânticas cristalinas. Experiência avançada de lista de desejos, melhor jun–set."}'::jsonb,
  37.73900, -25.66100,
  'Marina de Ponta Delgada, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- ─── PLACE_ACTION_WISH ───────────────────────────────────────────────────────
-- Each row: (place_id, action_id, wish_id)
-- Action IDs from seeds/dev.ts:
--   eat=a0000001-...-001  drink=a0000001-...-002  see=a0000001-...-003
--   do=a0000001-...-004   buy=a0000001-...-005    move=a0000001-...-006
-- Wish IDs from seeds/dev.ts (b<action>000001-0000-4000-b000-0000000000<N>):
--   Eat:  sea-view=1 traditional=2 vegetarian=3 romantic=4 family=5 quick-local=6
--   Drink: cafe=1 wine-local-liqueur=2 cocktail-bar=3 live-music=4 sea-view=5 late=6
--   See:  viewpoint=1 lake-crater=2 volcanic-thermal=3 historic=4 garden=5 rainy-day-ok=6
--   Do:   hike=1 thermal-soak=2 whale-dolphin=3 water-sports=4 scenic-drive=5 with-kids=6
--   Buy:  tea-pineapple-liqueur=1 cheese-canned-fish=2 crafts-ceramics=3 bookstore=4 supermarket=5 pharmacy=6
--   Move: car-rental=1 taxi-transfer=2 gas-station=3 airport-shuttle=4 scenic-route-stop=5 ev-charger=6

-- #1 Sete Cidades — See (viewpoint, lake-crater, volcanic-thermal) + Do (hike)
-- Dropped §2 wishes: "iconic" (no §3 See match; viewpoint is closest, already included)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000001','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001'), -- See · viewpoint
  ('c0000001-0000-4000-a000-000000000001','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000002'), -- See · lake-crater  (§2: lake)
  ('c0000001-0000-4000-a000-000000000001','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000003'), -- See · volcanic-thermal  (§2: volcanic)
  ('c0000001-0000-4000-a000-000000000001','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000001') -- Do · hike  (descent to lakes)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #2 Lagoa do Fogo — See (viewpoint, lake-crater) + Do (hike)
-- Dropped §2 wishes: "remote" (no §3 equivalent)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000002','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001'), -- See · viewpoint
  ('c0000001-0000-4000-a000-000000000002','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000002'), -- See · lake-crater  (§2: lake)
  ('c0000001-0000-4000-a000-000000000002','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000001') -- Do · hike
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #3 Furnas caldeiras — See (volcanic-thermal)
-- §2 wishes: "volcanic" → volcanic-thermal; "geothermal" = same, deduplicated; "free" has no §3 wish
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000003','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000003') -- See · volcanic-thermal
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #4 Terra Nostra Park — Do (thermal-soak, with-kids)
-- §2 actions: "Do, Relax" → both map to Do (§3: Relax merges into Do/thermal-soak)
-- §2 wishes: "garden" has no Do equivalent (garden is a See wish; no See action listed); dropped with note
-- Dropped §2 wishes: "iconic" (no Do match), "garden" (See-only wish, no See action for this place)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000004','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000002'), -- Do · thermal-soak  (§2: Relax → Do)
  ('c0000001-0000-4000-a000-000000000004','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids  (§2: family)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #5 Poça da Dona Beija — Do (thermal-soak)
-- §2 actions: "Relax, Do" → both map to Do (§3: Relax → Do/thermal-soak)
-- Dropped §2 wishes: "evening-open" (hours flag, not a wish), "budget" (no §3 wish equivalent)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000005','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000002') -- Do · thermal-soak  (§2: Relax → Do, wish: thermal)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #6 Gorreana Tea Factory — See (rainy-day-ok) + Buy (tea-pineapple-liqueur)
-- Dropped §2 wishes: "unique-EU" (no §3 match; tea-pineapple-liqueur covers it for Buy), "free" (no §3 wish)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000006','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000006'), -- See · rainy-day-ok  (§2: rainy-day)
  ('c0000001-0000-4000-a000-000000000006','a0000001-0000-4000-a000-000000000005','b5000001-0000-4000-b000-000000000001') -- Buy · tea-pineapple-liqueur  (§2: unique-EU/tea)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #7 Plantações de Ananás — See (rainy-day-ok) + Buy (tea-pineapple-liqueur)
-- Dropped §2 wishes: "unique" (no §3 match), "quick" (no Buy wish equivalent)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000007','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000006'), -- See · rainy-day-ok  (§2: rainy-day)
  ('c0000001-0000-4000-a000-000000000007','a0000001-0000-4000-a000-000000000005','b5000001-0000-4000-b000-000000000001') -- Buy · tea-pineapple-liqueur  (§2: unique/pineapple)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #8 Whale watching — Do (whale-dolphin, with-kids)
-- Dropped §2 wishes: "bucket-list" (whale-dolphin already covers this), "seasonal" (hours/season flag)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000008','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000003'), -- Do · whale-dolphin  (§2: bucket-list mapped to whale-dolphin)
  ('c0000001-0000-4000-a000-000000000008','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids  (§2: family)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #9 Ilhéu Vila Franca do Campo — Do (water-sports)
-- §2 actions: "Do, Relax" → both map to Do (§3: Relax → Do/water-sports for swim)
-- Dropped §2 wishes: "summer-only" (seasonal flag), "iconic" (no Do match)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000009','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004') -- Do · water-sports  (§2: swim)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #10 Praia de Santa Bárbara — Do (water-sports)
-- §2 actions: "Relax, Do" → both map to Do (§3: Relax → Do)
-- Dropped §2 wishes: "beach" (no §3 Do match), "sunset" (no §3 Do match; it's a See attribute but no See action listed)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000010','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004') -- Do · water-sports  (§2: surf)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #11 Praia dos Mosteiros — See (viewpoint) + Do (water-sports)
-- §2 actions: "See, Relax" → See + Do (Relax → Do)
-- Dropped §2 wishes: "scenic" (viewpoint already covers it for See)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000011','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001'), -- See · viewpoint  (§2: sunset viewpoint)
  ('c0000001-0000-4000-a000-000000000011','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004') -- Do · water-sports  (§2: Relax/swim → Do)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #12 Salto do Cabrito — See (viewpoint) + Do (hike, with-kids)
-- Dropped §2 wishes: "waterfall" (no §3 wish; viewpoint is closest for See)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000012','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001'), -- See · viewpoint  (§2: waterfall view)
  ('c0000001-0000-4000-a000-000000000012','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000001'), -- Do · hike
  ('c0000001-0000-4000-a000-000000000012','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids  (§2: family)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #13 Caldeira Velha — See (volcanic-thermal, garden) + Do (thermal-soak, with-kids)
-- §2 actions: "Relax, See" → Do (Relax → Do) + See
-- See.garden maps §2 "forest" (closest §3 See wish for forested setting)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000013','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000003'), -- See · volcanic-thermal
  ('c0000001-0000-4000-a000-000000000013','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000005'), -- See · garden  (§2: forest → garden, closest §3)
  ('c0000001-0000-4000-a000-000000000013','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000002'), -- Do · thermal-soak  (§2: Relax → Do, wish: thermal)
  ('c0000001-0000-4000-a000-000000000013','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids  (§2: family)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #14 Ponta da Ferraria — Do (thermal-soak)
-- §2 actions: "Relax, Do" → both map to Do (Relax → Do/thermal-soak)
-- Dropped §2 wishes: "ocean" (no §3 Do match), "tide-dependent" (operational note, not a wish)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000014','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000002') -- Do · thermal-soak  (§2: Relax → Do, wish: thermal)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #15 Nordeste viewpoints loop — See (viewpoint) + Move (scenic-route-stop)
-- Dropped §2 wishes: "full-day" (duration/planning note, not a wish)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000015','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001'), -- See · viewpoint
  ('c0000001-0000-4000-a000-000000000015','a0000001-0000-4000-a000-000000000006','b6000001-0000-4000-b000-000000000005') -- Move · scenic-route-stop  (§2: scenic-drive)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #16 Pico do Carvão / Pico da Barrosa — See (viewpoint)
-- Dropped §2 wishes: "sunrise" (no §3 See wish), "quick-stop" (no §3 wish)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000016','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001') -- See · viewpoint
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #17 Centro Histórico PDL — See (historic, rainy-day-ok)
-- Dropped §2 wishes: "walkable" (no §3 See wish equivalent)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000017','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000004'), -- See · historic
  ('c0000001-0000-4000-a000-000000000017','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000006') -- See · rainy-day-ok  (§2: rainy-day)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #18 Mercado da Graça — Eat (quick-local) + Buy (cheese-canned-fish)
-- Dropped §2 wishes: "morning" (hours flag, not a wish), "local" mapped to Eat.quick-local
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000018','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000006'), -- Eat · quick-local  (§2: local + morning)
  ('c0000001-0000-4000-a000-000000000018','a0000001-0000-4000-a000-000000000005','b5000001-0000-4000-b000-000000000002') -- Buy · cheese-canned-fish  (§2: cheese-fish)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #19 Restaurante Tony's — Eat (traditional)
-- Dropped §2 wishes: "lunch-only" (hours flag), "iconic" (traditional is the closest Eat match)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000019','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000002') -- Eat · traditional  (§2: traditional, iconic cozido)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #20 Restaurante Alcides — Eat (traditional)
-- Dropped §2 wishes: "dinner" (hours flag), "meat" (traditional covers it)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000020','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000002') -- Eat · traditional  (§2: traditional/meat)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #21 A Tasca — Eat (quick-local) + Drink (late)
-- Dropped §2 wishes: "group" (no §3 equivalent for either action)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000021','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000006'), -- Eat · quick-local  (§2: local)
  ('c0000001-0000-4000-a000-000000000021','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000006') -- Drink · late  (§2: late)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #22 Cais 20 — Eat (sea-view)
-- Dropped §2 wishes: "lunch" (hours flag), "scenic-drive" (travel attribute, no Eat wish)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000022','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000001') -- Eat · sea-view
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #23 Bar Caloura — Eat (sea-view) + Do (water-sports)
-- §2 actions: "Eat, Relax" → Eat + Do (Relax → Do/water-sports for swim)
-- Dropped §2 wishes: "summer" (seasonal flag)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000023','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000001'), -- Eat · sea-view
  ('c0000001-0000-4000-a000-000000000023','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004') -- Do · water-sports  (§2: Relax/swim → Do)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #24 Louvre Michaelense — Eat (quick-local) + Drink (cafe)
-- Dropped §2 wishes: "walkable" (no §3 wish equivalent; quick-local implies accessibility)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000024','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000006'), -- Eat · quick-local  (§2: brunch/walkable)
  ('c0000001-0000-4000-a000-000000000024','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000001') -- Drink · cafe  (§2: café)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #25 Quinta dos Açores ice-cream — Eat (family, quick-local)
-- Dropped §2 wishes: "dairy" (traditional is closest Eat wish; quick-local already assigned)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000025','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000005'), -- Eat · family  (§2: family)
  ('c0000001-0000-4000-a000-000000000025','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000006') -- Eat · quick-local  (§2: quick)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #26 Arruda Açores Pineapple Liqueur — Drink (wine-local-liqueur) + Buy (tea-pineapple-liqueur, crafts-ceramics)
-- §2 wishes: "souvenir" → crafts-ceramics (closest Buy wish for a takeaway product)
-- Dropped §2 wishes: "unique" (no §3 match; tea-pineapple-liqueur covers it), "quick" (no wish equivalent)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000026','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000002'), -- Drink · wine-local-liqueur  (§2: unique/liqueur)
  ('c0000001-0000-4000-a000-000000000026','a0000001-0000-4000-a000-000000000005','b5000001-0000-4000-b000-000000000001'), -- Buy · tea-pineapple-liqueur  (§2: unique/pineapple)
  ('c0000001-0000-4000-a000-000000000026','a0000001-0000-4000-a000-000000000005','b5000001-0000-4000-b000-000000000003') -- Buy · crafts-ceramics  (§2: souvenir → crafts, closest)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #27 Picos de Aventura — Do (water-sports, with-kids)
-- Dropped §2 wishes: "active" (water-sports covers it), "summer" (seasonal flag)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000027','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004'), -- Do · water-sports  (§2: kayak/coasteering)
  ('c0000001-0000-4000-a000-000000000027','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids  (§2: family)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #28 Azores Sub-Dive — Do (water-sports, whale-dolphin)
-- §2 wish "bucket-list" → whale-dolphin (closest §3 Do wish for rare marine encounter)
-- Dropped §2 wishes: "summer-only" (seasonal flag), "advanced" (no §3 wish)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000028','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004'), -- Do · water-sports  (§2: snorkel/dive)
  ('c0000001-0000-4000-a000-000000000028','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000003') -- Do · whale-dolphin  (§2: bucket-list → whale-dolphin, closest §3)
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- ─── PLACE_MEDIA (28 hero images) ────────────────────────────────────────────
-- One row per place. kind='image', sort_order=1.
-- Landmarks (14): verified Wikimedia Commons heroes (plan-006 6.B.1 / #135);
--   licence read from each File: page at ingest — PD rows carry attribution
--   NULL, CC-BY/CC-BY-SA rows carry {author, license, source_url}.
-- Businesses (14): Unsplash placeholder until owner-uploaded heroes (6.C.2) —
--   owner-provided photos are the only lawful source for them.
-- Alt text: placeholder EN + pt-PT. Accessibility audit in T-5.2 will refine.

INSERT INTO catalog.place_media (id, place_id, kind, url, alt, attribution, sort_order) VALUES
  ('d0000001-0000-4000-a000-000000000001','c0000001-0000-4000-a000-000000000001','image','https://upload.wikimedia.org/wikipedia/commons/9/91/Lagoa_das_Sete_Cidades%2C_Miradouro_da_Vista_do_Rei%2C_Ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores%2C_Portugal.JPG','{"en":"Photo of Sete Cidades","pt-PT":"Foto de Sete Cidades"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000002','c0000001-0000-4000-a000-000000000002','image','https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Lagoa_do_Fogo%2C_S._Miguel%2C_A%C3%A7ores.JPG/1280px-Lagoa_do_Fogo%2C_S._Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Lagoa do Fogo","pt-PT":"Foto de Lagoa do Fogo"}','{"author":"Samuel Fonseca 85","license":"CC BY-SA 3.0","source_url":"https://commons.wikimedia.org/w/index.php?curid=40347024"}'::jsonb,1),
  ('d0000001-0000-4000-a000-000000000003','c0000001-0000-4000-a000-000000000003','image','https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Caldeira_fervendo%2C_Vale_das_Furnas%2C_Povoa%C3%A7%C3%A3o%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Caldeira_fervendo%2C_Vale_das_Furnas%2C_Povoa%C3%A7%C3%A3o%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Furnas Caldeiras","pt-PT":"Foto das Caldeiras das Furnas"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000004','c0000001-0000-4000-a000-000000000004','image','https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Parque_Terra_Nostra%2C_Piscina_de_%C3%A1gua_f%C3%A9rrea%2C_Furnas%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Parque_Terra_Nostra%2C_Piscina_de_%C3%A1gua_f%C3%A9rrea%2C_Furnas%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Terra Nostra Park","pt-PT":"Foto do Parque Terra Nostra"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000009','c0000001-0000-4000-a000-000000000009','image','https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Ilh%C3%A9u_de_vila_Franca_do_Campo%2C_vista_geral%2C_Vila_Franca_do_Campo._ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Ilh%C3%A9u_de_vila_Franca_do_Campo%2C_vista_geral%2C_Vila_Franca_do_Campo._ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Ilhéu Vila Franca","pt-PT":"Foto do Ilhéu de Vila Franca"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000010','c0000001-0000-4000-a000-000000000010','image','https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Praia_de_Santa_Barbara_-_panoramio.jpg/1280px-Praia_de_Santa_Barbara_-_panoramio.jpg','{"en":"Photo of Praia de Santa Bárbara","pt-PT":"Foto da Praia de Santa Bárbara"}','{"author":"JCNazza","license":"CC BY 3.0","source_url":"https://commons.wikimedia.org/w/index.php?curid=59844053"}'::jsonb,1),
  ('d0000001-0000-4000-a000-000000000011','c0000001-0000-4000-a000-000000000011','image','https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Miradouro_da_Ponta_do_Escalvado%2C_Mosteiros%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Miradouro_da_Ponta_do_Escalvado%2C_Mosteiros%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Praia dos Mosteiros","pt-PT":"Foto da Praia dos Mosteiros"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000012','c0000001-0000-4000-a000-000000000012','image','https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Salto_Do_Cabrito_Ilha_de_S%C3%A3o_Miguel_01.jpg/1280px-Salto_Do_Cabrito_Ilha_de_S%C3%A3o_Miguel_01.jpg','{"en":"Photo of Salto do Cabrito","pt-PT":"Foto do Salto do Cabrito"}','{"author":"Órvil Fernando de Aragão Russo","license":"CC BY-SA 4.0","source_url":"https://commons.wikimedia.org/w/index.php?curid=107758096"}'::jsonb,1),
  ('d0000001-0000-4000-a000-000000000013','c0000001-0000-4000-a000-000000000013','image','https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Monumento_Natural_e_Regional_da_Caldeira_Velha%2C_local_de_banhos_em_%C3%A1guas_termais%2C_magnificas_forma%C3%A7%C3%B5es_geol%C3%B3gicas%2C_Ribeira_Grande%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-thumbnail.jpg','{"en":"Photo of Caldeira Velha","pt-PT":"Foto da Caldeira Velha"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000014','c0000001-0000-4000-a000-000000000014','image','https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Farol_da_Ponta_da_Ferraria%2C_Ponta_Delgada%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Farol_da_Ponta_da_Ferraria%2C_Ponta_Delgada%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Ponta da Ferraria","pt-PT":"Foto da Ponta da Ferraria"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000015','c0000001-0000-4000-a000-000000000015','image','https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Miradouro_da_Ponta_da_Madrugada%2C_fal%C3%A9sias%2C_Nordeste%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Miradouro_da_Ponta_da_Madrugada%2C_fal%C3%A9sias%2C_Nordeste%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Nordeste Viewpoints","pt-PT":"Foto dos Miradouros do Nordeste"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000016','c0000001-0000-4000-a000-000000000016','image','https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Zona_das_Sete_Cidades%2C_Miradouro_do_Pico_do_Carv%C3%A3o%2C_Ponta_Delgada%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Zona_das_Sete_Cidades%2C_Miradouro_do_Pico_do_Carv%C3%A3o%2C_Ponta_Delgada%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Pico do Carvão","pt-PT":"Foto do Pico do Carvão"}',NULL,1),
  ('d0000001-0000-4000-a000-000000000017','c0000001-0000-4000-a000-000000000017','image','https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Portas_da_Cidade%2C_Ponta_Delgada%2C_isla_de_San_Miguel%2C_Azores%2C_Portugal%2C_2020-07-29%2C_DD_123-125_HDR.jpg/1280px-Portas_da_Cidade%2C_Ponta_Delgada%2C_isla_de_San_Miguel%2C_Azores%2C_Portugal%2C_2020-07-29%2C_DD_123-125_HDR.jpg','{"en":"Photo of Ponta Delgada Historic Centre","pt-PT":"Foto do Centro Histórico de Ponta Delgada"}','{"author":"Diego Delso","license":"CC BY-SA 4.0","source_url":"https://commons.wikimedia.org/w/index.php?curid=93840604"}'::jsonb,1),
  ('d0000001-0000-4000-a000-000000000023','c0000001-0000-4000-a000-000000000023','image','https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Caloura_vista_do_Miradouro_do_Pis%C3%A3o%2C_Lagoa%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG/1280px-Caloura_vista_do_Miradouro_do_Pis%C3%A3o%2C_Lagoa%2C_ilha_de_S%C3%A3o_Miguel%2C_A%C3%A7ores.JPG','{"en":"Photo of Bar Caloura","pt-PT":"Foto do Bar Caloura"}',NULL,1)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Near Miguel's guesthouses (Ponta Delgada / São Roque / Fajã de Baixo).
-- Real POIs from research 2026-06-16. No place_media → PWA Hero shows the
-- branded "photo coming soon" fallback until owner/real photos are added.
-- ─────────────────────────────────────────────────────────────────────────
-- #29 Tasquinha Vieira — Eat (traditional)
-- coords: Tasquinha Vieira, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000029',
  '{"all": true}'::jsonb,
  '{"en": "Tasquinha Vieira", "pt-PT": "Tasquinha Vieira"}'::jsonb,
  '{"en": "An intimate spot in the historic centre with a frequently-changing menu of creative Azorean small plates. Booking advised.", "pt-PT": "Um espaço intimista no centro histórico com uma ementa em constante mudança de pequenos pratos açorianos criativos. Reserva aconselhada."}'::jsonb,
  37.74110, -25.66689,
  'Rua António Joaquim Nunes da Silva 21, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #30 Mariserra — Eat (sea-view, traditional)
-- coords: Mariserra, São Roque, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000030',
  '{"all": true}'::jsonb,
  '{"en": "Mariserra", "pt-PT": "Mariserra"}'::jsonb,
  '{"en": "Seafront seafood on the São Roque promenade — grilled fish, seafood rice and a sea-view terrace. A local favourite for a relaxed lunch.", "pt-PT": "Marisqueira à beira-mar na marginal de São Roque — peixe grelhado, arroz de marisco e esplanada com vista para o mar. Um clássico local para um almoço descontraído."}'::jsonb,
  37.74509, -25.64484,
  'Rua da Praia dos Santos 61, São Roque, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #31 Portas do Mar — Eat (sea-view) + Drink (cafe)
-- coords: Portas do Mar, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000031',
  '{"all": true}'::jsonb,
  '{"en": "Portas do Mar", "pt-PT": "Portas do Mar"}'::jsonb,
  '{"en": "A modern marina-front complex of restaurants and cafés overlooking the bay, beside the cruise terminal. Easy strolling and harbour views.", "pt-PT": "Um moderno complexo à beira da marina, com restaurantes e cafés debruçados sobre a baía, junto ao terminal de cruzeiros. Ideal para passear e apreciar a vista do porto."}'::jsonb,
  37.74002, -25.66182,
  'Avenida Infante Dom Henrique, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #32 Intz48 Coffee Roasters — Drink (cafe)
-- coords: Intz48, Ponta Delgada, São Miguel, Açores (fallback query), source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000032',
  '{"all": true}'::jsonb,
  '{"en": "Intz48 Coffee Roasters", "pt-PT": "Intz48 Coffee Roasters"}'::jsonb,
  '{"en": "Ponta Delgada''s standout specialty-coffee roaster — freshly roasted beans, well-made espresso and a good brunch. Beans to take home too.", "pt-PT": "O torrefactor de café de especialidade de referência em Ponta Delgada — grãos torrados na hora, expresso bem tirado e um bom brunch. Também há grãos para levar para casa."}'::jsonb,
  37.74102, -25.66852,
  'Rua Hintze Ribeiro 48, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #33 Sunset Beach Bar — Drink (cocktail-bar, sea-view)
-- coords: approx — no Nominatim match for the bar; uses Praia de São Roque sand
--   coords (the bar sits on that beach), source: Nominatim/OSM (Praia de São Roque)
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000033',
  '{"all": true}'::jsonb,
  '{"en": "Sunset Beach Bar", "pt-PT": "Sunset Beach Bar"}'::jsonb,
  '{"en": "A low-key beach bar right on the sand at São Roque, serving cocktails with sundown views over the Atlantic. Best as the light fades.", "pt-PT": "Um descontraído bar de praia mesmo na areia de São Roque, a servir cocktails com vista para o pôr do sol sobre o Atlântico. Melhor ao cair da luz."}'::jsonb,
  37.75095, -25.62523,
  'Praia de São Roque, São Roque, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #34 Praia de São Roque — Do (water-sports, with-kids)
-- coords: Praia de São Roque, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000034',
  '{"all": true}'::jsonb,
  '{"en": "Praia de São Roque", "pt-PT": "Praia de São Roque"}'::jsonb,
  '{"en": "A black volcanic-sand beach in a sheltered, family-friendly bay just east of the centre. Easy to reach for a quick swim.", "pt-PT": "Uma praia de areia vulcânica negra numa baía abrigada e familiar, mesmo a leste do centro. Fácil de alcançar para um mergulho rápido."}'::jsonb,
  37.75095, -25.62523,
  'Praia de São Roque, São Roque, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #35 Praia do Pópulo — Do (water-sports, with-kids)
-- coords: Praia do Populo, Açores (fallback query), source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000035',
  '{"all": true}'::jsonb,
  '{"en": "Praia do Pópulo", "pt-PT": "Praia do Pópulo"}'::jsonb,
  '{"en": "One of the island''s most popular sandy beaches, with relatively calm water and easy facilities. A reliable family day out near PDL.", "pt-PT": "Uma das praias de areia mais populares da ilha, com água relativamente calma e bons apoios. Um seguro dia de família perto de PDL."}'::jsonb,
  37.75063, -25.61853,
  'Praia do Pópulo, Livramento, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #36 Museu Carlos Machado — See (historic, rainy-day-ok)
-- coords: Museu Carlos Machado, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000036',
  '{"all": true}'::jsonb,
  '{"en": "Museu Carlos Machado", "pt-PT": "Museu Carlos Machado"}'::jsonb,
  '{"en": "The Azores'' oldest museum, set in a former convent: natural-history, ethnographic and sacred-art collections. A great rainy-day visit.", "pt-PT": "O mais antigo museu dos Açores, instalado num antigo convento: colecções de história natural, etnografia e arte sacra. Uma óptima visita para dias de chuva."}'::jsonb,
  37.74320, -25.66771,
  'Rua de Santa Bárbara, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #37 Forte de São Brás — See (historic, rainy-day-ok)
-- coords: Forte de São Brás, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000037',
  '{"all": true}'::jsonb,
  '{"en": "Forte de São Brás", "pt-PT": "Forte de São Brás"}'::jsonb,
  '{"en": "An imposing 16th-century seafront fortress that houses the Military Museum of the Azores. Walk the ramparts for harbour views.", "pt-PT": "Uma imponente fortaleza quinhentista à beira-mar que alberga o Museu Militar dos Açores. Percorra as muralhas para vistas sobre o porto."}'::jsonb,
  37.73622, -25.67228,
  'Rua Doutor Teófilo de Braga, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #38 Gruta do Carvão — See (volcanic-thermal, rainy-day-ok)
-- coords: Gruta do Carvão, Ponta Delgada, source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000038',
  '{"all": true}'::jsonb,
  '{"en": "Gruta do Carvão", "pt-PT": "Gruta do Carvão"}'::jsonb,
  '{"en": "São Miguel''s longest lava tube (~1.9 km), partly visitable on a guided tour through striking volcanic formations. Book ahead.", "pt-PT": "O mais extenso tubo de lava de São Miguel (~1,9 km), em parte visitável numa visita guiada por impressionantes formações vulcânicas. Reserve com antecedência."}'::jsonb,
  37.74816, -25.68707,
  '2ª Circular, Santa Clara, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #39 Miradouro da Mãe de Deus — See (viewpoint)
-- coords: Ermida da Mãe de Deus, Ponta Delgada (the hilltop chapel that defines
--   the viewpoint), source: Nominatim/OSM
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000039',
  '{"all": true}'::jsonb,
  '{"en": "Miradouro da Mãe de Deus", "pt-PT": "Miradouro da Mãe de Deus"}'::jsonb,
  '{"en": "A hilltop chapel viewpoint over Ponta Delgada, its harbour and the open Atlantic. Especially lovely at sunset.", "pt-PT": "Um miradouro junto a uma ermida no alto, sobre Ponta Delgada, o seu porto e o Atlântico. Particularmente bonito ao pôr do sol."}'::jsonb,
  37.74389, -25.66061,
  'Ladeira da Mãe de Deus, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', false, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- ─── PLACE_ACTION_WISH (#29–#39) ─────────────────────────────────────────────
-- Action IDs: eat=a0000001-...-001 drink=...-002 see=...-003 do=...-004
-- Wish IDs (b<action>000001-0000-4000-b000-0000000000<N>):
--   Eat:  sea-view=1 traditional=2 vegetarian=3 romantic=4 family=5 quick-local=6
--   Drink: cafe=1 wine-local-liqueur=2 cocktail-bar=3 live-music=4 sea-view=5 late=6
--   See:  viewpoint=1 lake-crater=2 volcanic-thermal=3 historic=4 garden=5 rainy-day-ok=6
--   Do:   hike=1 thermal-soak=2 whale-dolphin=3 water-sports=4 scenic-drive=5 with-kids=6

-- #29 Tasquinha Vieira — Eat (traditional)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000029','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000002') -- Eat · traditional
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #30 Mariserra — Eat (sea-view, traditional)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000030','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000001'), -- Eat · sea-view
  ('c0000001-0000-4000-a000-000000000030','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000002') -- Eat · traditional
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #31 Portas do Mar — Eat (sea-view) + Drink (cafe)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000031','a0000001-0000-4000-a000-000000000001','b1000001-0000-4000-b000-000000000001'), -- Eat · sea-view
  ('c0000001-0000-4000-a000-000000000031','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000001') -- Drink · cafe
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #32 Intz48 Coffee Roasters — Drink (cafe)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000032','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000001') -- Drink · cafe
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #33 Sunset Beach Bar — Drink (cocktail-bar, sea-view)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000033','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000003'), -- Drink · cocktail-bar
  ('c0000001-0000-4000-a000-000000000033','a0000001-0000-4000-a000-000000000002','b2000001-0000-4000-b000-000000000005') -- Drink · sea-view
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #34 Praia de São Roque — Do (water-sports, with-kids)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000034','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004'), -- Do · water-sports
  ('c0000001-0000-4000-a000-000000000034','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #35 Praia do Pópulo — Do (water-sports, with-kids)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000035','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000004'), -- Do · water-sports
  ('c0000001-0000-4000-a000-000000000035','a0000001-0000-4000-a000-000000000004','b4000001-0000-4000-b000-000000000006') -- Do · with-kids
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #36 Museu Carlos Machado — See (historic, rainy-day-ok)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000036','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000004'), -- See · historic
  ('c0000001-0000-4000-a000-000000000036','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000006') -- See · rainy-day-ok
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #37 Forte de São Brás — See (historic, rainy-day-ok)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000037','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000004'), -- See · historic
  ('c0000001-0000-4000-a000-000000000037','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000006') -- See · rainy-day-ok
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #38 Gruta do Carvão — See (volcanic-thermal, rainy-day-ok)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000038','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000003'), -- See · volcanic-thermal
  ('c0000001-0000-4000-a000-000000000038','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000006') -- See · rainy-day-ok
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #39 Miradouro da Mãe de Deus — See (viewpoint)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000039','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001') -- See · viewpoint
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- #40 The Place — host Miguel's own guesthouse (Fajã de Baixo). Host's pick,
-- with his own photos (owner-provided → no attribution). Self-hosted PWA
-- static assets at /media/the-place/.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES (
  'c0000001-0000-4000-a000-000000000040',
  '{"all": true}'::jsonb,
  '{"en": "The Place", "pt-PT": "The Place"}'::jsonb,
  '{"en": "Your host Miguel''s striking modern guesthouse in Fajã de Baixo — wood and glass, a private garden and sea views, in a calm, central setting a few minutes from Ponta Delgada.", "pt-PT": "A casa de hóspedes moderna e singular do anfitrião Miguel, em Fajã de Baixo — madeira e vidro, jardim privado e vista de mar, num ambiente tranquilo e central, a poucos minutos de Ponta Delgada."}'::jsonb,
  37.74979, -25.64545,
  'Alameda de Belém 121, Fajã de Baixo, Ponta Delgada, São Miguel, Açores',
  '{}'::jsonb,
  '[]'::jsonb,
  'published', true, 'manual'
) ON CONFLICT (id) DO NOTHING;

-- #40 The Place — See (garden)
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000040','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000005') -- See · garden
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #40 The Place — Miguel's own photos (hero + gallery), owner-provided (no attribution)
INSERT INTO catalog.place_media (id, place_id, kind, url, alt, attribution, sort_order) VALUES
  ('d0000001-0000-4000-a000-000000004001','c0000001-0000-4000-a000-000000000040','image','/media/the-place/01.jpg','{"en":"The Place — Fajã de Baixo","pt-PT":"The Place — Fajã de Baixo"}',NULL,1),
  ('d0000001-0000-4000-a000-000000004002','c0000001-0000-4000-a000-000000000040','image','/media/the-place/02.jpg','{"en":"The Place — Fajã de Baixo","pt-PT":"The Place — Fajã de Baixo"}',NULL,2),
  ('d0000001-0000-4000-a000-000000004003','c0000001-0000-4000-a000-000000000040','image','/media/the-place/03.jpg','{"en":"The Place — Fajã de Baixo","pt-PT":"The Place — Fajã de Baixo"}',NULL,3),
  ('d0000001-0000-4000-a000-000000004004','c0000001-0000-4000-a000-000000000040','image','/media/the-place/04.jpg','{"en":"The Place — Fajã de Baixo","pt-PT":"The Place — Fajã de Baixo"}',NULL,4),
  ('d0000001-0000-4000-a000-000000004005','c0000001-0000-4000-a000-000000000040','image','/media/the-place/05.jpg','{"en":"The Place — Fajã de Baixo","pt-PT":"The Place — Fajã de Baixo"}',NULL,5),
  ('d0000001-0000-4000-a000-000000004006','c0000001-0000-4000-a000-000000000040','image','/media/the-place/06.jpg','{"en":"The Place — Fajã de Baixo","pt-PT":"The Place — Fajã de Baixo"}',NULL,6)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- #41-43 Miguel's three Calheta-area guesthouses (Gaveto building / marina,
-- Ponta Delgada). Host's picks, with his own listing photos (owner-provided →
-- no attribution), self-hosted at /media/<slug>/. Coords + capacity from the
-- live listings. Real originals from the owner can replace these additively.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO catalog.place
  (id, guesthouse_scope, name, description, geom_lat, geom_lng, address, contacts, hours, status, is_hosts_pick, source_kind)
VALUES
  ('c0000001-0000-4000-a000-000000000041','{"all": true}'::jsonb,
   '{"en": "The Escape", "pt-PT": "The Escape"}'::jsonb,
   '{"en": "One of host Miguel''s apartments in the Gaveto building — a compact, modern stay for two, a five-minute walk from Ponta Delgada''s marina and old town.", "pt-PT": "Um dos apartamentos do anfitrião Miguel no edifício Gaveto — uma estadia moderna e compacta para dois, a cinco minutos a pé da marina e do centro histórico de Ponta Delgada."}'::jsonb,
   37.74210, -25.65990, 'Gaveto building, centro, Ponta Delgada, São Miguel, Açores',
   '{}'::jsonb, '[]'::jsonb, 'published', true, 'manual'),
  ('c0000001-0000-4000-a000-000000000042','{"all": true}'::jsonb,
   '{"en": "The View", "pt-PT": "The View"}'::jsonb,
   '{"en": "A bright two-bedroom apartment for four with views over Ponta Delgada and the Lagoa do Fogo, plus a shared pool, tennis court and children''s playground.", "pt-PT": "Um apartamento luminoso de dois quartos para quatro, com vista sobre Ponta Delgada e a Lagoa do Fogo, e ainda piscina partilhada, court de ténis e parque infantil."}'::jsonb,
   37.75574, -25.66849, 'Ponta Delgada, São Miguel, Açores',
   '{}'::jsonb, '[]'::jsonb, 'published', true, 'manual'),
  ('c0000001-0000-4000-a000-000000000043','{"all": true}'::jsonb,
   '{"en": "The View Point", "pt-PT": "The View Point"}'::jsonb,
   '{"en": "Another of host Miguel''s apartments in the Gaveto building — a calm, modern base for two in the heart of Ponta Delgada, steps from the marina.", "pt-PT": "Outro dos apartamentos do anfitrião Miguel no edifício Gaveto — uma base tranquila e moderna para dois no coração de Ponta Delgada, a poucos passos da marina."}'::jsonb,
   37.74200, -25.65990, 'Gaveto building, centro, Ponta Delgada, São Miguel, Açores',
   '{}'::jsonb, '[]'::jsonb, 'published', true, 'manual')
ON CONFLICT (id) DO NOTHING;

-- #41-43 See tags
INSERT INTO catalog.place_action_wish (place_id, action_id, wish_id) VALUES
  ('c0000001-0000-4000-a000-000000000041','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000004'), -- See · historic
  ('c0000001-0000-4000-a000-000000000042','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001'), -- See · viewpoint
  ('c0000001-0000-4000-a000-000000000043','a0000001-0000-4000-a000-000000000003','b3000001-0000-4000-b000-000000000001') -- See · viewpoint
ON CONFLICT (place_id, action_id, wish_id) DO NOTHING;

-- #41-43 owner photos (hero + gallery)
INSERT INTO catalog.place_media (id, place_id, kind, url, alt, attribution, sort_order) VALUES
  ('d0000001-0000-4000-a000-000000004101','c0000001-0000-4000-a000-000000000041','image','/media/the-escape/01.jpg','{"en":"The Escape","pt-PT":"The Escape"}',NULL,1),
  ('d0000001-0000-4000-a000-000000004102','c0000001-0000-4000-a000-000000000041','image','/media/the-escape/02.jpg','{"en":"The Escape","pt-PT":"The Escape"}',NULL,2),
  ('d0000001-0000-4000-a000-000000004103','c0000001-0000-4000-a000-000000000041','image','/media/the-escape/03.jpg','{"en":"The Escape","pt-PT":"The Escape"}',NULL,3),
  ('d0000001-0000-4000-a000-000000004104','c0000001-0000-4000-a000-000000000041','image','/media/the-escape/04.jpg','{"en":"The Escape","pt-PT":"The Escape"}',NULL,4),
  ('d0000001-0000-4000-a000-000000004201','c0000001-0000-4000-a000-000000000042','image','/media/the-view/01.jpg','{"en":"The View","pt-PT":"The View"}',NULL,1),
  ('d0000001-0000-4000-a000-000000004202','c0000001-0000-4000-a000-000000000042','image','/media/the-view/02.jpg','{"en":"The View","pt-PT":"The View"}',NULL,2),
  ('d0000001-0000-4000-a000-000000004203','c0000001-0000-4000-a000-000000000042','image','/media/the-view/03.jpg','{"en":"The View","pt-PT":"The View"}',NULL,3),
  ('d0000001-0000-4000-a000-000000004204','c0000001-0000-4000-a000-000000000042','image','/media/the-view/04.jpg','{"en":"The View","pt-PT":"The View"}',NULL,4),
  ('d0000001-0000-4000-a000-000000004301','c0000001-0000-4000-a000-000000000043','image','/media/the-view-point/01.jpg','{"en":"The View Point","pt-PT":"The View Point"}',NULL,1),
  ('d0000001-0000-4000-a000-000000004302','c0000001-0000-4000-a000-000000000043','image','/media/the-view-point/02.jpg','{"en":"The View Point","pt-PT":"The View Point"}',NULL,2),
  ('d0000001-0000-4000-a000-000000004303','c0000001-0000-4000-a000-000000000043','image','/media/the-view-point/03.jpg','{"en":"The View Point","pt-PT":"The View Point"}',NULL,3),
  ('d0000001-0000-4000-a000-000000004304','c0000001-0000-4000-a000-000000000043','image','/media/the-view-point/04.jpg','{"en":"The View Point","pt-PT":"The View Point"}',NULL,4)
ON CONFLICT (id) DO NOTHING;

-- Seasonal-operation flag: mark the genuinely summer-season spots (the Vila
-- Franca islet ferry, the beaches, the sea pool, the beach bar) so the
-- place-detail Details card surfaces a "best season" row (T-2.D follow-up:
-- catalog → bff → pwa season plumbing). Idempotent; safe to re-run.
UPDATE catalog.place SET season = 'summer'
WHERE id IN (
  'c0000001-0000-4000-a000-000000000009',  -- Ilhéu Vila Franca do Campo (summer ferry)
  'c0000001-0000-4000-a000-000000000010',  -- Praia de Santa Bárbara
  'c0000001-0000-4000-a000-000000000011',  -- Praia dos Mosteiros
  'c0000001-0000-4000-a000-000000000023',  -- Bar Caloura (sea pool)
  'c0000001-0000-4000-a000-000000000033',  -- Sunset Beach Bar
  'c0000001-0000-4000-a000-000000000034',  -- Praia de São Roque
  'c0000001-0000-4000-a000-000000000035'   -- Praia do Pópulo
);
