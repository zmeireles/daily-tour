# 06 — Devil's Advocate: Why This Will Fail Unless We Cut Hard

This document attacks the brief. The other five teammates carry the positive case. Read it as the "wait" voice in the room.

## 1. Existential Threats to the Premise

### Guests won't open it

Tourists arriving in São Miguel already have: Google Maps (reviews, hours, navigation, photos), Instagram/TikTok (aspirational discovery), the owner's printed sheet on the kitchen table, and the dog-eared Lonely Planet PDF. The brief asks them to add a sixth tool — a PWA, accessed via a URL with a token, that requires opening a browser, granting location, choosing a locale, and learning a new grouping ontology ("action" vs "wish") that nobody outside this repo uses.

Friction to first useful screen: receive token, open link, decline notification prompt, allow location, wait for catalog to hydrate. Value at the end: a curated list the owner could have texted in WhatsApp in 30 seconds. The PWA loses to the WhatsApp message every time. Conversion past day-2 will be in single digits.

### Owners won't maintain it

The buyer is "small Azorean B&B owner with 4 properties." That person already juggles Booking.com, Airbnb, cleaning rotas, breakfast supplies, and guest check-ins at 23:00. The brief asks them to additionally: curate places, approve internet-scanned candidates, write multilingual descriptions (or trust the LLM and proofread five locales), configure Authentik users, answer real-time chat across Telegram + WhatsApp + in-app, keep phone availability toggles current, upload personal photo/video. Month 1: enthusiasm. Month 2: stale catalog, ignored chats, the system rots. The product dies of owner attrition before guest attrition.

### "Daily Tour" AI plans don't get used

Google Trips shipped in 2016 and was killed in 2019. Mindtrip, Layla, Wonderplan, Roam Around — every demo wows, every retention curve flatlines. Tourists love the AI tour at the planning stage (at home, on the couch) and ignore it on the ground (where weather, mood, kid tantrums, and "that café looks nice" dominate). On-site, they want a single answer to "what's open and good within 15 minutes," not a 9-stop itinerary. We will spend two months on the planner and watch it generate <0.5 plans per guest-stay.

## 2. Scope-Creep Landmines Hidden in Bullet Points

- **"Internet-scan for candidate places"**: this is a crawler + source whitelist + dedup + entity-resolution + quality-score + freshness-decay subsystem. Realistic cost: 6–10 engineer-weeks for a v1 that finds anything useful, then perpetual maintenance as sources change DOM. Disguised in the brief as one line.
- **"AI agent makes the reservation"**: pure hand-wave. Who is liable when the agent double-books? What happens when the restaurant doesn't answer the phone — does the agent hallucinate a confirmation? GDPR implications of an agent acting on the guest's behalf? No restaurant in Furnas accepts API bookings. Cut this entirely or ship "draft a DM I send myself."
- **Channel-agnostic chat (Telegram + WhatsApp + in-app)**: WhatsApp Business API requires Meta business verification, a template-message approval workflow, and a BSP relationship — 3–6 weeks calendar time before a single message flows, plus per-conversation fees. Telegram bot is easy; in-app needs WebSocket infra and offline reconciliation. Each channel is weeks. The brief treats the abstraction as free.
- **Microservices + RabbitMQ from day 1**: premature. A modular monolith with clear module boundaries gives the same future-extraction option at one-tenth the operational burden. RabbitMQ on day 1 is a solution looking for a problem — what async workload exists on day 1 that Postgres LISTEN/NOTIFY or a cron job can't handle? Pivot to a single Node or Python service with internal modules, extract services when load or team size demands it.

## 3. Architecture — Over-Engineered for the Problem Size

- **Pgvector + RAG + LLM for a place catalog of probably <500 entries**: a Postgres `tsvector` index plus tag joins serves this for two years. Vector search is the right answer when fuzzy semantic matching beats keyword + filter; on a 500-row curated catalog with categorical tags ("dinner", "sea_view", "vegan"), it doesn't. We're adding pgvector because it's fashionable.
- **n8n + Authentik + RabbitMQ + MinIO + Postgres + pgvector + multi-language backends = 7 moving parts before product line 1**. Each is an upgrade path, a CVE feed, a backup story, a restore drill. Bus factor: 1. When the owner-engineer takes a week off, the stack rots. Authentik in particular is overkill — magic-link auth on a token in the URL is 50 lines of code.
- **PWA-only, no SSR, token-in-URL**: token-in-URL leaks via screenshots (guests share their itinerary on Instagram — token visible), browser history, referer headers, and ill-configured logs. The brief forbids SSR (no Next/TanStack Start), so SEO for the public landing is dead — fine, accept that, but then the public landing has no acquisition story at all. Use token-as-fragment (`#t=...`) or POST-exchange for a session cookie on first load. The brief gets this wrong.

