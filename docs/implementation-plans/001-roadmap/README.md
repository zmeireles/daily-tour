# Plan 001 — Daily Tour MVP Roadmap

> Single master plan covering the path from empty repo to a feature-complete v1 of the Daily Tour PWA. Six phases, each shipping vertical slices, each slice broken into Sonnet-executable cs-agent tasks.

**Status**: Draft
**Owner**: orchestrator (`zmeireles`)
**Created**: 2026-05-14
**Source**: [`docs/REQUIREMENTS.md`](../../REQUIREMENTS.md) + 6 exploration docs in [`docs/exploration/`](../../exploration/).

---

## Overview

This plan is the *index* and *dependency map*. Detailed task prompts live in [`TODO.md`](./TODO.md). The execution log lives in [`EXECUTION.md`](./EXECUTION.md).

We deliberately *did not* split the work into one plan per phase. A single roadmap keeps the dependency graph visible end-to-end and lets us re-prioritise phases as we learn from Phase 1.

## Problem (one paragraph)

São Miguel guesthouse owners send their guests a printed brochure and answer the same five WhatsApp questions every check-in. There is no product today that gives a guest, on arrival, a *trusted*, *contextual*, *actionable* shortlist of places — curated by their host — that also doubles as the owner's direct-booking marketing site. The brief calls for a token-gated PWA that fills this gap with an AI Daily Tour planner and real-time chat. See [`REQUIREMENTS.md §1`](../../REQUIREMENTS.md#1-vision).

## Solution (one paragraph)

