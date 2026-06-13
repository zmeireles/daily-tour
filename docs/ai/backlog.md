# Backlog

## Active

- **Plan 001 — Daily Tour MVP Roadmap** (Draft → Ready when product owner resolves Q1–Q8 in [`REQUIREMENTS.md §11`](../REQUIREMENTS.md#11-open-questions--decisions-pending)). Next executable wave: Phase 0 Slice 0.1 starting at `T-0.1.1`. See [`docs/implementation-plans/001-roadmap/`](../implementation-plans/001-roadmap/).

## Planned

- **Phase 1 paper test (risk R1)** — print physical token cards, give to 10 guests across owner's properties, instrument 2nd-visit rate. Kill switch at < 40%. Owned by product, not engineering.
- **Pricing model decision (Q6)** — sizes the LLM cost ceiling and the support-cost ceiling. Blocks final cost-bounded budgets across all phases.
- **WhatsApp Business API onboarding (T-5.6.0)** — calendar item; start early in Phase 4 even though the integration ships in Phase 5.
- **OSRM extract preparation (T-3.3.0)** — fetch São Miguel OSM extract, build OSRM driving profile; needed before Phase 3 Slice 3.3.
- **Translation reviewer recruitment** — Phase 5 locale expansion needs a native pt-BR / de / fr reviewer queue.

## Engineering follow-ups

- **BFF Docker image size: 216 MB vs 200 MB target** (T-0.4.2 / [PR #17](https://github.com/zmeireles/daily-tour/pull/17)). `node:22.22.3-alpine` (~140 MB) + Fastify + OTel + helmet/cors/rate-limit/jwt realistically lands at 210-220 MB. Investigate distroless base, OTel sidecar split, or pruning OTel auto-instrumentations bundle. Revisit during Phase 5 hardening or sooner if image pull latency on the QA VPS becomes a concern. Counter-evidence: the size hasn't grown vs. the agent's first build, so it's a structural ceiling, not a regression.
- **Authentik OIDC provider creation deferred** (T-0.3.2 / [PR #12](https://github.com/zmeireles/daily-tour/pull/12)). Blueprint failed opaquely on Authentik 2026.2.2. Owned by **T-1.6.0** at BFF + JWKS integration time.
- **Authentik forward-auth Proxy Provider binding + outpost wiring deferred** (T-0.3.2). Uncomments the middleware in `infra/traefik/dynamic/middlewares.yml` and adds the label to the n8n container. Owned by a new **T-0.3.4** _or_ rolled into **T-1.6.x**.
- **n8n on dedicated Postgres deferred** (T-0.3.3 / [PR #13](https://github.com/zmeireles/daily-tour/pull/13)). Currently on SQLite for dev. Owned by **Phase 5 hardening**.
- ~~**CI deploy gate to QA VPS blocked** (T-0.4.4).~~ **RESOLVED 2026-06-13 via Plan-007** — `deploy-qa.yml` (self-hosted `qual-vps` runner + GHCR images), qual env live at `qual.stay.portugalodyssey.pt` + reproducible.
- **Stitch MCP mockup generation deferred** (T-0.4.1). Per-implementation: T-1.2.1 Home, T-1.3.2 Place Detail, T-3.1.1 Daily Tour, T-4.1.1 Chat. Also unblocks `docs/design/tokens-light.svg` + `tokens-dark.svg`.

## Done

_(Empty)_