## 4. UX Traps

- **"Customizable lists with grouping/sort/stars"** — a settings surface no tourist will touch. Tourists are on day 2 of a 4-day stay; they will never open the sort menu. Ship one good default, kill the knobs.
- **Voice input** — useless in a windy Sete Cidades viewpoint or a noisy Ponta Delgada restaurant. Demos great, used <5% in field. Don't headline it.
- **Five locales day 1 (pt-PT, en, fr, es, de)**: translation cost for the UI is small; the place catalog descriptions are the trap. 500 places × 5 locales × ongoing edits = a translation-management problem nobody owns. Pt-PT vs pt-BR nuance alone will trigger user complaints. Ship en + pt-PT, add others only when a guesthouse books a German-speaking guest who complains.

## 5. Business Model Gaps

The brief is silent on **who pays**. Owner-pays-per-property caps the market at small operators who can least afford SaaS. Per-guest-night is a metering and billing system nobody scoped. Free-with-ads ruins the UX premise. Affiliate revenue from restaurant/activity bookings is mythical in the Azores ecosystem — most local restaurants don't have online bookings to affiliate with. Without a pricing model we cannot size the LLM cost ceiling, the support cost ceiling, or the feature cut line. **Decide pricing before architecture, not after.**

## 6. Hidden Ongoing Costs the Brief Ignores

- **Place-data freshness**: hours, closures, ownership changes. This is manual labor forever — budget owner-hours/week.
- **LLM spend per Daily Tour plan**: 10–30¢ per generation × N guests × retry rate. At 200 guests/month with 2 plans each = $40–120/mo just for tour generation, before chat-summarization, translation, or place enrichment costs.
- **Map tiles**: Mapbox/Google Maps pricing scales with map loads. OSM tiles are free but require self-hosting or a tile provider — another moving part.
- **Translation maintenance**: 5 locales × growing catalog × every owner edit triggers a re-translation review.
- **WhatsApp Business API**: per-conversation fees + BSP markup + template approval cycles.
- **On-call for real-time chat**: "real-time" implies SLA. Who's on-call at 22:00 when the WhatsApp bridge goes down?

## 7. Riskiest Assumptions, Ranked

1. **Guests will open a PWA when WhatsApp + Google Maps already cover 90% of needs.** Invalidated by: a 2-week paper test where the owner gives 10 guests a printed token and we measure opens + return visits. If <40% open it twice, the premise is dead.
2. **One owner will maintain the catalog across 4 properties indefinitely.** Invalidated by: month-3 catalog audit showing >20% stale entries.
3. **AI Daily Tour plans drive engagement on-site.** Invalidated by: instrumented sessions showing <15% of guests generate a plan and <30% of generated plans get any "started" event.
4. **Channel-agnostic chat is worth the integration cost vs "owner's WhatsApp number, click to open."** Invalidated by: A/B between deep-link and integrated chat — if deep-link converts equal-or-better, kill the bridge.
5. **Internet-scan adds catalog value over manual curation.** Invalidated by: 1-week timeboxed scan prototype that produces <50 approval-worthy candidates.

## 8. Counter-Proposal: The v0.5 MVP

Ship a **single-page static site per guesthouse**, generated from a YAML file the owner edits in a Git repo (or a Google Sheet via a build step). Each guest gets a token-fragment URL (`/g/<slug>#t=...`) that unlocks an "owner says hello" section and a "contact owner on WhatsApp" deep-link button. The page lists 20–40 hand-picked places grouped by 4 hardcoded actions (eat, swim, walk, view), filterable by distance from the guesthouse. No login, no Authentik, no RabbitMQ, no microservices, no pgvector, no AI tour, no internet-scan, no in-app chat. Two locales: en + pt-PT. Deploy: one Docker container, one Postgres, one Caddy. **What it teaches**: do guests actually open the link twice? Does the owner keep the YAML fresh past month 2? Do guests ever click the "contact owner" button vs just texting the WhatsApp number on the fridge? Answers to those three questions decide whether the full brief is worth building — and cost two engineer-weeks instead of six engineer-months.
