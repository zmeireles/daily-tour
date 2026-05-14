# 04 — Tech Stack & Dependency Security

**Author:** stack/security lane
**Date:** 2026-05-14
**Constraints recap:** OSS, latest stable, React+TS / Python, Tailwind+shadcn+motion, no Next.js, no TanStack SSR, SPA only, Docker Compose, Authentik, n8n, Postgres+pgvector, RabbitMQ day 1, Ubuntu 24.

This document picks concrete packages and version lines, and clears each through a CVE check. Architecture decomposition is owned by another lane.

---

## 1. Frontend stack

| Concern | Pick | Version line | Rationale |
|---|---|---|---|
| Build tool | **Vite** | `^6.4.x` (or `^7.3.x` once team validates) | Mature SPA build, ESM dev, Rollup prod, first-class PWA plugin support. |
| Language | **TypeScript** | `~5.6` | Stable, matches React 19 types. |
| UI runtime | **React** | `^19.0` | shadcn v4 components target it; matches `react-router` v7 peer. |
| Router | **react-router v7 (data mode)** | `^7.6` | Data mode keeps us SPA-only. `ssr:false` is framework-mode; in **data mode** we never opt into SSR — pure `createBrowserRouter` + loaders. Wouter is too thin for this app (route-level loaders, nested layouts, lazy splits). |
| Client state | **Zustand** | `^5.0` | App has moderate global state (auth token, locale, theme, current location, guesthouse). Zustand is ~3 KB, no providers, no boilerplate. Jotai is overkill for this state shape; Redux Toolkit is too heavy. |
| Server state | **TanStack Query** | `^5.100` | Caches places lists, place details, agent replies. Allowed (data layer, no SSR). |
| Forms | **react-hook-form + zod + @hookform/resolvers** | `rhf ^7.55`, `zod ^3.24` | Daily-tour form has many fields + validation. RHF/Zod is the de-facto SPA standard. |
| i18n | **react-i18next + browser-languagedetector** | `react-i18next ^15`, `i18next ^25` | pt-PT/en/fr/es/de. Largest ecosystem, namespace lazy-loading, ICU plurals. LinguiJS is smaller but extraction-based — friction for non-dev translators. |
| PWA | **vite-plugin-pwa + Workbox 7** | `vite-plugin-pwa ^0.21`, Workbox `^7.3` | `generateSW` strategy for app shell + `injectManifest` if we need custom routing for tile cache. Required for offline tour view. |
| Maps | **MapLibre GL JS** | `^5.24` | Vector tiles, GPU rendering, no API token, BSD-3. Pair with self-hosted tiles via **PMTiles** (`pmtiles` ^4) served from MinIO/Caddy, plus `maplibre-offline-pmtiles` plugin for OPFS caching. Leaflet rejected: raster-only, weaker offline story for vector styling and labels. |
| Animation | **motion** (was framer-motion) | `^12.x` | Brief mandates it. `motion/react` API. |
| Components | **shadcn/ui** | latest CLI, Tailwind v4 mode | Copy-in components, Radix primitives, data-slot styling. |
| Styling | **Tailwind CSS v4** | `^4.2` | CSS-first config, 5× faster build. See §6 — modern-browser-only is a watch-item. |
| Voice input | **Web Speech API (native)** via custom hook | n/a | Feature-detect + text-only fallback. `react-speech-recognition` is unmaintained — write a 30-line hook. |
| Date / locale | **date-fns** | `^4.1` | Tree-shakeable, locale per import (`/locale/pt`, `fr`, `es`, `de`, `en`). Temporal polyfill still flagged "not for prod" in 2026; revisit when V8 ships native Temporal. |
| Testing | **Vitest + React Testing Library + Playwright** | `vitest ^2.1`, `@testing-library/react ^16`, `playwright ^1.49` | Vitest reuses Vite config; Playwright for e2e PWA flows + service-worker assertions. |
| Lint / format | **ESLint 9 (flat) + typescript-eslint + Prettier 3** | `eslint ^9`, `prettier ^3.4` | Flat config is stable; matches React 19 plugin support. |

---

## 2. Backend stack(s)

Per-service language picks — **architecture lane owns "which services exist"**; we own "what to build them with".