A Docker-Compose microservices platform with a React 19 SPA PWA front-end, a Node Fastify BFF, three Python FastAPI services for ML-shaped work (search, planner, ingest), and four Node services for I/O-shaped work (catalog, chat-hub, notif, media). PostgreSQL 17 + pgvector 0.8.2 is the single store (schema-per-service). RabbitMQ 4.3 carries genuinely async events. Authentik handles owner SSO; a thin token service handles guest reservation JWTs. We ship a curated 28-place catalog for São Miguel on day 1, defer the internet-scan crawler, ship "draft-and-handoff" instead of autonomous reservations, and gate WhatsApp Business API behind Phase 5 BSP onboarding. See [`REQUIREMENTS.md §6-7`](../../REQUIREMENTS.md#6-architecture-summary).

---

## Phases at a Glance

| Phase | Name | Goal (what the user can do at phase exit) | Approx. agent-weeks |
|-------|------|-------------------------------------------|---------------------|
| **0** | **Foundation** | Repo, CI, dev-stack `docker compose up` runs all infra. PWA app shell renders "Hello". Stitch tokens flow into Tailwind. | 2 |
| **1** | **Guest Landing & Catalog v1** | Tokened guest opens URL → sees 6-action grid → drills into Eat by Wish → opens a place detail with map + actions. Tokenless visitor sees public landing. Owner CRUDs places via Authentik-gated backoffice. EN + pt-PT. | 4 |
| **2** | **Discovery & Search** | pgvector embeddings live. List ranks by hybrid geo + semantic. Location toggle + range slider + Host's picks ribbon work. Vehicle-aware toggle filters reachability. | 2 |
| **3** | **Daily Tour Planner** | Guest fills form + voice → planner emits validated multi-stop timeline with drive times + weather-aware fallbacks + lock/swap/regenerate. | 3 |
| **4** | **Chat & Reservation Drafting** | In-app WebSocket chat with owner; Telegram driver; WhatsApp `wa.me` deep-link; AI drafts a localised reservation DM. Owner inbox in backoffice. | 3 |
| **5** | **Hardening & Growth** | Offline cache; 5 locales + pt-BR; WCAG 2.2 AA audit; Core Web Vitals budgets; post-stay review loop; observability dashboards; WhatsApp Business API onboarding. | 3 |

Total nominal: **~17 agent-weeks** at one orchestrator + 2–3 parallel Sonnet cs-agents per wave. Real calendar time depends on owner availability and the Q1/Q6 unblocks.

---

## Slicing Principles

1. **Vertical slices, not horizontal layers.** A slice cuts top-to-bottom across PWA → BFF → service → DB → migration, so it ships value end-to-end. We do NOT do a "Phase 1: all backend, Phase 2: all frontend" split.
2. **One slice = one merged PR** ideally; longer slices split into 2-4 tasks but never merge half-done.
3. **No shared file writes between parallel tasks.** cs-agents on the same wave must own disjoint file scopes. Use the file-ownership column in TODO.md to verify before launching.
4. **Tasks must be Sonnet-executable**: self-contained prompt, ≤90 min of work, clear acceptance criteria, no judgement calls about product scope (those live here).
5. **TDD where it adds signal**: state machines, business validators, parser/serializer modules. Skip TDD for trivial CRUD wiring — but always include at least one happy-path e2e per slice.

---

## Agent Profile Selection

Per global `~/.claude/CLAUDE.md` orchestrator rules:

| Work type | Profile | Why |
|-----------|---------|-----|
| Standard feature task (Sonnet-doable) | `claude-sonnet-yolo` | Capacity, cost. 3–5 parallel safe. |
| Architecture / cross-cutting / risky | `claude-yolo` (Opus) | Better judgement. Max 2 parallel. |
| Docs / changelog / TODO maintenance | `claude-sonnet` | Speed + permission control on writes. |
| Anything touching secrets / Authentik | `claude` (interactive) | Manual review per action. |

Default for Phase 0–5 tasks: **`claude-sonnet-yolo`** unless tagged `[opus]` in TODO.md.

---

## Dependency Notation

In [`TODO.md`](./TODO.md):

- `T-<phase>.<slice>.<task>` — task ID.
- `deps: T-0.1.1, T-0.2.0` — hard prerequisites (must be merged before this task starts).
- `parallel-with: T-1.2.0, T-1.2.1` — safe to run concurrently; file scopes disjoint.
- `blocks: T-2.0.0` — downstream readers.
- `owns: <glob>` — file scope owned by this task; no other concurrent task may write here.

The full dependency DAG is visualised in [`TODO.md §Dependency Graph`](./TODO.md#dependency-graph).

---

## Decisions Frozen by This Plan

These are *plan-level* decisions on top of [`REQUIREMENTS.md §3`](../../REQUIREMENTS.md#3-decision-log--key-calls-from-exploration):

| # | Decision | Affected phase |
|---|----------|----------------|
| P-D1 | **Monorepo from day 1**: `pnpm` workspaces + Turborepo. Single repo, multiple packages. | 0 |
| P-D2 | Each backend service is its own package under `services/<name>/`; PWA at `apps/pwa/`. Shared types at `packages/shared-types/`. | 0 |
| P-D3 | **Docker Compose is the only deployment artifact in v1.** No Kubernetes, no Helm, no Nomad. | 0, 5 |
| P-D4 | **Migrations**: Drizzle generate-only for Node services; Alembic for Python services. **CI fails if `drizzle-kit push` is referenced in any script.** | 0 |
| P-D5 | **Seed-first development**: Phase 1 ships with 28-place fixture; later phases can rely on it for testing. | 1 |
| P-D6 | **Translation workflow**: i18next JSON files under `apps/pwa/src/locales/<lng>/<ns>.json`; one file per namespace; en + pt-PT mandatory; LLM-assisted drafts for de/es/fr/pt-BR with human review queue from Phase 4. | 1, 4 |
| P-D7 | **API contract**: zod schemas live in `packages/shared-types/`; Fastify imports them via `@fastify/type-provider-typebox`-style; PWA imports them via TanStack Query. Same schemas, single source. | 0 |
| P-D8 | **Service ports**: BFF `:8080`, catalog `:8081`, search `:8082`, planner `:8083`, ingest `:8084`, chat-hub `:8085`, notif `:8086`, media `:8087`, token-svc `:8088`. Traefik routes by hostname. | 0 |
| P-D9 | **Local dev**: `pnpm dev` runs PWA + BFF natively (hot reload); all other services run in Compose. Production = everything in Compose. | 0 |
| P-D10 | **Telemetry from Phase 0**: OpenTelemetry SDK is wired in every service skeleton. Dashboards land in Phase 5; the wiring lands now. | 0 |

---

## Files Changed (Big Picture)

Phase 0 creates the structural skeleton:

```
.
├── apps/
│   └── pwa/                    # React 19 SPA PWA
├── services/
│   ├── bff/                    # Node/Fastify
│   ├── token-svc/              # Node/Fastify
│   ├── catalog-svc/            # Node/Fastify
│   ├── search-svc/             # Python/FastAPI
│   ├── planner-svc/            # Python/FastAPI
│   ├── ingest-svc/             # Python/FastAPI
│   ├── chat-hub/               # Node/Fastify
│   ├── notif-svc/              # Node/Fastify
│   └── media-svc/              # Node/Fastify
├── packages/
│   ├── shared-types/           # Zod schemas + TS types
│   ├── shared-config/          # ESLint, tsconfig bases, prettier
│   └── shared-otel/            # OTel SDK helpers (Node)
├── infra/
│   ├── compose/                # docker-compose.yml + profiles
│   ├── traefik/
│   ├── authentik/
│   ├── n8n/
│   ├── postgres/               # init scripts, schemas/
│   └── observability/          # prom, grafana, loki configs
├── docs/
│   ├── IDEA.md
│   ├── REQUIREMENTS.md
│   ├── exploration/
│   └── implementation-plans/
├── .github/workflows/          # CI: build, test, lint, audit, deploy
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── .mcp.json
```

Detailed file map lives per-task in [`TODO.md`](./TODO.md).

---

## Testing Strategy

| Layer | Tool | What it tests |
|-------|------|---------------|
| Unit (Node) | Vitest | Pure functions, validators, schema parsers, business rules. |
| Unit (Python) | pytest | Same; LLM prompt assemblers, place_id validators. |
| Integration | Vitest + Testcontainers (Postgres) | Service-to-DB round-trips, repository layer. |
| Contract | zod schemas + supertest / httpx | BFF endpoints exercised against shared schemas. |
| E2E | Playwright | Critical journeys: token landing, drill-down, tour generation, chat hello. |
| a11y | Playwright + axe-core | Per-route a11y violations; fail CI on serious+. |
| Security | gitleaks + trivy + pnpm-audit + pip-audit | CI gate. |
| Perf | Lighthouse-CI | Phase 5 gate. |

---

## Exit Criteria for "MVP Done"

Phase 1–4 merged + Phase 5 minimal hardening (offline cache, en+pt-PT+de+es, a11y AA, observability) shipped to QA. Demoable end-to-end: book a fake reservation → owner enters places → guest opens token → drills in → generates a Daily Tour → DMs owner. Risk R1 paper-test commences here.

---

## How to Run This Plan

```bash
# 1. Pick the next unblocked task from TODO.md (tasks marked `🟢 ready`)
# 2. Save its prompt block to temp/prompt-<task-id>.md
# 3. Launch:
cs-agent launch --name <task-id> --prompt temp/prompt-<task-id>.md --profile claude-sonnet-yolo
# 4. Monitor:
cs-agent status
# 5. Verify commit then push:
cs-agent diff <task-id>
cs-agent push <task-id>
# 6. Tick the box in TODO.md with date + PR link. Log in EXECUTION.md.
```

Max 5 simultaneous `claude-sonnet-yolo` agents; respect `owns:` file-scope rules — never launch two agents writing the same path.
