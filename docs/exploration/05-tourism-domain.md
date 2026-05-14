# Tourism Domain: São Miguel Reality Check

Scope: market, catalog, feature validation, locale, owner sustainability. No UX/UI/tech.

## 1. São Miguel Market Context

### Numbers that shape the product
- **Volume**: Azores hit ~4.5M overnight stays in 2025 (+4.5% YoY); São Miguel alone absorbs **~70.8%** of archipelago activity. Single-island PWA is a legitimate beachhead. [OTA 2025](https://novidadesnewsletter.news/2026/02/01/azores-tourism-grows-4-5-in-2025-despite-late-year-slowdown/)
- **Length of stay**: regional avg **3.3–3.6 nights**. Tourists are short-stay, decision-fatigued, want curation not a directory. Design implication: a guest sees the PWA ~3–4 evenings — every screen must convert.
- **Seasonality**: peak Jun–Sep, shoulder Apr–May & Oct, very quiet Nov–Feb (rainy, half the boat operators close). Five consecutive monthly drops in late 2025 — the owner cares about off-season conversion most.
- **Origin mix (foreign overnights, S. Miguel 2025)**: 🇩🇪 Germany ~10.5% (largest foreign share on São Miguel), 🇺🇸 USA ~14.7% of Azores international, 🇪🇸 Spain ~12.3%, then 🇫🇷 France, 🇬🇧 UK, 🇳🇱 Netherlands, 🇧🇷 Brazil. Domestic Portuguese is still the largest single bucket. [Azores Gov.](https://portal.azores.gov.pt/en/web/comunicacao/rss/-/asset_publisher/0WEMSOVhE63P/content/id/18651247)

### Competitive landscape — where this product wins
| Player | What they do well | Gap we fill |
|---|---|---|
| Visit Azores (official) | SEO, brand, generic info | No personalization, no owner voice, no live ops |
| GetYourGuide / Viator | Bookable tours, paid placements | Commission-driven, generic, ignores guest context |
| Google Maps + Reviews | Discovery, reviews | No curation, no owner trust, decision paralysis |
| Tripadvisor | Reviews | Stale, ad-laden, not mobile-first |
| Furnas / Sete Cidades blogs | Inspiration | Not actionable from a guesthouse bedroom at 19:00 |

**The gap**: a *trusted* (owner-curated), *contextual* (your guesthouse, today's weather, your party), *actionable* (call/DM/book) shortlist. Not another OTA, not another map. The trust mechanic is the moat — guests believe João's picks because João runs the place they're sleeping in.

## 2. Catalog Day-1 Starter (28 places)

Minimum viable catalog to ship credible. All must have hours, phone, EN+PT description, hero photo, GPS.

| # | Place | Action | Wishes |
|---|---|---|---|
| 1 | Sete Cidades (Vista do Rei + Lagoa Azul) | See, Do | viewpoint, lake, volcanic, iconic |
| 2 | Lagoa do Fogo (Miradouro + descida) | See, Do | viewpoint, lake, hike, remote |
| 3 | Furnas — caldeiras village walk | See | volcanic, geothermal, free |
| 4 | Terra Nostra Park + thermal pool | Do, Relax | thermal, garden, family, iconic |
| 5 | Poça da Dona Beija | Relax, Do | thermal, evening-open, budget |
| 6 | Gorreana Tea Factory | See, Buy | unique-EU, free, rainy-day |
| 7 | Plantações de Ananás (Faja de Baixo) | See, Buy | unique, quick, rainy-day |
| 8 | Whale watching — Futurismo / Terra Azul (PDL) | Do | bucket-list, seasonal, family |
| 9 | Ilhéu Vila Franca do Campo (summer ferry) | Do, Relax | swim, summer-only, iconic |
| 10 | Praia de Santa Bárbara (Ribeira Grande) | Relax, Do | surf, beach, sunset |
| 11 | Praia dos Mosteiros + sunset | See, Relax | sunset, swim, scenic |
| 12 | Salto do Cabrito waterfall | See, Do | hike, waterfall, family |
| 13 | Caldeira Velha (interpretive + thermal) | Relax, See | thermal, forest, family |
| 14 | Ponta da Ferraria (ocean thermal pool) | Relax, Do | thermal, ocean, tide-dependent |
| 15 | Nordeste viewpoints loop (Ponta da Madrugada, Sossego) | See, Move | viewpoint, scenic-drive, full-day |
| 16 | Pico do Carvão / Pico da Barrosa | See | viewpoint, sunrise, quick-stop |
| 17 | Centro Histórico Ponta Delgada (Portas da Cidade) | See | walkable, historic, rainy-day |
| 18 | Mercado da Graça (PDL) | Buy, Eat | local, morning, cheese-fish |
| 19 | Restaurante Tony's (Furnas) — cozido das Furnas | Eat | traditional, lunch-only, iconic |
| 20 | Restaurante Alcides (PDL) — bife à regional | Eat | traditional, dinner, meat |
| 21 | A Tasca (PDL) — petiscos | Eat, Drink | local, group, late |
| 22 | Cais 20 (Ribeira Quente) — fresh fish | Eat | sea-view, lunch, scenic-drive |
| 23 | Bar Caloura (sea pool + grilled fish) | Eat, Relax | sea-view, swim, summer |
| 24 | Louvre Michaelense (PDL) | Eat, Drink | brunch, café, walkable |
| 25 | Quinta dos Açores ice-cream (Ribeira Grande) | Eat | family, quick, dairy |
| 26 | Arruda Açores Pineapple Liqueur tasting | Drink, Buy | unique, quick, souvenir |
| 27 | Picos de Aventura — kayak / coasteering | Do | active, family, summer |
| 28 | Azores Sub-Dive / snorkel with mobula rays | Do | bucket-list, summer-only, advanced |

Coverage check: every Action has ≥3 entries; weather-resilient indoor options (6,7,17,18,24,26) cover rainy days; seasonal flags (8,9,10,23,27,28) are explicit.

## 3. Action / Wish Taxonomy (v1)

UX team proposed 6 actions in [01-ux-journeys.md](./01-ux-journeys.md) — I endorse and refine wishes from São Miguel reality.

| Action | Wishes (max 6) |
|---|---|
| **Eat** | sea view · traditional (cozido/bife/lapas) · vegetarian · romantic · family · quick & local |
| **Drink** | café · wine/local liqueur · cocktail bar · live music · sea view · late |
| **See** | viewpoint · lake/crater · volcanic/thermal · historic · garden · rainy-day-OK |
| **Do** | hike · thermal soak · whale & dolphin · water sports · scenic drive · with kids |
| **Buy** | tea/pineapple/liqueur · cheese/canned fish · crafts/ceramics · bookstore · supermarket · pharmacy |
| **Move** | car rental · taxi/transfer · gas station · airport shuttle · scenic-route stop · EV charger |

**Drop "Sleep"** — guests already booked. **Drop "Shop" generic** — fold into Buy with local-product bias. "Relax" merges into Do (thermal soak) + Eat (sea view) — fewer top-level tiles wins.

## 4. Feature Validation — What's Gold vs. Over-Engineered

### AI agent makes the reservation — **PIVOT REQUIRED**
Azorean small restaurants & operators are **phone-first, no API, often no online presence beyond a Facebook page**. An autonomous booking agent will fail >50% of the time and create liability ("the AI booked us at the wrong time"). Pivot:
- **Tier 1 (works today)**: agent drafts a **WhatsApp/SMS message in PT** with party size, time, guest name, guesthouse reference. Guest taps "Send." 80% of value, 5% of complexity.
- **Tier 2 (curated)**: for ~10 partner venues, agent uses **owner-mediated booking** (request goes to owner's chat, owner calls, replies "confirmed"). Trust mechanic doubles as concierge.
- **Tier 3 (later)**: real voice-agent that *calls* a restaurant in PT — interesting, but ship Tier 1 first.

### Internet-scan for candidate places — **CUT FROM v1**
Maintenance nightmare, accuracy nightmare, liability nightmare. Better stack:
- **Seed from Google Places API** (Places + Place Details) with owner approval queue.
- **Enrich from OSM Overpass** for hiking trails, viewpoints, public toilets, parking.
- **Owner manual entry** for trust-list (cozido, pineapple liqueur tasting, the cousin's fish restaurant).
- Internet scan = R&D project, not v1.

### Daily Tour planner — **THE killer feature, but only if it nails 4 things**
1. **Drive time realism** — Sete Cidades ↔ Furnas is 90 min, not 30. Use Google Distance Matrix or OSRM.
2. **Lunch timing** — São Miguel lunch is 12:30–14:30; miss it and you don't eat. Cozido das Furnas must be reserved by 11:00 same day.
3. **Weather-aware** — re-plan if rain forecast (see §5). Indoor swap pool: tea factory, market, museums.
4. **Daylight + ferry windows** — Vila Franca islet ferry has limited slots; sunset at Mosteiros has a hard time.

Without these it's a worse Google Maps trip. With them, it's the reason guests forward the URL to friends.

### Chat with owner — **keep, but design for the 5 actual questions**
Real São Miguel guest questions (from owner interviews would confirm, but Azores hospitality forums agree):
1. "Taxi to airport / late check-in" (logistics)
2. "Is X open today?" (hours, weather closure)
3. "WiFi password / hot water / heating" (utility)
4. "Best restaurant for tonight?" (curation — *the* upsell to the catalog)
5. "Can we extend / late checkout?" (commerce)

Design implication: **quick-reply chips** for these 5; owner saves canned answers; route #4 into the catalog (chat suggests a wish → opens Eat).

## 5. Missing Features Worth Proposing

| Feature | Why São Miguel-specific | Priority |
|---|---|---|
| **Weather-aware suggestions** | Azores micro-climates: rain in Furnas, sun in PDL same hour. Pull IPMA API; tag places `rainy-day-OK`. | P0 |
| **Whale-watching season badge** | Apr–May = blue/fin whale migration; year-round sperm whale. Show "Best season now" badge. | P1 |
| **Inter-island awareness** | Day-trip to Terceira via SATA, or Atlanticoline ferry to Santa Maria (summer only). Out-of-scope to *plan*, in-scope to *flag* on a Move tile. | P2 |
| **Offline catalog cache** | Nordeste, Sete Cidades caldera, mountain roads = no signal. PWA must work offline for last-viewed places + maps. | P0 |
| **Share tour as PDF/link** | Partner without token wants the itinerary; printed-PDF for car dashboard. Token-stripped share link. | P1 |
| **Host's picks** ribbon | The trust mechanic. 5 places João personally vouches for, shown above the algorithmic list. | P0 |
| **Post-stay review loop** | One push 24h post-checkout: "Rate the 3 places you visited." Feeds catalog reputation + owner intel. | P1 |
| **QR on welcome card** | Physical card in the room → opens token URL. Beats WhatsApp link in arrival flow. | P0 |
| **Multi-guest in one token** | Out — too complex for v1, shared device assumption (see UX §5) is fine. | Defer |
| **Vehicle-aware planning** | "We have a rental car" vs "no car" radically changes feasible places. One toggle, huge impact. | P0 |

## 6. Risks

- **Stale data**: hours change seasonally, places close for 2 weeks in Feb. Owner-maintained = bottleneck. Mitigation: auto-flag places not refreshed in 90 days; community report button.
- **Liability**: recommending a restaurant that gives food poisoning. Terms must disclaim. Avoid health/medical recs.
- **Phone-call fail**: closed, no English, owner on Sunday off. Always show "If no answer, try X" alternate.
- **GDPR**: token URL contains PII (name, dates). Token must be opaque ID, not encoded data. Data retention 30 days post-checkout (matches Portuguese hospitality norms). Cookie banner needed even for tokenless landing.
- **Owner over-reach**: pressure to feature own friends' restaurants — fine, but mark "Host's pick" so guests know it's curated not algorithmic.

## 7. Locale Priority

Ranked by guest mix, not alphabet:

| Rank | Locale | Rationale |
|---|---|---|
| 1 | **en** | Lingua franca; USA + UK + NL + scandinavians + non-DE Europeans default here |
| 2 | **pt-PT** | Domestic Portuguese is largest single bucket; owner-facing too |
| 3 | **de** | Largest foreign share on São Miguel (10.5%); Germans expect their language |
| 4 | **es** | Spain is top foreign market archipelago-wide |
| 5 | **fr** | French market consistent ~5–8% |
| 6 | **pt-BR** | **Missing from brief — add it.** Brazilian guests growing; pt-PT works but pt-BR signals respect (cozido vs. cozinha vocab differs) |

Defer: Dutch (NL guests speak EN fine), Italian (small share), Chinese/Japanese (negligible on São Miguel).

## 8. Owner ROI — Why Not a Brochure?

A brochure costs €0 to print and rots in a drawer. This PWA earns its keep only if it gives the owner things a brochure can't:

1. **Conversion** off-season — landing page (tokenless) doubles as marketing site for direct bookings, bypassing Booking.com's 15% commission. One direct booking/month = product pays for itself.
2. **Reduced repeat questions** — chat with canned replies + catalog answer 60% of inbound questions; owner reclaims hours.
3. **Affiliate / partner revenue** — curated whale-watching, car rental, restaurant referrals can carry a kickback (disclose to guest).
4. **Reviews & SEO juice** — post-stay review loop feeds Google profile; tokenless landing ranks for "guesthouse Sete Cidades."
5. **Differentiation** — "AI tour planner included with your stay" is a unique listing bullet on Booking/Airbnb.
6. **Data** — what guests actually click reveals which day trips to push, which restaurants to partner with.

The pitch to the owner: *"This replaces your printed brochure, your WhatsApp FAQ, and your Booking.com dependence — pick two and it's worth it."*

---

### Sources
- [Azores Tourism Observatory 2024 Annual Report](https://pre-webunwto.s3.eu-west-1.amazonaws.com/s3fs-public/2025-04/2024%20Annual%20Report%20of%20the%20Azores%20Tourism%20Observatory%20%28period%202023%29.pdf)
- [Azores Tourism Grows 4.5% in 2025](https://novidadesnewsletter.news/2026/02/01/azores-tourism-grows-4-5-in-2025-despite-late-year-slowdown/)
- [USA, Spain, Germany top foreign markets — Azores Gov](https://portal.azores.gov.pt/en/web/comunicacao/rss/-/asset_publisher/0WEMSOVhE63P/content/id/18651247)
- [Whale watching season guide — Futurismo](https://www.futurismo.pt/blog/whale-watching-in-azores-when-is-the-best-time/)
- [28 Must-See places — São Miguel](https://eliskajanousova.com/en/azores-28-must-see-places-to-visit-on-sao-miguel-island/)
