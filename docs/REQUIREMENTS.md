# Daily Tour — Requirements

> Source of truth for *what* this product is and *what it must do*. Architecture, design and stack are referenced — not duplicated.
> Synthesized from: [`IDEA.md`](./IDEA.md) + the 6 exploration reports in [`docs/exploration/`](./exploration/).
> Last update: 2026-05-14.

---

## 1. Vision

A **token-gated PWA** for tourists staying at guesthouses on São Miguel (Azores) that turns the owner's tacit knowledge — *"where do I send my guest for dinner near the sea?"* — into a curated, contextual, multilingual companion. Guests get a personalised landing on arrival; the owner gets fewer repeat WhatsApp questions and a credible direct-booking marketing site for the off-season.

**The product wins by being *trusted*, *contextual*, and *actionable*** — not by being another OTA or another map. (See [`05-tourism-domain.md §1`](./exploration/05-tourism-domain.md).)

### 1.1 Non-goals (v1)

These are out-of-scope by deliberate choice. Revisit only after demand is proven.

- **Autonomous reservation booking.** Replaced by *draft-and-handoff* messaging. ([`06-devils-advocate.md §2`](./exploration/06-devils-advocate.md), [`05-tourism-domain.md §4`](./exploration/05-tourism-domain.md))
- **Internet-scan crawler for candidate places.** Replaced by Google Places + OSM Overpass + owner curation.
- **Multi-island.** São Miguel only — single-island MVP.
- **Native mobile apps.** PWA + Add-to-Home-Screen only.
- **Multi-tenant self-service onboarding.** The first customer is the brief's owner; admin onboarding is manual.
- **SEO-driven SSR.** Brief forbids Next.js / TanStack SSR. The public landing optimises for direct traffic + paid acquisition, not organic ranking.
- **Billing / pricing engine.** Pricing model is unresolved (see [`§11`](#11-open-questions--decisions-pending)); ship cost-bounded v1 first.

---

## 2. Personas

| ID | Persona | Mode | Notes |
|----|---------|------|-------|
| P1 | **Premium Guest "Marta"** | Token URL | Primary. 3–4 nights, phone-first, decision-fatigued, on roaming. Must reach a place list in ≤3 taps from the WhatsApp link. ([01 §1](./exploration/01-ux-journeys.md)) |
| P2 | **Public Visitor "Tom"** | Bare domain | Considering a stay. Sees brand, sample places, owner pitch, contact CTA. Blocked: chat, daily tour, agent, per-guest data. |
| P3 | **Owner "João"** | Authentik SSO → Backoffice | Manages 3 guesthouses. Lives in the backoffice; in the guest PWA he is a *responsive recipient* (chat, voice toggle, bio). |

---

## 3. Decision Log — Key Calls from Exploration

These are the load-bearing decisions. Future contributors: change with care.

| # | Decision | Rationale |
|---|---------|-----------|
| D1 | **6 top-level Actions**: Eat · Drink · See · Do · Buy · Move. "Sleep" excluded (guests already lodged). "Relax" merged into Do/Eat. | Hick's-law cap on a 3×2 phone tile grid; matches São Miguel guest needs. ([01 §3](./exploration/01-ux-journeys.md), [05 §3](./exploration/05-tourism-domain.md)) |
| D2 | **Interest = Action + Wish → Place**. Wishes are M:N tags, max 6 per action. | A place can carry multiple wishes; multiple drill-down paths reach it. |
| D3 | **Token URL is opaque** (`/r/{token}`). Exchanged at first load for short-lived JWT held in memory + refresh cookie. Token is a lookup key, not a self-contained credential. | Allows instant revocation; keeps URLs short; reduces screenshot/referer leak surface. ([03 §7](./exploration/03-architecture.md)) |
| D4 | **Schema-per-service inside a single Postgres** — not DB-per-service yet. Cross-schema joins forbidden from day 1. | Cheap backup story; mechanical migration to per-DB later. ([03 §4](./exploration/03-architecture.md)) |
| D5 | **Single Postgres + pgvector**; pgvector reused for both list search and Daily Tour RAG. | One model, one dimension, versioned via `model_version`. |
| D6 | **WebSocket via BFF** is the single realtime transport (chat + tour status + presence). | One auth handshake, one transport. SSE fallback only on WS-blocked networks. |
| D7 | **AI reservation = draft-and-handoff**. Agent drafts a localised WhatsApp/SMS, user taps Send. No autonomous booking. | Azorean small businesses are phone-first; autonomous booking creates liability and hallucinations. |
| D8 | **Candidate places: Google Places → OSM Overpass → owner manual.** No crawler in v1. | Crawler is a 6–10 engineer-week subsystem disguised as a bullet point. |
| D9 | **Channel-agnostic chat ships as Telegram + in-app first**, WhatsApp Business API is **deferred to Phase 5** behind a Meta/BSP-verification calendar gate. WhatsApp deep-link (`https://wa.me/...`) is the day-1 substitute. | Avoids 3–6 week BSP onboarding blocking the MVP. ([06 §2](./exploration/06-devils-advocate.md)) |
| D10 | **Locale priority**: en > pt-PT > de > es > fr. **Add pt-BR**. Ship en + pt-PT in Phase 1; expand per phase. | Reflects actual São Miguel guest mix; pt-PT vs pt-BR vocab differs (cozido/cozinha). ([05 §7](./exploration/05-tourism-domain.md)) |
| D11 | **Stitch MCP runs in Phase 0**, *before* shadcn install. Stitch owns *visual* tokens; the design-system doc owns *structural* tokens (radius, motion, breakpoints). | Avoids late-phase token churn. |
| D12 | **Microservices day 1** is kept (the brief is explicit) but services are sized small and a *modular monolith escape hatch* is acceptable per service. RabbitMQ used only where work is genuinely async — see D13. | Honours the brief without queue-everything anti-pattern. |
| D13 | **RabbitMQ day-1 use**: `place.candidate.discovered`, `place.approved`, `tour.requested/completed`, `message.inbound/outbound`, `notification.requested`, `reservation.created/cancelled`. Synchronous read paths (`/discover`, `/place/:id`) **never go through MQ**. | ([03 §5](./exploration/03-architecture.md)) |
| D14 | **No autonomous LLM access to anything that mutates state outside the planner output schema.** Every place_id in a generated tour must appear in the retrieval set; server-side rejects hallucinations. | Prompt-injection + hallucination defense. ([03 §6](./exploration/03-architecture.md)) |
| D15 | **Token in URL is acceptable for v1** but **never used outside HTTPS**, **never echoed in logs**, and **flagged in share-this-itinerary flows** (tour share strips the token, generates a separate share-link). | Mitigates the screenshot/Instagram leak risk. |

---

## 4. Functional Requirements

Tagged **P0** (must ship in MVP), **P1** (next phase), **P2** (later). Group → ID → requirement.

### 4.1 Reservation & Access

| ID | P | Requirement |
|----|---|-------------|
| FR-AC-01 | P0 | Owner can create a reservation: `guesthouse, guest_name, locale, checkin, checkout, party_size`. |
| FR-AC-02 | P0 | System generates an opaque token URL per reservation, valid from check-in to **checkout + 24h grace**. |
| FR-AC-03 | P0 | Token URL on first load exchanges for a short-lived JWT (1h refresh cycle, max-life = grace window). Token revocable by `jti`. |
| FR-AC-04 | P0 | n8n flow auto-revokes token on `reservation.cancelled`. |
| FR-AC-05 | P0 | Expired/invalid tokens degrade gracefully to the public landing (no error shaming, no PII leak). |
| FR-AC-06 | P1 | QR code printed on the physical welcome card opens the token URL. |
| FR-AC-07 | P2 | Multi-guesthouse jump within one reservation (mid-trip relocation). |

### 4.2 Catalog (Places, Actions, Wishes)

| ID | P | Requirement |
|----|---|-------------|
| FR-CAT-01 | P0 | Place entity carries: name (i18n), geom, address, contacts (phone, email, social), media (hero + gallery), action+wish tags, hours, status (`draft \| owner_approved \| published`), source provenance. |
| FR-CAT-02 | P0 | Owner backoffice supports place CRUD with media upload (MinIO via signed URLs). |
| FR-CAT-03 | P0 | Seed catalog of **28 hand-picked São Miguel places** ([05 §2](./exploration/05-tourism-domain.md)) is loadable via fixture. |
| FR-CAT-04 | P0 | Action/Wish taxonomy is data-driven; 6 actions and ≤6 wishes per action ([05 §3](./exploration/05-tourism-domain.md)). |
| FR-CAT-05 | P1 | Google Places import: owner enters search seed + radius, picks candidates, approves into draft. |
| FR-CAT-06 | P1 | OSM Overpass import for hikes, viewpoints, parking, public toilets. |
| FR-CAT-07 | P1 | "Host's picks" — owner flags up to 5 places per guesthouse; renders as a trust ribbon above algorithmic lists. |
| FR-CAT-08 | P1 | Per-place freshness flag; auto-warn owner when a place hasn't been edited in 90 days. |

### 4.3 Discovery (Lists & Search)

| ID | P | Requirement |
|----|---|-------------|
| FR-DSC-01 | P0 | Home shows 6 Action tiles + "Plan my day" + "Contact owner" entry-points. |
| FR-DSC-02 | P0 | Tapping an Action shows places grouped by Wish, default sort = distance from active location, paginated/virtualised for ≤30 visible. |
| FR-DSC-03 | P0 | Location toggle: `Near me` ⇄ `Near guesthouse`. Disabled side dimmed when geolocation denied. |
| FR-DSC-04 | P0 | Range slider with discrete steps (1/3/5/10/25 km). Debounced 250 ms before refetch. Persisted per session. |
| FR-DSC-05 | P0 | List affordances: sort menu (Distance / Rating / Name), group toggle (by Wish / Flat), favorite-star per token. |
| FR-DSC-06 | P1 | Semantic search using pgvector — embedding query like *"romantic dinner near the sea"* returns re-ranked results. |
| FR-DSC-07 | P1 | "Host's picks" ribbon rendered above the algorithmic group when present. |
| FR-DSC-08 | P1 | Vehicle-aware toggle (`car` vs `no car`) — filters places by reachability. |

### 4.4 Place Detail

| ID | P | Requirement |
|----|---|-------------|
| FR-PDT-01 | P0 | Hero image + multimedia gallery (photos + videos). Embla carousel. |
| FR-PDT-02 | P0 | Description (locale-aware with fallback), reputation summary, address, hours, contacts. |
| FR-PDT-03 | P0 | Map pin on a centered MapLibre view (PMTiles, OSM style). |
| FR-PDT-04 | P0 | Action buttons: **Navigate** (deep-link to OS maps), **Call** (`tel:`), **Draft DM** (opens WhatsApp `wa.me` link with prefilled localised text). |
| FR-PDT-05 | P1 | **Reserve via Agent** (draft-and-handoff variant only — see D7). |
| FR-PDT-06 | P1 | "Report issue" link (stale data, closed) → flagged to owner. |
| FR-PDT-07 | P0 | "Weather-OK today" indicator on outdoor places using IPMA forecast (Azores micro-climate). |

### 4.5 Daily Tour Planner

| ID | P | Requirement |
|----|---|-------------|
| FR-TUR-01 | P1 | Form: date (pre-filled within reservation window), start/end times (pre-filled 09:30 / 18:30), party size (from token), vehicle (yes/no), notes (text or voice). |
| FR-TUR-02 | P1 | Submit returns `202 + plan_id`; PWA streams status over WebSocket; final plan is a vertical timeline. |
| FR-TUR-03 | P1 | Plan includes meals at usual times (12:30–14:30 lunch, 19:30–21:30 dinner) unless overridden. |
| FR-TUR-04 | P1 | Drive-time realism enforced server-side using OSRM or Google Distance Matrix; reject plans with infeasible legs. |
| FR-TUR-05 | P1 | Weather-aware: re-plan with indoor fallbacks if rain forecast (tag `rainy-day-OK`). |
| FR-TUR-06 | P1 | Per-stop actions: **Swap**, **Remove**, **Lock**. Global: **Regenerate** (don't replan locked stops), **Save**, **Share**, **Send to chat with owner**. |
| FR-TUR-07 | P1 | LLM output validated server-side — every `place_id` must be in the retrieval set; otherwise reject and retry. |
| FR-TUR-08 | P1 | Failed plan never leaves blank screen — fallback to a 3-stop default near guesthouse + "Try again". |
| FR-TUR-09 | P2 | Share tour as PDF or token-stripped share-link. |
| FR-TUR-10 | P2 | "Started a stop" telemetry to inform retention experiments. |

### 4.6 Chat (Channel-Agnostic Owner Comms)

| ID | P | Requirement |
|----|---|-------------|
| FR-CHT-01 | P1 | In-app WebSocket chat between guest and owner. Channel badge ("via WhatsApp", "in-app") shown subtly on each message. |
| FR-CHT-02 | P1 | Quick-reply chips for the 5 common questions: taxi/check-in, opening hours, utilities, restaurant pick (routes into Eat), late checkout ([05 §4](./exploration/05-tourism-domain.md)). |
| FR-CHT-03 | P1 | Delivery state mandatory (Sent / Delivered / Read or "Owner usually replies in ~30 min"). |
| FR-CHT-04 | P1 | Voice-call button shown only if owner enables it. |
| FR-CHT-05 | P1 | **Telegram driver** (bot API). |
| FR-CHT-06 | P1 | **WhatsApp deep-link** (`wa.me`) as channel substitute until Business API onboarding completes. |
| FR-CHT-07 | P2 | **WhatsApp Business API** driver (after BSP verification). |
| FR-CHT-08 | P2 | Web push for incoming messages when PWA is backgrounded. |

### 4.7 Public Landing

| ID | P | Requirement |
|----|---|-------------|
| FR-PUB-01 | P0 | Bare domain renders a marketing page: hero, 3-line owner pitch, sample places (read-only, no distance unless IP geo succeeds), trust signals, locale switcher. |
| FR-PUB-02 | P0 | "Check availability" CTA (mailto or external booking) — bypassing Booking.com commission is part of the owner ROI pitch. |
| FR-PUB-03 | P0 | All premium surfaces (chat, tour, agent, per-guest greeting) hidden. |

### 4.8 Owner Backoffice

| ID | P | Requirement |
|----|---|-------------|
| FR-BO-01 | P0 | Authentik SSO; owner role only (no staff/admin tiers in v1). |
| FR-BO-02 | P0 | CRUD: Guesthouses, Owner Profile, Reservations, Guests, Places, Place Media. |
| FR-BO-03 | P0 | Owner profile fields: bio, photo, phone (`call_enabled` flag), preferred DM channel(s). |
| FR-BO-04 | P1 | Generate / regenerate / revoke a reservation token. |
| FR-BO-05 | P1 | Place candidate review queue (Google Places / OSM imports). |
| FR-BO-06 | P1 | Chat inbox (threads per reservation). |
| FR-BO-07 | P2 | Analytics dashboard (opens, plan generations, click-throughs). |

### 4.9 Cross-cutting

| ID | P | Requirement |
|----|---|-------------|
| FR-XC-01 | P0 | Locales: **en + pt-PT** in Phase 1; add **de, es** in Phase 4; **fr, pt-BR** in Phase 5. |
| FR-XC-02 | P0 | Per-field locale fallback (description in pt-PT or en) — never mixed UI chrome. Mark fallback strings subtly. |
| FR-XC-03 | P0 | Theme: light / dark / auto. Auto uses `suncalc` against São Miguel lat/long (37.74°N, 25.67°W), not device location. Re-evaluate every 30 min and on focus. |
| FR-XC-04 | P0 | PWA: installable, manifest, service worker, offline shell, "Add to Home Screen" nudge on 2nd visit. |
| FR-XC-05 | P0 | Voice input is a **progressive enhancement** — never the only path. |
| FR-XC-06 | P1 | Offline catalog cache (Nordeste / Sete Cidades have no signal). Last-viewed places + map tiles cached. |
| FR-XC-07 | P1 | Post-stay review loop — one push 24h after checkout asking guest to rate up to 3 places visited. |

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **TTI (Time-to-Interactive)** on a mid-range Android over 3G: < 3 s for Home, < 5 s for first list view.
- **API p95**: `/discover` < 300 ms; `/place/:id` < 200 ms; `/tour-plans` returns 202 in < 100 ms (LLM work async).
- **List virtualisation**: ≥30 items render at 60 fps on iPhone 11.

### 5.2 Accessibility

- **WCAG 2.2 AA** PWA + public landing. **AAA** for body-text contrast where the green palette permits ([02 §1](./exploration/02-ui-design-system.md)).
- Touch targets ≥ 44 × 44 CSS px; ≥ 56 px for primary actions.
- `prefers-reduced-motion` honoured (disable parallax, slide; keep state changes instant).
- Don't encode meaning in colour alone (open/closed, available/full) — pair icon + text.

### 5.3 Security

- All package versions meet CVE floors documented in [`04-tech-stack.md §4`](./exploration/04-tech-stack.md).
- `pnpm audit --prod` + `pip-audit` + `trivy` on every PR — fail on HIGH+ unfixed.
- `gitleaks` pre-commit + CI.
- Authentik never exposed to the public internet; placed behind Traefik forward-auth + internal network.
- n8n behind Authentik; never publicly exposed.
- LLM guardrails: structured JSON output, server-side place_id validation, guest free-text wrapped in delimited block, per-reservation rate-limit (D14).
- Token-in-URL hygiene: HTTPS-only, never logged, share-itinerary flow strips token (D15).

### 5.4 Reliability

- **Uptime target**: 99% (QA), 99.5% (Prod). Single VPS per env in Phase 1 — no redundancy promise.
- **Backups**: nightly `pg_dump` + MinIO snapshot to off-host storage. Quarterly restore drill.
- **Daily Tour failure**: never leaves blank screen — see FR-TUR-08.

### 5.5 Privacy / Compliance

- **GDPR**: tokens are opaque IDs (no PII encoded); guest PII (name, dates) is server-side. Data retention 30 days post-checkout. Cookie banner required even on tokenless landing.
- Place data: source + retrieved-at + raw payload kept for audit (ingestion).

### 5.6 Observability

- Structured JSON logs to stdout; Loki/Promtail or Vector ships them.
- Prometheus + Grafana (4 dashboards: RED-per-service, RabbitMQ, Postgres, host).
- OpenTelemetry traces; trace ID propagated by BFF including across LLM calls.

---

## 6. Architecture Summary

See [`03-architecture.md`](./exploration/03-architecture.md) for full diagrams and rationale. Snapshot:

- **Edge**: Caddy/Traefik + PWA static.
- **BFF (Node/Fastify)**: single ingress; aggregates calls; token + SSO enforcement; WebSocket fanout.
- **Identity**: Authentik (owner) + `reservation-token-svc` (Node).
- **Domain services**:
  - `catalog-svc` (Node) — places/guesthouses/owner-profile CRUD
  - `search-svc` (Python/FastAPI) — geo + semantic queries via pgvector
  - `planner-svc` (Python/FastAPI) — Daily Tour generation + RAG + LLM
  - `ingest-svc` (Python) — Google Places / OSM Overpass importer (NO crawler in v1)
  - `chat-hub` (Node) — channel-agnostic messaging + driver interface
  - `notif-svc` (Node) — transactional email + web push
  - `media-svc` (Node) — pre-signed MinIO uploads, transcoding
- **Infra**: PostgreSQL 17 + pgvector 0.8.2, RabbitMQ 4.3, MinIO (pinned), Redis (session cache + WS fanout), n8n (workflows).

---

## 7. Tech Stack (Locked)

See [`04-tech-stack.md`](./exploration/04-tech-stack.md) for the full table with CVE notes.

**Frontend**: Vite 6.4.2+ · TypeScript 5.6 · React 19 · react-router 7.6 (data mode) · Zustand 5 · TanStack Query 5.100 · react-hook-form 7.55 + zod 3.24 · react-i18next 15 · vite-plugin-pwa 0.21 + Workbox 7.3 · MapLibre GL JS 5.24 + PMTiles 4 · motion 12 · shadcn/ui (Tailwind v4 mode) · Tailwind CSS 4.2 · date-fns 4.1 · Vitest 2.1 + RTL 16 + Playwright 1.49 · ESLint 9 + Prettier 3.4.

**Backend (Node 22 LTS / TS)**: Fastify 5.8.5 + `@fastify/jwt` + `@fastify/rate-limit` + `@fastify/helmet` + `@fastify/websocket` · Drizzle ORM 0.36 + drizzle-kit 0.30 (**generate-only**, never push) · amqplib 0.10.

**Backend (Python 3.12)**: FastAPI 0.136.1 + Pydantic 2.10 + uvicorn · SQLAlchemy 2.x async + Alembic · pgvector PyPI · aio-pika 9.5 · Anthropic SDK + OpenAI SDK (no gateway).

**Infra**: Traefik v3.2.x · MinIO `RELEASE.2026-04-14T21-32-45Z+` (pinned, fork-watch) · PostgreSQL 17.3 · pgvector 0.8.2 · Authentik 2026.2.2+ · n8n ≥1.123.26 or ≥2.14.1 · RabbitMQ 4.3.0 · Docker Engine 27 + Compose v2 · Ubuntu 24.04 LTS.

**Tooling**: pnpm 9 + Turborepo 2.x · GitHub Actions + GHCR · lefthook · gitleaks · trivy · Renovate.

---

## 8. Design System Summary

See [`02-ui-design-system.md`](./exploration/02-ui-design-system.md).

- **Palette**: tea-green primary (`#2F5D43`), hydrangea-blue accent (`#5B6FB8`), basalt blacks, cream backgrounds, coral for destructive, sun-amber for daily-tour highlight.
- **Type**: Fraunces (display, variable) + Inter (body, variable).
- **Tokens**: Tailwind v4 `@theme` + CSS variables — no `tailwind.config.ts`. shadcn variable theming.
- **Theming**: `data-theme="dark|light"` on `<html>`; auto computed via `suncalc` against São Miguel lat/long.
- **Motion**: 150/240/420 ms durations; honour `prefers-reduced-motion`.
- **Custom patterns**: PlaceCard, ActionGroupHeader, DailyTourTimeline, ChatBubble (channel badge), RangeSlider, LocationToggle, MapPin, VoiceInputButton.
- **Stitch MCP** runs in Phase 0 week 1 before any component code; owns *visual* tokens.

---

## 9. Catalog Seed (Day 1)

28 hand-picked São Miguel places with action/wish tags — see [`05-tourism-domain.md §2`](./exploration/05-tourism-domain.md). Coverage check: every Action has ≥3 entries; rainy-day fallbacks present; seasonal flags explicit (whale-watching, swimming, ferry).

---

## 10. Risks

Ranked by impact × likelihood. Mitigations are P0 unless noted.

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | **Guest adoption flatlines** — they keep using WhatsApp + Google Maps. | High | Existential | Phase-1 paper test with 10 guests/owner (D-A counterproposal modified): print token cards, instrument opens + 2nd-visit rate. Kill switch at < 40%. |
| R2 | **Owner catalog rot past month 2.** | High | Existential | Auto-warn at 90 days stale; n8n digest summary; "Host's picks" caps the maintenance burden to ≤5 places. |
| R3 | **WhatsApp Business API gate** blocks Phase 4 timeline. | High | Schedule | Ship Phase 4 with Telegram + `wa.me` deep-link; Business API moves to Phase 5 behind BSP verification. |
| R4 | **LLM hallucinates places in Daily Tour.** | Medium | UX trust | Server-side place_id validation rejects unknown IDs; structured JSON output (D14). |
| R5 | **MinIO upstream archived** — supply-chain risk. | Medium | Operational | Pin exact RELEASE; watch Vonng community fork; budgeted 6-month spike to Garage/SeaweedFS. |
| R6 | **n8n CVSS-10 cadence.** | Medium | Security | Pin ≥1.123.26 or ≥2.14.1; auto-update on patch; n8n internal-network-only behind Authentik. |
| R7 | **Translation maintenance** explodes (5 locales × growing catalog). | Medium | Cost | Ship en + pt-PT only in Phase 1; require LLM-assisted translations + owner proofread queue from Phase 4. |
| R8 | **Token-in-URL leak** (screenshots, Instagram, referer). | Medium | Privacy | Opaque-token-not-JWT-in-URL (D3); HTTPS-only; share-itinerary strips token; revocable. |
| R9 | **AI tour planner LLM cost spike.** | Medium | Cost | Per-reservation rate-limit; cache identical-input plans; track per-request cost in Postgres. |
| R10 | **MapTiler / tile-hosting cost** if PMTiles self-host falters. | Low | Cost | Self-host PMTiles on MinIO; MapTiler only as fallback. |
| R11 | **Authentik misconfiguration** lets owners see each other's data. | Low | Severe | Multi-tenant isolation tests gated in CI; owner-scope checks in every catalog query. |
| R12 | **Voice input fails in field** (wind, noise). | High | Minor UX | Always paired with text fallback; never the only path (FR-XC-05). |

---

## 11. Open Questions / Decisions Pending

These need a product-owner call before they unblock specific tasks (referenced in plan TODOs).

| # | Question | Blocks |
|---|----------|--------|
| Q1 | **Token per reservation or per guest?** Affects favorites, chat identity, agent reservation context. ([01 §7-1](./exploration/01-ux-journeys.md)) | FR-AC-02 |
| Q2 | **Reputation source**: in-app reviews, Google import, owner-curated? Trust + moderation differs sharply. | FR-PDT-02 |
| Q3 | **Chat scope**: owner-only or staff pool? Affects expected-response-time copy. | FR-CHT-03 |
| Q4 | **Public landing depth**: should tokenless visitors see *which* guesthouses exist, or only the brand? | FR-PUB-01 |
| Q5 | **Post-checkout grace window**: 24h is the assumed default — confirm. | FR-AC-02 |
| Q6 | **Pricing model**: per-property / per-guest-night / one-time licence? Sizes the LLM cost ceiling. | All cost-bounded budgets |
| Q7 | **Affiliate revenue**: do we route partner-restaurant referrals through tracked links? Compliance + disclosure. | FR-PDT-04 |
| Q8 | **"Reserve via Agent" autonomy level**: draft only? Owner-mediated for partner venues? Confirm Tier 1/2 from [05 §4](./exploration/05-tourism-domain.md). | FR-PDT-05 |

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| **Action** | Top-level intent (Eat, Drink, See, Do, Buy, Move). |
| **Wish** | Sub-intent within an Action; tag, not folder. |
| **Interest** | Action + Wish combination. |
| **Place** | A discrete venue/POI in the catalog. |
| **Token** | Opaque reservation key in URL; exchanged at first load for a JWT. |
| **Premium access** | A tokened session — full PWA features. |
| **Public access** | Bare-domain session — marketing surface only. |
| **Channel** | Communication transport for chat (in-app / Telegram / WhatsApp). |
| **Driver** | A channel-specific module behind the chat-hub abstraction. |
| **Host's picks** | Owner-flagged places, rendered with a trust ribbon. |
| **Slice** | A vertical end-to-end deliverable within a phase (PR-sized scope). |
| **Task** | A single cs-agent prompt unit, sized for Sonnet (~30–90 min). |

---

## 13. References

- [`docs/IDEA.md`](./IDEA.md) — original product brief.
- [`docs/exploration/01-ux-journeys.md`](./exploration/01-ux-journeys.md)
- [`docs/exploration/02-ui-design-system.md`](./exploration/02-ui-design-system.md)
- [`docs/exploration/03-architecture.md`](./exploration/03-architecture.md)
- [`docs/exploration/04-tech-stack.md`](./exploration/04-tech-stack.md)
- [`docs/exploration/05-tourism-domain.md`](./exploration/05-tourism-domain.md)
- [`docs/exploration/06-devils-advocate.md`](./exploration/06-devils-advocate.md)
- [`docs/implementation-plans/001-roadmap/`](./implementation-plans/001-roadmap/) — phased execution plan.
- [`docs/implementation-plans/LIFECYCLE.md`](./implementation-plans/LIFECYCLE.md) — plan lifecycle.
