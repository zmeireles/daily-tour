# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — Plan-007 (qual VPS deploy) Phase Q.2 — repo plumbing (2026-06-12)

Pure repo work (no VPS touched); 8/8 Q.2 tasks merged + the GHCR publish pipeline brought to 11/11 green. Plan dir: `docs/implementation-plans/007-qual-vps-deploy/` (EXECUTION.md = wave detail).

- **GHCR image pipeline** — `publish-images.yml` builds + pushes all 11 images (8 services + postgres + osrm + pwa) to `ghcr.io/zmeireles/daily-tour/*:{sha,qual}` (Q.2.0, #214). PWA shipped as a self-contained nginx image (`apps/pwa/Dockerfile`, VITE\_\* baked) instead of a host-side bind-mount (Q.2.4, #220).
- **Qual compose overlays** — `overlay.qual.yml`: Traefik on 0.0.0.0:80/443 + web→websecure redirect, **apex same-origin routing** (`/v1`+`/r` path-route to the BFF over the SPA), GHCR image overrides, `mem_limit`s, `NODE_ENV=production`, OSRM_URL fix; plus the production ACME resolver + email-via-command-flag fix (Q.2.1/Q.2.2, #216). `overlay.qual-authentik.yml`: auth. router websecure TLS (404 fix) + Authentik mem_limits (Q.2.5, #218).
- **Secrets + config** — `scripts/qual/gen-env-qual.sh` generates `.env.qual` (64 keys) + a rotated `infra/postgres/init-qual/02-roles.sql`; checked-in `.env.qual.example` template (Q.2.3, #215). Authentik qual redirect URI added to the owner-app blueprint (#218).
- **Deploy automation** — `deploy-qa.yml` (self-hosted `qual-vps` runner: pull→up→migrate→seed→smoke→`--qual` check→rollback-to-previous-tag) + `dev-up.sh`/`dev-smoke.sh` parameterised with `ENV_FILE`/`PROJECT`/`--to` for the `dt-qual` project (Q.2.6, #219). `dev-env-check.sh --qual` post-deploy gate (Q.2.7, #217).
- **osrm image fixes** (latent, surfaced by the maiden publish run): base tag `v5.28.0`→`v5.25.0` (404, #221) + Debian-stretch-EOL apt → `archive.debian.org` (#222).

### Added — Plan-006 (Owner Backoffice v2, in progress) + post-arc maintenance

Sessions 2026-06-04 → 2026-06-11. Plan dir: `docs/implementation-plans/006-owner-backoffice/`.

**Slice 6.A — per-guesthouse scoping (DONE, browser-UAT'd)**

- Schema: `guesthouse.hidden_place_ids uuid[]` + catalog hide/unhide endpoints (T-6.A.0/6.A.1, #191)
- BFF discover filters guest results by guesthouse hide list (T-6.A.2, #192)
- Backoffice guest-visibility toggle in `/admin/places` (T-6.A.3, #193)
- Owner-app OIDC integration fixes: JWKS host alias, `groups` scope, public PKCE client blueprint (#195)

**Slice 6.C — owner photo uploader (2/3 done)**

- Media-display foundation (public `GET /v1/media/:id`) + owner avatar uploader (T-6.C.0, #196)
- Guesthouse hero uploader (T-6.C.1, #197)

**Slice 6.D — hosts-pick governance (DONE)**

- Soft hosts-pick cap warning ~6–8/guesthouse (T-6.D.0, #198)

**Backoffice QoL batch (daily-tour #154/#155/#156)**

- Places list pagination (10/page) + clickable column sorting (#203)
- Locale switcher EN/PT-PT in owner/admin shell (#202)
- `cursor-pointer` on shared Button base (#201)

### Fixed

- Stable place list ordering by `createdAt` instead of `updatedAt` (#199)
- Security: `shell-quote` override to >=1.8.4, GHSA-w7jw-789q-3m8p (#200)
- chat-hub: add missing per-service `.gitignore`, untrack committed `__pycache__` artifacts (#204)

### Implementation arc (Plans 001-005)

This project shipped its full original 100-task roadmap (Plan-001) plus 4 subsequent plans (002 deploy/polish, 003 real-user readiness, 004 scale/monetize, 005 operate) across roughly 117 merged PRs in a single autonomous orchestration session. The CHANGELOG below captures the macro arc; per-PR detail lives in `docs/implementation-plans/001-roadmap/EXECUTION.md`.

### Added — Plan-001 (Implementation, 99/100 tasks)

**Phase 0 — Foundation** (15/16 done; T-0.4.4 VPS-blocked)

- Monorepo via pnpm + Turborepo (T-0.1.1)
- Shared TS config + ESLint 9 flat + Prettier 3 (T-0.1.2)
- Pre-commit (lefthook + gitleaks) (T-0.1.3)
- GitHub Actions CI (lint, typecheck, test, audit) (T-0.1.4)
- `packages/shared-types` zod schemas (T-0.2.0)
- `packages/shared-otel` OTel SDK helper (T-0.2.1)
- Python `daily_tour_common` (FastAPI base + pydantic mirror + OTel) (T-0.2.2)
- Compose base: PostgreSQL + pgvector + Redis + RabbitMQ + MinIO (T-0.3.0)
- Compose overlay: Traefik v3 + ACME staging (T-0.3.1)
- Compose overlay: Authentik 2026.2.2+ (T-0.3.2)
- Compose overlay: n8n LTS behind Authentik (T-0.3.3)
- PWA scaffold: Vite 6.4.2 + React 19 + TS + Tailwind v4 (T-0.4.0)
- Stitch design tokens → @theme block (T-0.4.1)
- BFF skeleton: Fastify v5.8.5 on Node 22 (T-0.4.2)
- Compose overlay: bff + pwa-static nginx (T-0.4.3)

**Phase 1 — Guest Landing & Catalog v1** (Slices 1.0-1.7 closed)

- Reservation token + Zustand session (1.0)
- Catalog data model + 28-place São Miguel seed (1.1)
- Discover 6-action grid with locale-auto + theme-auto (1.2)
- Place detail with embla gallery + MapLibre + deep-links (1.3)
- Media service + MinIO upload pipeline (1.4)
- Public landing route (1.5)
- Authentik realm + Owner backoffice MVP (1.6)
- i18n bundles + PWA install + service worker (1.7)

**Phase 2 — Discovery & Search**

- search-svc FastAPI skeleton (T-2.0.0)
- pgvector + embeddings worker (T-2.0.1)
- Backfill 28 seeded places (T-2.0.2)
- Hybrid /v1/query endpoint with SQL geo + tag ∩ vector re-rank (T-2.1.0)
- BFF /v1/discover switches to search-svc hybrid (T-2.1.1)
- Host's picks toggle + ribbon (T-2.2.0/2.2.1)
- Vehicle-aware toggle + filter (T-2.2.2)

**Phase 3 — Daily Tour Planner**

- planner-svc FastAPI + Anthropic Claude (T-3.0.0)
- Prompt assembler + RAG retrieval (T-3.0.1)
- Provenance + travel-time validators (T-3.0.2)
- Async tour-plan flow with RabbitMQ (T-3.0.3)
- PWA Daily Tour intake form + voice input (T-3.1.0)
- DailyTourTimeline component (T-3.1.1)
- Failure + timeout fallback UI (T-3.1.2)
- IPMA forecast client + Redis cache (T-3.2.0)
- Rainy-slot swap to indoor (T-3.2.1)
- BFF weather_ok_today enrichment (T-3.2.2)
- OSRM self-hosted overlay + Python client (T-3.3.0)
- Planner travel-time validator uses OSRM (T-3.3.1)
- Share tour link + public read-only view (T-3.4.0)
- Tour telemetry started/completed events (T-3.4.1)

**Phase 4 — Chat & Reservation**

- chat-hub service + driver Protocol + WebSocket (T-4.0.0)
- In-app chat with WebSocket bridge (T-4.1.0 — retried as T-2.C.1)
- Telegram driver (T-4.2.0)
- WhatsApp deep-link driver (T-4.3.0)
- AI reservation drafter via Anthropic (T-4.4.0)

**Phase 5 — Hardening & Growth**

- PWA offline catalog cache via idb (T-5.0.0)
- Locale expansion to de/es/fr/pt-BR (T-5.1.0)
- WCAG 2.2 AA audit + fixes (T-5.2.0)
- Lighthouse perf budgets + CI workflow (T-5.3.0)
- Observability overlay: Prometheus + Grafana (T-5.4.0)
- notif-svc + post-stay review notification (T-5.5.0)
- WhatsApp Business API integration (T-5.6.0)

### Added — Plan-002 (Hardening Retrospective)

- TODO.md + EXECUTION.md bulk doc sync to post-Plan-001 reality (T-2.C.0)
- T-4.1.0 retry (chat WebSocket with proper ws types) (T-2.C.1)
- cs-agent closer-fallback investigation (T-2.C.2)
- Project-wide ESLint test-file overrides for `no-unsafe-*` + `unbound-method` (T-2.C.3)
- Estimate recalibration + lessons learned docs (T-2.C.4 + T-2.C.5)

### Added — Plan-003 (Real-User Readiness)

- k6 load test scripts (token-exchange, discover, place-detail, tour-plan) (T-3.A.0)
- OSRM/IPMA/RabbitMQ chaos drills (T-3.A.1)
- STRIDE threat model (T-3.B.0)
- Secrets rotation playbook (T-3.B.2)
- PII inventory + GDPR DSR playbook (T-3.B.3)
- Backup + recovery runbook (T-3.B.4)
- Beta program selection + invite copy (T-3.C.0)
- Beta feedback + telemetry + dashboard (T-3.C.1 + T-3.C.2 + T-3.C.3)
- Hot-fix + rollback playbook for beta (T-3.C.4)
- Brand mark refresh placeholder (T-3.D.2)

### Documented — Plans 004-005

- Plan-004 Scale & Monetize draft (owner onboarding self-service + multi-tenant + Stripe + marketing + Capacitor)
- Plan-005 Operate draft (SLO/SLA + incident response + customer support + FinOps + continuous improvement)

### Repo infrastructure

- Comprehensive top-level README (PR #115)
- Implementation-plans index (`docs/implementation-plans/README.md`) listing all 5 plans

### External blockers (carried over)

- T-0.4.4 — CI deploy gate to QA VPS (needs Ubuntu 24 acquisition)
- T-3.B.1 — Pen-test (external work)
- T-3.D.0 — Stitch mockups (MCP attempts timed out; needs project DS attachment)
- T-3.D.1 — Real translation review (de/es/fr/pt-BR)
- T-3.D.3 — Stitch v2 polish (chat, daily-tour, admin)
- Real per-place photography
- Authentik realm import to a running instance
- Lighthouse CI first audit (needs deployed staging)

## Session statistics

- **117+ PRs merged** in one autonomous orchestration session
- **~20 hours wall-clock** (with sleep windows during CI)
- **5 implementation plans** outlined (001 implemented, 002-005 outlined)
- **Phase 1-5 of Plan-001**: implementation-complete
- **20+ clean Sonnet/Opus self-commits**, ~12 orchestrator rescues
- **2 closed PRs** (chat WS eslint loop — successfully retried as #98)

---

_Generated with Claude Code Sonnet 4.6 + Opus 4.7 via `/goal proceed with the identified tasks` autonomous-mode authorization._
