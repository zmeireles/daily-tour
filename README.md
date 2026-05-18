# Daily Tour — São Miguel guesthouse companion PWA

> A multilingual, AI-powered PWA that turns a guesthouse host's local knowledge into a personalized daily companion for their guests. Built around the unique signal that *a single trusted local* is more valuable than 1000 Tripadvisor reviews.

## What it is

Guests check into a São Miguel guesthouse and receive a token URL via WhatsApp / email / printed QR card. Tapping the URL exchanges the opaque token for a session JWT and lands them in the PWA — no signup, no password.

Once authed, they can:

- **Discover** — 6-action grid (Eat / Drink / See / Do / Buy / Move) that opens into wish-grouped place lists with distance + ratings
- **Place detail** — embla carousel gallery, MapLibre map with single pin, native deep-link buttons (Navigate / Call / WhatsApp draft)
- **Daily Tour** — request a Claude-generated personalized day with provenance + travel-time validators (uses OSRM for real drive times + IPMA for São Miguel weather)
- **Chat** — in-app WebSocket to the host (chat-hub) + Telegram + WhatsApp Business API drivers
- **Public landing** — at `/`, tokenless visitors see the guesthouse pitch + sample places + locale switch (EN, pt-PT, de, es, fr, pt-BR)

Owners get an Authentik-protected `/admin` shell with:
- Place CRUD with media upload (pre-signed PUT to MinIO via media-svc)
- Owner profile + Guesthouse CRUD
- Beta dashboard (during the beta period)

## Architecture

7 microservices + 1 PWA, all in TypeScript (BFF + token-svc + catalog-svc + media-svc) or Python 3.12 (search-svc + planner-svc + chat-hub + notif-svc).

```
┌────────┐    ┌────────┐    ┌──────────────┐
│  PWA   │───▶│  BFF   │───▶│ token-svc    │ (opaque → JWT exchange)
│ (Vite) │    │(Fastify│    │ (Fastify)    │
│ +React │    │ +jose) │───▶│ catalog-svc  │ (places, owners, wishes)
└────────┘    └────────┘    │ (Fastify)    │
                            ├──────────────┤
                            │ media-svc    │ (pre-signed S3, transcode)
                            │ (Fastify)    │
                            ├──────────────┤
                            │ search-svc   │ (FastAPI, pgvector)
                            │ (FastAPI)    │
                            ├──────────────┤
                            │ planner-svc  │ (FastAPI, Anthropic Claude)
                            │ (FastAPI)    │
                            ├──────────────┤
                            │ chat-hub     │ (FastAPI, WebSocket + drivers)
                            │ (FastAPI)    │
                            ├──────────────┤
                            │ notif-svc    │ (FastAPI, n8n workflows)
                            │ (FastAPI)    │
                            └──────────────┘
```

Backed by PostgreSQL 16 + pgvector + Redis + RabbitMQ + MinIO + Authentik + Traefik + n8n + OSRM. Observability via Prometheus + Grafana.

## Status

**Implementation-complete.** Plan-001 closed 99/100 tasks; Plan-002 hardening retrospective closed; Plan-003 beta-readiness in progress. See `docs/implementation-plans/`.

**Operational blockers for shipping**:
- QA VPS acquisition (Ubuntu 24, 4-8 vCPU, 16-32 GB RAM)
- Authentik realm import + first staff user
- Stitch design system attachment + real mockups
- Human translation review for de/es/fr/pt-BR
- Pen-test (external)

## Quickstart

```bash
# Prereqs: Node 22 via nvm, pnpm 9, Docker, Python 3.12 via uv

# 1. Install deps
source ~/.nvm/nvm.sh && nvm use
pnpm install --frozen-lockfile

# 2. Bring up the stack
docker compose -f infra/compose/docker-compose.base.yml \
                -f infra/compose/docker-compose.app.yml \
                up -d

# 3. Run migrations
pnpm --filter @daily-tour/catalog-svc run migrate
pnpm --filter @daily-tour/token-svc run migrate
pnpm --filter @daily-tour/media-svc run migrate

# 4. Seed catalog
pnpm --filter @daily-tour/catalog-svc run seed

# 5. Launch PWA dev server
pnpm --filter @daily-tour/pwa dev
```

Visit https://localhost:5173 for the public landing. Mint a test token via `pnpm --filter @daily-tour/token-svc run mint -- --guest-id <uuid>`.

## Repository tour

- `apps/pwa/` — Vite + React 19 PWA with Tailwind v4, shadcn/ui, MapLibre, motion, embla, oidc-client-ts
- `services/` — 7 microservices (4 TypeScript Fastify, 3 Python FastAPI, 1 hybrid chat-hub)
- `packages/` — shared TS config, shared types (zod schemas), OTel helper, daily_tour_common (Python)
- `infra/compose/` — Docker Compose overlays per service
- `infra/authentik/` — OIDC realm blueprint
- `infra/observability/` — Prometheus scrape + Grafana dashboards
- `infra/osrm/` — OSRM Dockerfile + São Miguel PBF bootstrap
- `docs/` — REQUIREMENTS, implementation plans 001-004, security playbooks, operations runbooks, lessons-learned, threat-model
- `tests/load/k6/` — k6 load test scripts
- `tests/chaos/` — chaos drills for OSRM/IPMA/RabbitMQ

## Decisions

15+ locked architectural decisions captured in `docs/REQUIREMENTS.md §10`. The most load-bearing:

- **D6 — Token-svc as separate service** (vs in BFF) — keeps token issuance + revocation surface auditable
- **D11 — pgvector for embeddings** (vs Pinecone/Weaviate) — one DB for relational + vector keeps ops simple
- **D13 — Authentik over Keycloak** — better blueprint support + lighter footprint
- **D14 — Anthropic Claude over OpenAI for the planner** — better at provenance + structured output
- **D15 — Tokens never in URLs** (HttpOnly cookies for refresh) — D15 hygiene captured throughout

## Development conventions

See `CLAUDE.md` (project) + global `~/.claude/CLAUDE.md` (per-user). Highlights:

- Conventional Commits, lowercase subject, mirror PR titles
- Node 22 via `.nvmrc`, pnpm 9, Turborepo 2.x
- Python 3.12 via `uv`, ruff + mypy strict + pytest
- Lefthook pre-push gates: tests + audit + typecheck
- 6 required CI checks: lint/test/build, gitleaks, pnpm audit, CodeQL JS/TS, CodeQL aggregate, PR title validation
- Auto-merge doctrine at `docs/operations/auto-merge-doctrine.md`

## Contributing

This project is currently single-maintainer (zmeireles). Plan-004 may open it up to co-development once owner onboarding is self-service. For now, file issues; PRs not accepted from external contributors.

## License

TBD.

---

*Built across ~18 hours of autonomous orchestration with Claude Code Sonnet 4.6 + Opus 4.7. 114+ PRs merged. Plan-001 (the original 100-task roadmap) implementation-complete. Plans 002-004 take it the rest of the way to scale + monetization.*
