-- actions-wishes.sql — Raw SQL form of the action/wish seed.
-- Authority: seeds/dev.ts (TypeScript is canonical; regenerate this file when the seed changes).
-- Apply: psql -U catalog_svc -d dailytour -f seeds/actions-wishes.sql
-- Taxonomy source: docs/exploration/05-tourism-domain.md §3

INSERT INTO catalog.action (id, slug, i18n, sort_order, icon) VALUES
  ('a0000001-0000-4000-a000-000000000001', 'eat',   '{"en":"Eat","pt-PT":"Comer"}',     1, 'utensils'),
  ('a0000001-0000-4000-a000-000000000002', 'drink', '{"en":"Drink","pt-PT":"Beber"}',   2, 'wine'),
  ('a0000001-0000-4000-a000-000000000003', 'see',   '{"en":"See","pt-PT":"Ver"}',        3, 'eye'),
  ('a0000001-0000-4000-a000-000000000004', 'do',    '{"en":"Do","pt-PT":"Fazer"}',       4, 'activity'),
  ('a0000001-0000-4000-a000-000000000005', 'buy',   '{"en":"Buy","pt-PT":"Comprar"}',   5, 'shopping-bag'),
  ('a0000001-0000-4000-a000-000000000006', 'move',  '{"en":"Move","pt-PT":"Deslocar"}', 6, 'car')
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog.wish (id, action_id, slug, i18n, sort_order) VALUES
  -- Eat
  ('b1000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-a000-000000000001', 'sea-view',   '{"en":"Sea view","pt-PT":"Vista para o mar"}',                  1),
  ('b1000001-0000-4000-b000-000000000002', 'a0000001-0000-4000-a000-000000000001', 'traditional','{"en":"Traditional (cozido/bife/lapas)","pt-PT":"Tradicional (cozido/bife/lapas)"}', 2),
  ('b1000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-a000-000000000001', 'vegetarian', '{"en":"Vegetarian","pt-PT":"Vegetariano"}',                      3),
  ('b1000001-0000-4000-b000-000000000004', 'a0000001-0000-4000-a000-000000000001', 'romantic',   '{"en":"Romantic","pt-PT":"Romântico"}',                     4),
  ('b1000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-a000-000000000001', 'family',     '{"en":"Family-friendly","pt-PT":"Família"}',               5),
  ('b1000001-0000-4000-b000-000000000006', 'a0000001-0000-4000-a000-000000000001', 'quick-local','{"en":"Quick & local","pt-PT":"Rápido e local"}',          6),
  -- Drink
  ('b2000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-a000-000000000002', 'cafe',              '{"en":"Café","pt-PT":"Café"}',                        1),
  ('b2000001-0000-4000-b000-000000000002', 'a0000001-0000-4000-a000-000000000002', 'wine-local-liqueur','{"en":"Wine / local liqueur","pt-PT":"Vinho / licor local"}',2),
  ('b2000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-a000-000000000002', 'cocktail-bar',      '{"en":"Cocktail bar","pt-PT":"Bar de cocktails"}',             3),
  ('b2000001-0000-4000-b000-000000000004', 'a0000001-0000-4000-a000-000000000002', 'live-music',        '{"en":"Live music","pt-PT":"Música ao vivo"}',            4),
  ('b2000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-a000-000000000002', 'sea-view',          '{"en":"Sea view","pt-PT":"Vista para o mar"}',                 5),
  ('b2000001-0000-4000-b000-000000000006', 'a0000001-0000-4000-a000-000000000002', 'late',              '{"en":"Late night","pt-PT":"Noite"}',                          6),
  -- See
  ('b3000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-a000-000000000003', 'viewpoint',     '{"en":"Viewpoint","pt-PT":"Miradouro"}',                   1),
  ('b3000001-0000-4000-b000-000000000002', 'a0000001-0000-4000-a000-000000000003', 'lake-crater',   '{"en":"Lake / crater","pt-PT":"Lagoa / cratera"}',        2),
  ('b3000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-a000-000000000003', 'volcanic-thermal','{"en":"Volcanic / thermal","pt-PT":"Vulcânico / termal"}', 3),
  ('b3000001-0000-4000-b000-000000000004', 'a0000001-0000-4000-a000-000000000003', 'historic',      '{"en":"Historic","pt-PT":"Histórico"}',               4),
  ('b3000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-a000-000000000003', 'garden',        '{"en":"Garden","pt-PT":"Jardim"}',                        5),
  ('b3000001-0000-4000-b000-000000000006', 'a0000001-0000-4000-a000-000000000003', 'rainy-day-ok',  '{"en":"Rainy-day OK","pt-PT":"Bom para chuva"}',          6),
  -- Do
  ('b4000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-a000-000000000004', 'hike',         '{"en":"Hike","pt-PT":"Trilho"}',                           1),
  ('b4000001-0000-4000-b000-000000000002', 'a0000001-0000-4000-a000-000000000004', 'thermal-soak', '{"en":"Thermal soak","pt-PT":"Termas"}',                   2),
  ('b4000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-a000-000000000004', 'whale-dolphin','{"en":"Whale & dolphin","pt-PT":"Baleias e golfinhos"}',   3),
  ('b4000001-0000-4000-b000-000000000004', 'a0000001-0000-4000-a000-000000000004', 'water-sports', '{"en":"Water sports","pt-PT":"Desportos náuticos"}',  4),
  ('b4000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-a000-000000000004', 'scenic-drive', '{"en":"Scenic drive","pt-PT":"Percurso panorâmico"}', 5),
  ('b4000001-0000-4000-b000-000000000006', 'a0000001-0000-4000-a000-000000000004', 'with-kids',    '{"en":"With kids","pt-PT":"Com crianças"}',           6),
  -- Buy
  ('b5000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-a000-000000000005', 'tea-pineapple-liqueur','{"en":"Tea / pineapple / liqueur","pt-PT":"Chá / ananás / licor"}', 1),
  ('b5000001-0000-4000-b000-000000000002', 'a0000001-0000-4000-a000-000000000005', 'cheese-canned-fish',  '{"en":"Cheese / canned fish","pt-PT":"Queijo / conservas"}',                  2),
  ('b5000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-a000-000000000005', 'crafts-ceramics',     '{"en":"Crafts / ceramics","pt-PT":"Artesanato / cerâmica"}',             3),
  ('b5000001-0000-4000-b000-000000000004', 'a0000001-0000-4000-a000-000000000005', 'bookstore',           '{"en":"Bookstore","pt-PT":"Livraria"}',                                       4),
  ('b5000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-a000-000000000005', 'supermarket',         '{"en":"Supermarket","pt-PT":"Supermercado"}',                                 5),
  ('b5000001-0000-4000-b000-000000000006', 'a0000001-0000-4000-a000-000000000005', 'pharmacy',            '{"en":"Pharmacy","pt-PT":"Farmácia"}',                                   6),
  -- Move
  ('b6000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-a000-000000000006', 'car-rental',       '{"en":"Car rental","pt-PT":"Aluguer de carro"}',          1),
  ('b6000001-0000-4000-b000-000000000002', 'a0000001-0000-4000-a000-000000000006', 'taxi-transfer',    '{"en":"Taxi / transfer","pt-PT":"Táxi / transfer"}', 2),
  ('b6000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-a000-000000000006', 'gas-station',      '{"en":"Gas station","pt-PT":"Posto de combustível"}',3),
  ('b6000001-0000-4000-b000-000000000004', 'a0000001-0000-4000-a000-000000000006', 'airport-shuttle',  '{"en":"Airport shuttle","pt-PT":"Shuttle aeroporto"}',    4),
  ('b6000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-a000-000000000006', 'scenic-route-stop','{"en":"Scenic-route stop","pt-PT":"Paragem panorâmica"}', 5),
  ('b6000001-0000-4000-b000-000000000006', 'a0000001-0000-4000-a000-000000000006', 'ev-charger',       '{"en":"EV charger","pt-PT":"Carregador elétrico"}',  6)
ON CONFLICT (id) DO NOTHING;
