# Implementation Plans

Index of all implementation plans for this project.

See [`LIFECYCLE.md`](./LIFECYCLE.md) for the plan lifecycle and conventions.

## Quick Navigation

| #   | Plan                                                        | Status                                                | Tags                                                    |
| --- | ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| 001 | [Daily Tour MVP Roadmap](./001-roadmap/)                    | ✅ Implementation-complete (99/100)                   | `pwa` `tourism` `microservices` `mvp` `roadmap`         |
| 002 | [Deploy / Polish / Productionise](./002-deploy-and-polish/) | 🟡 Slice 2.C complete; 2.A + 2.B blocked on externals | `deploy` `design` `retrospective` `qa-vps`              |
| 003 | [Real-User Readiness](./003-real-user-readiness/)           | 🟡 Slices 3.A/3.B/3.C complete; 3.D partial           | `load-test` `security` `beta` `content`                 |
| 004 | [Scale & Monetize](./004-scale-and-monetize/)               | 📋 Draft                                              | `multi-tenant` `billing` `marketing` `mobile`           |
| 005 | [Operate](./005-operate/)                                   | 📋 Draft                                              | `slo` `incident-response` `support` `finops`            |
| 006 | [Owner Backoffice v2](./006-owner-backoffice/)              | 🟡 In Progress — 6.A (3/15 tasks)                     | `backoffice` `multi-tenant` `media` `scoping` `feature` |

## Statistics

| Metric                  | Count |
| ----------------------- | ----- |
| Total Plans (numbered)  | 6     |
| Implementation-complete | 1     |
| In progress             | 3     |
| Draft                   | 2     |

## Arc

The 5 plans tell the lifecycle of a software product:

- **001** — _Build the thing_. 100 tasks across 5 phases. 99 done.
- **002** — _Make it deployable + polished_. Hardening retrospective + first deploy + design pass.
- **003** — _Validate with real users_. Load + chaos + security + closed beta + content.
- **004** — _Scale + monetize_. Self-service onboarding + multi-tenant + Stripe + marketing + native shell.
- **005** — _Operate sustainably_. SLOs + incident response + support tooling + FinOps + continuous improvement.

Plans 001-003 are designed to be agent-orchestratable (most tasks shippable via cs-agent). Plans 004-005 increasingly require human-in-the-loop decisions (Stripe, App Store, business strategy).

**006** is a **feature plan**, not a lifecycle phase — owner-backoffice maturation pulled forward from the 003/004 readiness arc once the #142 product decisions landed (2026-06-02). It **supersedes Plan-004 Slice 4.B** (multi-owner scoping), reconciling it to the shared-baseline opt-out model.

## Backlog

All pending work is tracked in [`docs/ai/backlog.md`](../ai/backlog.md).