| Service type | Language | Framework | Rationale |
|---|---|---|---|
| Public REST / BFF for the PWA | Node 22 LTS + TS | **Fastify v5** (`^5.8.5`) | Schema-first (JSON Schema + Ajv pairs with our zod), plugin ecosystem (`@fastify/jwt`, `@fastify/rate-limit`, `@fastify/helmet`), 30k+ req/s. Hono's sweet spot is edge runtimes; on plain Node-in-Docker Fastify's middleware depth wins. NestJS too DI-heavy. |
| Realtime (chat with owner) | Node 22 + TS | **Fastify + `@fastify/websocket`** or **uWebSockets.js** | Stay on Fastify unless we measure throughput pain. |
| AI agent / tour planner | Python 3.12 | **FastAPI 0.136 + Pydantic v2 + uvicorn** | Best ecosystem for LLM SDKs, LangGraph, embeddings, vector ops. Async I/O native. |
| Scraping / candidate places | Python 3.12 | **FastAPI worker + httpx + selectolax/trafilatura** | Same runtime as agent service. Run as RabbitMQ consumer, not HTTP. |
| Workflow orchestration | n8n (off-the-shelf) | n/a | See §3. |

**ORM**:
- Node side: **Drizzle ORM** (`drizzle-orm ^0.36`, `drizzle-kit ^0.30`). **Generate + migrate** flow only (never `drizzle-kit push`) — see §6.
- Python side: **SQLAlchemy 2.x async** + **Alembic** for migrations. Native pgvector support via `pgvector` PyPI package.

**Message queue clients**:
- Node: **amqplib** (`^0.10`) wrapped in a thin retry/DLX helper, or **rabbitmq-client** if we want native promises.
- Python: **aio-pika** (`^9.5`) — first-class async, good DLX semantics.

**LLM SDK**: **Anthropic SDK + OpenAI SDK directly**, no LiteLLM proxy. Start-up scale, ≤2 providers; LiteLLM has 800+ open issues and a documented OOM regression on K8s. Cost-track via per-request Postgres logging. Revisit a gateway once we exceed 3 providers or need cross-service rate-limits.

---

## 3. Infra stack

