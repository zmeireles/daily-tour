# Security Documentation

This directory collects security artifacts for the Daily Tour project. It is complementary to — not a replacement for — the operational controls documented in [`docs/exploration/04-tech-stack.md §4`](../exploration/04-tech-stack.md) and the risk register in [`docs/REQUIREMENTS.md §10`](../REQUIREMENTS.md).

---

## Documents

| File | Date | Purpose |
|------|------|---------|
| [`threat-model-2026-05-18.md`](./threat-model-2026-05-18.md) | 2026-05-18 | STRIDE threat model for auth, media, chat, planner, and BFF surfaces |
| [`secrets-rotation-playbook.md`](./secrets-rotation-playbook.md) | 2026-05-18 | Rotation procedures for all 16 secrets across the stack |
| [`pii-inventory-gdpr.md`](./pii-inventory-gdpr.md) | 2026-05-18 | PII field inventory across all schemas + GDPR DSR playbook (SAR, erasure, rectification, portability) |

---

## Threat model update cadence

Re-run a full STRIDE pass when any of the following occur:

- A new public-facing endpoint is added to the BFF
- The owner auth flow changes (Authentik blueprint, audience claims, JWKS URL)
- A new chat driver is implemented (WhatsApp Business API, Signal, etc.)
- An internal service is added to `dt_internal` that handles user-controlled input
- After a CVE-response bump to a security-critical package (Authentik, n8n, Fastify, jose)
- Before each major phase deploy (Phase 2.A production, Phase 3 beta)

---

## Operational security controls (elsewhere)

These controls exist but are documented outside this directory:

| Control | Location |
|---------|---------|
| CVE floor pins for all major packages | `docs/exploration/04-tech-stack.md §4` |
| `pnpm audit --prod` + `pip-audit` + `trivy` in CI | `.github/workflows/` |
| `gitleaks` pre-commit + CI | `lefthook.yml` + CI workflow |
| Token-in-URL hygiene (D15) | `docs/REQUIREMENTS.md §3` |
| LLM guardrails (D14) | `docs/REQUIREMENTS.md §3` + `docs/exploration/03-architecture.md §6` |
| Auto-merge doctrine (security-config changes never auto-merged) | `docs/operations/auto-merge-doctrine.md` |
| Secret tier registry | `~/.claude/docs/secret-tier-registry.md` |

---

## Pre-production security checklist

Before Phase 2.A production deploy, resolve all **P0** and **P1** items from the threat model risk summary. Quick reference:

- [ ] **RA-47** — CORS restricted to production origin (not wildcard)
- [ ] **RA-48** — CSP baseline implemented (`default-src 'self'` + explicit exceptions)
- [ ] **RA-17** — Owner MFA enforced in Authentik
- [ ] **RA-23** — Multi-tenant isolation CI tests passing
- [ ] **RA-10** — `iss` claim added to guest JWTs and verified in BFF
- [ ] **RA-31** — `TELEGRAM_WEBHOOK_SECRET` required in production config
- [ ] **RA-42** — `anthropic_api_key` declared as `SecretStr` in planner-svc Settings
- [ ] **RA-44** — Per-reservation LLM rate limit (≤3 plans/hour) implemented + Anthropic spend cap set
