# Estimate Recalibration — Plan-001 Post-Mortem (2026-05-17)

> Derived from EXECUTION.md wave logs (Waves 1–28). Plan-001 shipped 83/84 tasks across 5 phases and ~100 PRs in a single session burst.

---

## Raw Data — Predicted vs Actual

All times are wall-clock minutes (agent + orchestrator). "Rescue" tasks include orchestrator manual completion time.

| Task | Profile | Complexity | Predicted (min) | Actual (min) | Ratio | Notes |
|------|---------|------------|-----------------|--------------|-------|-------|
| T-0.1.1 | Opus | Low | 45 | 13 | 0.29 | Repo scaffold |
| T-0.1.2 | Sonnet | Low-Med | 40 | 23 | 0.58 | ESLint/Prettier |
| T-0.1.3 | Sonnet | Medium | 35 | 22 | 0.63 | lefthook + gitleaks |
| T-0.1.4 | Opus | Med-High | 50 | 28 | 0.56 | GH Actions CI |
| T-0.2.0 | Sonnet | High | 75 | 60 | 0.80 | 14 zod schemas + 50 tests |
| T-0.2.1 | Sonnet | Medium | 55 | 55 | 1.00 | OTel SDK + CVE bump |
| T-0.4.2 | Opus | Medium | 75 | 80 | 1.07 | BFF skeleton + CVE (two-session) |
| T-0.4.3 | Opus | Medium | 43 | 21 | 0.49 | Compose overlay (IPv4-pin discovery) |
| T-1.0.0 | Sonnet | Low (agent) / High (orch) | 63 | 77 | 1.22 | CVE + port-remap dominated orch time |
| T-1.0.1 | Opus | High (rescue) | 105 | 60 | 0.57 | Opus crashed @40%; custom migrator |
| T-1.0.2 | Opus | High (rescue) | 88 | 35 | 0.40 | Opus crashed @70%; tests by orch |
| T-1.0.3 | Sonnet | Medium | 53 | 18 | 0.34 | PWA token route + Zustand |
| T-1.1.0 | Sonnet | Medium | 75 | 21 | 0.28 | Drizzle schema (mirror template) |
| T-1.1.1 | Sonnet | High (rescue) | 88 | 40 | 0.45 | Crashed @50%; orch wrote ~50% |
| T-1.1.2 | Sonnet | Med-High (rescue) | 68 | 50 | 0.74 | Crashed @80%; SQL done, TS by orch |
| T-1.2.0 | Sonnet | High | 88 | 35 | 0.40 | BFF discover aggregator |
| T-1.2.1 | Sonnet | Medium | 93 | 14 | 0.15 | PWA home grid |
| T-1.2.2 | Sonnet | Medium | 75 | 35 | 0.47 | 4 UI components |
| T-1.2.3 | Sonnet | High | 115 | 33 | 0.29 | Action drill-down + virtualisation |
| T-1.3.0 | Sonnet | Med-High | 68 | 35 | 0.51 | BFF place hydrated |
| T-1.3.1 | Sonnet | Medium | 75 | 27 | 0.36 | MapLibre setup |
| T-1.3.2 | Sonnet | High | 105 | 19 | 0.18 | Place Detail route (all 6 features) |
| T-1.4.0 | Sonnet | High | 98 | 26 | 0.27 | New microservice (mirror pattern) |
| T-1.4.1 | Sonnet | Medium | 75 | 17 | 0.23 | Transcode worker |
| T-1.5.0 | Sonnet | Medium | 75 | 27 | 0.36 | Public landing |
| T-1.6.0 | Opus | High | 120 | 17 | 0.14 | Authentik blueprint + JWKS |
| T-1.6.1 | Sonnet | Medium | — | 15 | — | Backoffice shell |
| T-1.7.0 | Sonnet | Medium | 75 | 14 | 0.19 | i18n namespace refactor |
| T-1.7.1 | Sonnet | Medium | 75 | 15 | 0.20 | PWA install banner |

---

## Analysis by Task Class

### Class A — Phase 0 Infra / Config (Waves 1–8)
Tooling setup, shared packages, CI, Compose overlays. Actual times varied widely because CVE fixes and cross-cutting config issues (port remaps, nvm hooks, OTel API breaks) added orchestrator overhead that estimates didn't account for.

| Stat | Value |
|------|-------|
| Predicted range | 35–75 min |
| Actual range | 13–80 min |
| Median ratio | ~0.55 |
| Outlier | T-0.4.2 (CVE + two-session = 1.07×) |

**Recalibrated brackets**:
- Low complexity (scaffold, config): **10–20 min**
- Medium complexity (shared package + CVE exposure): **25–55 min**
- High complexity (shared package + breakage discovery): **55–90 min**

### Class B — Service Skeleton (Schema + CRUD)
New Fastify/FastAPI services from first principles or mirror templates.

| Task | Predicted | Actual | Ratio |
|------|-----------|--------|-------|
| T-1.0.1 (token-svc endpoints) | 90–120 | 60 | 0.57 |
| T-1.1.1 (catalog-svc CRUD) | 75–100 | 40 | 0.45 |
| T-1.4.0 (media-svc new) | 75–120 | 26 | 0.27 |
| T-2.0.0 (search-svc skeleton) | 60–90 | ~25 est. | ~0.33 |

