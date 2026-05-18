# Plan-005 — Operate

> Sequential after Plan-004 (scaled to 5-10 owners). Plan-005 is the steady-state operations layer: SLO/SLA discipline, incident response maturity, customer support tooling, finops, and the boring continuous-improvement work that turns a shipped product into a sustainable business.

## Premise

Plan-004 takes Daily Tour from "live with one owner" to "live with 5-10 owners + MRR > €500". Plan-005 answers: *how do we run this without it consuming the founder's life?* The answer is a mix of operational maturity (clear SLOs, on-call patterns, runbooks), customer support tooling, finops discipline, and the slow continuous improvements that compound.

## Scope

### Slice 5.A — SLO/SLA discipline

Today there are no published SLOs. **This slice** establishes them and the alerting that surfaces violations.

- T-5.A.0 — SLO definitions: availability (99.5%), p95 latency per endpoint (defined in T-3.A.0 budgets), error rate (<1%), Daily Tour generation time (<60s p95)
- T-5.A.1 — SLI implementation: Prometheus recording rules + Grafana SLO dashboard
- T-5.A.2 — Alerting: Alertmanager → owner Telegram channel for breach of error-budget burn rate
- T-5.A.3 — Quarterly SLO review template + ritual

### Slice 5.B — Incident response

Today incidents are ad-hoc. **This slice** establishes the on-call playbook + post-mortem culture.

- T-5.B.0 — On-call playbook (single founder for v1; rotate when team grows)
- T-5.B.1 — Incident response runbook (sev0/sev1/sev2 definitions + first-15-min checklist)
- T-5.B.2 — Post-mortem template + first 3 historical retroactive post-mortems (from the beta period if any incidents occurred)
- T-5.B.3 — Incident communication templates (status page, customer notification, internal slack)

### Slice 5.C — Customer support tooling

Owners need a way to reach the founder for support. Guests need a way to reach owners for support.

- T-5.C.0 — Owner support inbox (email forwarder + n8n routing to founder Telegram + Linear ticket creation)
- T-5.C.1 — Guest-to-owner support contact (already covered by chat-hub WhatsApp/Telegram drivers)
- T-5.C.2 — In-app "report a bug" flow (already in T-3.C.1 feedback but adds bug-tag + auto-route to GitHub issues)
- T-5.C.3 — Knowledge base at /help — public FAQ + troubleshooting; ~20 articles

### Slice 5.D — FinOps

Track unit economics + cloud spend to inform pricing decisions.

- T-5.D.0 — Cost allocation tagging on all cloud resources (per-environment, per-service)
- T-5.D.1 — Cost-per-tour-plan analysis (Anthropic API + compute + DB I/O)
- T-5.D.2 — Monthly cloud-cost report + finance dashboard
- T-5.D.3 — Cost-cutting playbook (right-size DB, archive old analytics, autoscale rules)

### Slice 5.E — Continuous improvement

The boring-but-compounding work that keeps the product healthy.

- T-5.E.0 — Quarterly dependency-update sprint (Renovate PRs + audit)
- T-5.E.1 — Monthly security patch sprint (CVE tracker + audit response)
- T-5.E.2 — Quarterly tech-debt sprint (top 10 issues from `docs/ai/lessons/` + `docs/ai/backlog.md`)
- T-5.E.3 — Annual major-version Node + Python upgrade plan
- T-5.E.4 — Monthly UX research synthesis from beta + support tickets

## Exit criteria

- SLOs published + alerts firing in production
- ≥3 post-mortems written (real or retrospective)
- /help knowledge base with ≥20 articles
- Cost-per-tour-plan tracked + reported monthly
- Quarterly dependency-update cadence established
- Founder confident operating the system without the original orchestrator daily

## Dependencies

- Plan-004 complete (5+ owners onboarded)
- Real production traffic to establish baselines
- Founder bandwidth for operational discipline (not just feature work)

## Estimated wall-clock

Plan-005 is the *operate* phase — it never really "ends". The initial setup is 40-60h of orchestrator engagement, then it transitions to a quarterly cadence.

## Open questions for Plan-005 kickoff

1. **SLO publication audience** — public status page or only owner-facing? Public adds trust but commits to transparency on breaches.
2. **Status page provider** — atlassian statuspage, instatus, self-hosted (cachet)? Cost vs ops effort.
3. **Help docs platform** — MDX in the PWA `/help` route, or external (Notion/HelpScout)? In-app is better for SEO but harder to update.
4. **Incident sev definitions** — what constitutes a P0 for a guesthouse companion? Probably "guest can't see their token" + "owner can't take new bookings".
5. **Cost target** — what's the cost-per-active-guest ceiling? Probably €0.10/month including LLM costs.

## Plan-005 closes the "MVP → operating business" arc

After Plan-005, the founder should be able to:
- Take a 2-week vacation without prod going down
- Onboard a new owner without writing code
- Refute a billing dispute with audit-trail data
- Run the quarterly tech-debt sprint with 1 day of agent orchestration

If those things aren't true, Plan-005 isn't done.
