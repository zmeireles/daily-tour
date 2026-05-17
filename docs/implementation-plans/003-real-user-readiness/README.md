# Plan-003 — Real-User Readiness

> **Sequential after Plan-002 Slice 2.A (deploy)**. Plan-003 takes the deployed-but-untested system through the gates that separate "compiles + deploys" from "live with paying guests."

## Premise

Plan-002 Slice 2.A delivers a working QA deploy. **Plan-003** answers: *what stops us from accepting real bookings on this system?* The answer is a mix of operational maturity, security posture, beta program design, and content (real photography + reviewed translations).

## Scope

### Slice 3.A — Load + chaos testing

Verify the system under realistic load + intentional disruption.

- T-3.A.0 — k6 load test scripts (token exchange, discover, place detail, daily-tour generation)
- T-3.A.1 — Resilience tests: kill OSRM, kill IPMA, kill RabbitMQ during planner flow; assert graceful degradation
- T-3.A.2 — Database connection-pool sizing + tuning under load
- T-3.A.3 — Service-level rate limit calibration based on observed load patterns

### Slice 3.B — Security audit

Independent security pass before exposing real PII.

- T-3.B.0 — Threat model document (STRIDE on the auth surfaces + media pipeline)
- T-3.B.1 — Penetration test (OWASP ZAP run + manual review of token-svc + Authentik posture)
- T-3.B.2 — Secrets rotation playbook (JWT_SIGNING_KEY, AUTHENTIK_SECRETS, ANTHROPIC_API_KEY, WhatsApp credentials, n8n DB password)
- T-3.B.3 — PII inventory + GDPR data-subject-request playbook
- T-3.B.4 — Backup + recovery runbook (postgres, MinIO, n8n)

### Slice 3.C — Beta program

Design + launch a 10-guest closed beta.

- T-3.C.0 — Beta selection criteria + invite copy (EN + pt-PT)
- T-3.C.1 — Feedback collection mechanism (in-app, after-stay survey via notif-svc)
- T-3.C.2 — Analytics events for beta-specific telemetry
- T-3.C.3 — Beta dashboard for the orchestrator/founder
- T-3.C.4 — Hot-fix rollback playbook for the beta

### Slice 3.D — Content + design completion

Close the loops left open by Plan-002 Slice 2.B.

- T-3.D.0 — Real photography for 28 seeded places (commission OR Unsplash-curated with attribution)
- T-3.D.1 — Human-reviewed translations (de/es/fr/pt-BR + Portuguese-PT polish pass)
- T-3.D.2 — Real brand logo + icon refresh (replace placeholder DT monogram)
- T-3.D.3 — Stitch mockups for v2 surfaces (chat polish, daily-tour timeline polish, admin polish)

## Exit criteria

- 10 beta guests onboarded and active for ≥1 week
- Zero P0/P1 incidents during beta period
- Backup + restore drill passed (full DB + MinIO recovery on a parallel VPS)
- Pen-test report shows no high/critical vulnerabilities open
- Real photography + reviewed translations live on all 28 places
- Founder + 1 staff user proficient with the backoffice via real screenshots/recording
- Lighthouse PWA score ≥90 against the staging URL

## Dependencies

- Plan-002 Slice 2.A complete (QA VPS deployed)
- Plan-002 Slice 2.B complete OR explicitly deferred (design pass)
- Anthropic API key with sufficient quota for ~10 daily-tour generations/day during beta
- WhatsApp Business API account approved
- Beta participants identified

## Estimated wall-clock

Plan-001: ~16h orchestrator engagement for ~50 PRs (with agent runtime).
Plan-003: ~30-40h orchestrator engagement expected (security + load testing carry more iteration; content + translation are slower because they need human review even after agent output).

## Open questions for Plan-003 kickoff

1. **Beta participant identification** — Who are the 10 guests? Friends-and-family, paid testers, or the first real owner's actual upcoming bookings?
2. **Pen-test budget** — Internal pass + ZAP, or hire an external firm?
3. **Photography budget** — Stock + curation is ~free; commission is ~€500-1500.
4. **Translation budget** — Human review at ~€0.10-0.25/word × 6 namespaces × 4 new locales ≈ €500-1500.
5. **GDPR posture** — Hire counsel for the DSR playbook, or use template + self-review?
