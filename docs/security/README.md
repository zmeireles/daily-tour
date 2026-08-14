# Security Documentation

This directory collects security artifacts for the Daily Tour project. It is complementary to — not a replacement for — the operational controls documented in [`docs/exploration/04-tech-stack.md §4`](../exploration/04-tech-stack.md) and the risk register in [`docs/REQUIREMENTS.md §10`](../REQUIREMENTS.md).

---

## Documents

| File                                                             | Date       | Purpose                                                                                                       |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| [`threat-model-2026-05-18.md`](./threat-model-2026-05-18.md)     | 2026-05-18 | STRIDE threat model for auth, media, chat, planner, and BFF surfaces                                          |
| [`secrets-rotation-playbook.md`](./secrets-rotation-playbook.md) | 2026-05-18 | Rotation procedures for all 16 secrets across the stack                                                       |
| [`pii-inventory-gdpr.md`](./pii-inventory-gdpr.md)               | 2026-05-18 | PII field inventory across all schemas + GDPR DSR playbook (SAR, erasure, rectification, portability)         |
| [`backup-recovery-runbook.md`](./backup-recovery-runbook.md)     | 2026-05-18 | Backup schedule, RPO/RTO targets, restore procedures, and quarterly drill cadence for all stateful components |

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

| Control                                                         | Location                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| CVE floor pins for all major packages                           | `docs/exploration/04-tech-stack.md §4`                               |
| `pnpm audit --prod` + `pip-audit` + `trivy` in CI               | `.github/workflows/`                                                 |
| `gitleaks` pre-commit + CI                                      | `lefthook.yml` + CI workflow                                         |
| Token-in-URL hygiene (D15)                                      | `docs/REQUIREMENTS.md §3`                                            |
| LLM guardrails (D14)                                            | `docs/REQUIREMENTS.md §3` + `docs/exploration/03-architecture.md §6` |
| Auto-merge doctrine (security-config changes never auto-merged) | `docs/operations/auto-merge-doctrine.md`                             |
| Secret tier registry                                            | `~/.claude/docs/secret-tier-registry.md`                             |

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

---

## Audit waivers

Advisories deliberately suppressed in `pnpm.auditConfig.ignoreGhsas`. **Every entry needs a reason, a date, and a review trigger** — `package.json` is JSON and cannot carry a comment, so an undocumented waiver is invisible debt by construction.

The bar for adding one is narrow: **no patched version exists**. If a fix exists, it is a closed-range `pnpm.overrides` entry instead, never a waiver.

| GHSA                                                                     | Package                                                                 | Why waived                                                                                                                                                                                                                                                                                                                           | Added      | Review when                                                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) | `extract-zip` ≤2.0.1 (CVE-2026-56876, CVSS 8.1, symlink path traversal) | **No patched version exists** — the advisory reports `patched: <0.0.0`. Reached only through `@lhci/cli → lighthouse → puppeteer-core → @puppeteer/browsers`, i.e. Lighthouse CI downloading a Chrome build. Dev-only: absent from every `--prod` graph. Exploiting it needs a malicious archive from the browser-download endpoint. | 2026-08-13 | A patched `extract-zip` ships, or `@lhci/cli` / `puppeteer-core` bumps past it. Re-check by removing the entry and re-running `pnpm audit --audit-level=high`. |

⚠️ **A waiver is not a fix.** It suppresses the signal, so the only thing keeping it honest is this table being read. When adding one, prefer the narrowest possible scope — `ignoreGhsas` for a single advisory, never `ignoreCves` for a family.