| Component | Pick | Version | Notes |
|---|---|---|---|
| Reverse proxy | **Traefik v3** | `v3.2.x` | Docker-label service discovery — services come and go and Traefik rewires automatically. Built-in ACME + HTTP/3. Caddy is simpler but we'd hand-edit Caddyfile per service. |
| Object storage | **MinIO** — but pinned + monitored | `RELEASE.2026-04-14T21-32-45Z` minimum | **Risk flag** (§6): upstream archived their open repo in April 2026. The binary still works and bug-fix releases continued, but we should track a fork (e.g. Vonng's). For day 1, MinIO with a forward exit plan to **Garage** or **SeaweedFS** if upstream stalls. |
| Database | **PostgreSQL 17** | `17.3+` | Required for pgvector 0.8.2 linkage. Run `postgres:17.3-alpine` (or `postgres:17` if Alpine causes locale issues with `pt_PT.UTF-8`). |
| Vector | **pgvector 0.8.2** | 0.8.2 | Fixes CVE-2026-3172 (parallel HNSW buffer overflow). HNSW for places, IVFFlat as fallback. |
| Identity | **Authentik** | `2026.2.2` minimum | Skips CVE-2026-25227, CVE-2026-25748, CVE-2026-25922 (all fixed in 2025.10.4 / 2025.12.4, rolled into 2026.x). |
| Workflows | **n8n** | `>= 1.123.26` (LTS line) or `>= 2.14.1` (newest) | **Must avoid** versions affected by CVE-2026-21877 (10.0), CVE-2026-21858 (10.0), CVE-2026-25049, CVE-2026-33660. Pin exactly; subscribe to security bulletins. |
| Message broker | **RabbitMQ 4.3** | `4.3.0` with management plugin enabled | New built-in Linter + Stream Browser in mgmt UI. Streams disabled for now (we don't need log-style topics). |
| Container runtime | Docker Engine 27 + Compose v2 | host: Ubuntu 24.04 LTS | |

---

## 4. Security audit — advisory check (as of 2026-05-14)

Only packages with **active high/critical** advisories on a recommended line are called out; everything else is clean as of 2026-05-14.

| Package | Min pinned | Advisory note |
|---|---|---|
| `vite` | `^6.4.2` | CVE-2026-39363 (WebSocket file read, high) + CVE-2026-39365 (.map path traversal) — both fixed in 6.4.2. |
| `fastify` | `^5.8.5` | CVE-2026-33806 (content-type schema bypass) fixed in 5.8.5; CVE-2026-3419, CVE-2026-3635 fixed earlier. If we adopt `@fastify/middie` or `@fastify/static`, pin their patched lines (CVE-2026-6270, CVE-2026-6410). |
| `Authentik` | `2026.2.2` | CVE-2026-25227 (RCE), CVE-2026-25748 (proxy auth bypass), CVE-2026-25922 — all fixed pre-2026.2. |
| `n8n` | `>=1.123.26` LTS or `>=2.14.1` | **Critical floor.** CVSS-10 RCE chain CVE-2026-21877, auth-bypass CVE-2026-21858, RCE CVE-2026-25049, CVE-2026-33660. Pin exact and auto-patch. |
| `pgvector` | `0.8.2` | CVE-2026-3172 (parallel HNSW buffer overflow). |
| `MinIO` | `RELEASE.2026-04-14T21-32-45Z+` | Three 2026 CVEs (SSE metadata injection, LDAP brute-force, REST path traversal) all patched. Upstream-archived risk is §6, not a CVE. |

Clean: react 19, react-router 7.6, tailwindcss 4.2, tanstack-query 5.100, react-hook-form 7.55, zod 3.24, maplibre-gl 5.24, motion 12, vite-plugin-pwa 0.21 / workbox 7.3, date-fns 4.1, drizzle 0.36, fastapi 0.136, pydantic 2.10, amqplib 0.10, aio-pika 9.5, Traefik 3.2, RabbitMQ 4.3.

**Operational controls**: `pnpm audit --prod` + `pip-audit` in CI; `trivy` image scan failing on unfixed HIGH+; Renovate with grouped auto-merge for patch+security; gitleaks pre-commit + CI.

---

## 5. Build / CI tooling

| Concern | Pick | Why |
|---|---|---|
| Package manager | **pnpm 9** | Symlinked `node_modules`, fast cold installs, mature workspace protocol. npm fine for one-package repos; bun still has too many ecosystem edge cases for production day-1. |
| Monorepo orchestration | **pnpm workspaces + Turborepo `^2.x`** | Remote caching, simple `turbo.json`, good DX. Nx has more features (generators, affected graph) but more conceptual overhead — revisit if/when we exceed ~10 packages. |
| CI | **GitHub Actions** (managed runners) day 1 → **self-hosted ARM runner** on Hetzner once minutes get expensive | Standard, free for OSS, good ecosystem. Move builds to self-hosted only after measuring. |
| Container registry | **GHCR** | Free, integrates with GHA. |
| Pre-commit | **lefthook** | Fast, language-agnostic, simpler than Husky. |

---

## 6. Risky picks called out

- **Tailwind v4** — stable since Jan 2025, but uses bleeding-edge CSS (`@property`, `color-mix`). Drops old-Safari support. Verify on iPhone 11 / Android 9 if the guest demographic skews older.
- **react-router v7 data mode SPA-only** — community threads confuse `ssr:false` (framework mode) with data mode. We sidestep entirely: `createBrowserRouter` + route objects, no `react-router.config.ts`.
- **Drizzle migrations in prod** — `push` is a footgun. Lock to `generate` + reviewed SQL + `migrate` in a migration container. CI must fail if `push` appears in any script. Destructive ALTER requires human review.
- **MinIO upstream archived (Apr 2026)** — binary works, security releases still landing in May 2026, but it is maintenance-fork land. Pin exact RELEASE, track Vonng's fork advisories, plan 6-month migration spike to Garage / SeaweedFS if upstream goes dark.
- **n8n CVE cadence** — three CVSS-10 RCEs in early 2026. Pin exact version, auto-patch, place n8n behind Authentik forward-auth on an internal-only network. Never expose its UI publicly.
- **Motion v12** — renamed from `framer-motion`; old shadcn/motion recipes won't paste cleanly.
- **Web Speech API** — iOS Safari coverage is partial; ship as progressive enhancement only.

---

## 7. Rejects (one-liners)

- **Next.js / Remix / TanStack Start** — brief forbids SSR.
- **Mapbox GL JS proprietary tier** — token cost; MapLibre is the OSS fork.
- **Leaflet** — raster-only, weaker offline-vector story than MapLibre+PMTiles.
- **Redux Toolkit / redux-saga** — overkill; **Jotai** — no derived-state graph to justify.
- **NestJS** — DI ceremony slows a small team; **Express** — slower + no schema-first.
- **Prisma** — heavier runtime than Drizzle for our scale.
- **LiteLLM gateway** — see §2.
- **Caddy** — loses to Traefik on Docker label discovery.
- **Yarn (Classic/Berry), npm workspaces with hoisting** — pnpm is strictly better.
- **Bun in prod, Storybook day-1** — defer.
