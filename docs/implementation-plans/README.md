# Implementation Plans

Index of all implementation plans for this project.

See [`LIFECYCLE.md`](./LIFECYCLE.md) for the plan lifecycle and conventions.

## Quick Navigation

| #   | Plan                                                         | Status                                  | Tags                                                |
| --- | ------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------- |
| 001 | [Daily Tour MVP Roadmap](./001-roadmap/)                     | ✅ Implementation-complete (99/100)     | `pwa` `tourism` `microservices` `mvp` `roadmap`     |
| 002 | [Deploy / Polish / Productionise](./002-deploy-and-polish/)  | 🟡 Slice 2.C complete; 2.A + 2.B blocked on externals | `deploy` `design` `retrospective` `qa-vps` |
| 003 | [Real-User Readiness](./003-real-user-readiness/)            | 🟡 Slices 3.A/3.B/3.C complete; 3.D partial | `load-test` `security` `beta` `content`        |
| 004 | [Scale & Monetize](./004-scale-and-monetize/)                | 📋 Draft                                | `multi-tenant` `billing` `marketing` `mobile`       |
| 005 | [Operate](./005-operate/)                                    | 📋 Draft                                | `slo` `incident-response` `support` `finops`        |

## Statistics

| Metric                  | Count |
| ----------------------- | ----- |
| Total Plans (numbered)  | 5     |
| Implementation-complete | 1     |
| In progress (blocked on externals) | 2 |
| Draft                   | 2     |

## Arc

The 5 plans tell the lifecycle of a software product:

- **001** — *Build the thing*. 100 tasks across 5 phases. 99 done.
- **002** — *Make it deployable + polished*. Hardening retrospective + first deploy + design pass.
- **003** — *Validate with real users*. Load + chaos + security + closed beta + content.
- **004** — *Scale + monetize*. Self-service onboarding + multi-tenant + Stripe + marketing + native shell.
- **005** — *Operate sustainably*. SLOs + incident response + support tooling + FinOps + continuous improvement.

Plans 001-003 are designed to be agent-orchestratable (most tasks shippable via cs-agent). Plans 004-005 increasingly require human-in-the-loop decisions (Stripe, App Store, business strategy).

## Backlog

All pending work is tracked in [`docs/ai/backlog.md`](../ai/backlog.md).