Mirror template tasks (T-1.1.0, T-2.0.0) are dramatically faster than ground-up tasks. The gap between 45% and 27% is the mirror template effect.

**Recalibrated brackets**:
- New microservice, no mirror: **45–75 min**
- New microservice, mirror template available: **20–35 min**
- Schema-only task (Drizzle/Alembic): **15–25 min**

### Class C — PWA Component / Route Work (Phase 1+)
React components, routes, hooks, tests. This is where estimates were most systematically off — predictions of 60–130 min shipped in 14–35 min.

| Task | Predicted | Actual | Ratio |
|------|-----------|--------|-------|
| T-1.2.1 (home grid) | 75–110 | 14 | 0.15 |
| T-1.2.2 (4 components) | 60–90 | 35 | 0.47 |
| T-1.2.3 (drill-down + virtualisation) | 100–130 | 33 | 0.29 |
| T-1.3.1 (MapLibre) | 60–90 | 27 | 0.36 |
| T-1.3.2 (Place Detail) | 90–120 | 19 | 0.18 |
| T-1.7.0 (i18n refactor) | 60–90 | 14 | 0.19 |
| T-1.7.1 (install banner) | 60–90 | 15 | 0.20 |

**Recalibrated brackets**:
- Medium PWA (2–4 components or 1 route): **15–25 min**
- Medium-high PWA (1 route + 4+ features + tests): **25–40 min**
- High PWA (complex route + 5+ features + virtualisation + Playwright): **35–55 min**

The 60–130 min range for PWA work was based on human-pace assumptions. Sonnet works 4–7× faster on well-scoped UI tasks.

### Class D — BFF Aggregator / Auth Integration
New BFF routes with service-to-service wiring and test coverage.

| Task | Predicted | Actual | Ratio |
|------|-----------|--------|-------|
| T-1.0.2 (auth middleware + Redis) | 75–100 | 35 | 0.40 |
| T-1.0.3 (PWA token route) | 45–60 | 18 | 0.34 |
| T-1.2.0 (discover aggregator) | 75–100 | 35 | 0.40 |
| T-1.3.0 (place hydrated) | 60–75 | 35 | 0.51 |

**Recalibrated brackets**:
- Simple BFF route (thin proxy): **15–25 min**
- BFF aggregator (multi-service join): **25–40 min**
- BFF auth surface (new auth plugin/posture): **30–50 min**

### Class E — Opus-class High Complexity (Auth, Infra)
Tasks marked `[opus]` in TODO.md for their non-mechanical nature.

| Task | Predicted | Actual | Ratio |
|------|-----------|--------|-------|
| T-0.1.4 (GH Actions) | 50 | 28 | 0.56 |
| T-0.3.0 (Compose infra) | 60 | ~25 est. | ~0.42 |
| T-0.4.3 (Compose app overlay) | 43 | 21 | 0.49 |
| T-1.6.0 (Authentik + JWKS) | 90–150 | 17 | 0.14 |
| T-3.0.0 (planner skeleton) | 60–90 | ~25 est. | ~0.33 |

The T-1.6.0 result (0.14×) was the biggest surprise — the most complex auth task in the plan shipped faster than any other. This is a caution against treating Opus as "slow because complex."

**Recalibrated brackets**:
- Opus infra/config: **15–30 min**
- Opus auth surface (new realm/posture): **20–45 min**
- Opus new service skeleton: **20–35 min**

---

## Summary: Recommended New Brackets

| Task class | Old "medium" bracket | Old "high" bracket | **New medium** | **New high** |
|---|---|---|---|---|
| Infra / config | 35–55 min | 60–90 min | 20–35 min | 35–60 min |
| Shared package (with CVE exposure) | 55–75 min | 75–120 min | 25–45 min | 45–75 min |
| New microservice (no mirror) | 75–100 min | 90–120 min | 30–50 min | 50–75 min |
| New microservice (mirror available) | 60–90 min | 90–120 min | **15–30 min** | 30–50 min |
| BFF route / aggregator | 60–100 min | 90–120 min | **20–35 min** | 35–55 min |
| PWA component / route | 60–90 min | 90–130 min | **15–25 min** | **30–50 min** |
| Opus auth / blueprint | 90–150 min | 120–180 min | **20–40 min** | 40–65 min |

**Single rule of thumb**: divide legacy estimates by 3–5 for Sonnet on well-scoped mechanical tasks; by 3–4 for Opus on insight-required tasks. Tasks that require orchestrator CVE/rescue cycles get a flat +20–30 min surcharge.

---

## Context and Caveats

1. **Prompts were highly detailed.** EXECUTION.md prompts included explicit file ownership, reference implementations, acceptance criteria, and parallelism constraints. Vaguer prompts would inflate times.
2. **Phase 2–5 tasks are not in this dataset.** They were captured in TODO.md stub format without per-wave timing. Anecdotally, they maintained the same ~0.25–0.40 ratios based on PR density (28 PRs in ~3 hours).
3. **Rescue tasks are not pure agent time.** T-1.0.1, T-1.0.2, T-1.1.1, T-1.1.2 include orchestrator manual-completion overhead. A zero-crash session would push those ratios to ~0.20–0.35.
4. **Parallel pairs add throughput without changing per-task time.** Running 2 agents simultaneously (e.g., Waves 11+12, 21+22) halves wall-clock per task-pair; the individual ratios above are single-agent.
