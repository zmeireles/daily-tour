# Plan-002 — Deploy, Polish, Productionise

> **Plan-001 is implementation-complete (99/100 tasks).** Plan-002 takes the codebase from "compiles + passes CI" to "live in front of real users."

## Scope

Three concurrent thrusts:

### Thrust A — Deploy

Stand up the QA VPS environment + first production-shaped deployment of the daily-tour stack. Currently the entire stack runs only on a developer laptop via Docker Compose; nothing has been live in front of real DNS, real TLS, real Authentik, real Anthropic API, real OSRM tiles.

Outputs:

- QA VPS provisioned (Ubuntu 24, 4-8 vCPU, 16-32 GB RAM)
- Traefik + ACME staging working with `*.qa.dailytour.example`
- Authentik realm imported + first staff user created
- PWA + 6 backend services healthy on `https://qa.dailytour.example`
- T-0.4.4 unblocked + closed
- Smoke-test playbook documented

### Thrust B — Real Design Pass

Replace placeholder visual identity with real designed surfaces:

- Generate Stitch mockups for Home, Place Detail, Discover, Daily Tour, Chat
- Reconcile palette + typography with Stitch outputs
- Replace placeholder PWA icons with real brand mark
- Replace machine-grade translations (de/es/fr/pt-BR) with reviewed human translations OR document quality caveats prominently
- First real photography for the 28 seeded places (vs the shared Unsplash placeholder)

### Thrust C — Hardening Retrospective

Capture lessons learned + technical debt from plan-001:

- T-4.1.0 retry (WebSocket eslint config quirks)
- Docs sync (TODO.md/EXECUTION.md still mostly ⬜ at plan-001-close)
- cs-agent closer-fallback commits — fix the pattern so agents always self-commit
- Lockfile drift after dep additions — automate `pnpm install` post-merge
- ESLint flat-config `no-unsafe-*` for test files — establish project-wide override
- Tests that hit the real database vs mock — current mix is ad-hoc
- "Slow" tasks that turned out fast (Sonnet shipped opus-class infra in ~12 min average) — recalibrate estimates

## Tasks (draft)

### Slice 2.A — Deploy

- T-2.A.0 — Provision Ubuntu 24 QA VPS (manual, blocks the rest)
- T-2.A.1 — DNS + ACME staging for `*.qa.dailytour.example`
- T-2.A.2 — First Authentik realm import + admin user
- T-2.A.3 — Deploy all 7 services + PWA static to QA VPS
- T-2.A.4 — Smoke test playbook (10 critical guest journeys)
- T-2.A.5 — Close T-0.4.4 (CI deploy gate to QA VPS)

### Slice 2.B — Design Pass

- T-2.B.0 — Generate 5 Stitch mockups (Home, Place Detail, Discover, Daily Tour, Chat)
- T-2.B.1 — Real brand mark + icon regeneration
- T-2.B.2 — Translation review pass (de/es/fr/pt-BR)
- T-2.B.3 — Photography for 28 places (commission or Unsplash-curated)

### Slice 2.C — Hardening Retrospective

- T-2.C.0 — TODO.md + EXECUTION.md bulk doc sync to plan-001 reality
- T-2.C.1 — T-4.1.0 retry (chat WebSocket eslint)
- ✅ T-2.C.2 — cs-agent closer-fallback investigation + fix _(resolved 2026-05-29: not in cs-agent itself — the failure was the GitHub repo's `squash_merge_commit_title=COMMIT_OR_PR_TITLE` falling back to the first commit's headline whenever a branch had >1 commit. Patched the repo to `PR_TITLE` + `PR_BODY` so every squash uses the PR title verbatim. Eliminates the `--subject` workaround on `gh pr merge`.)_
- ✅ T-2.C.3 — Project-wide eslint override for test files (`no-unsafe-*` exemption) _(already shipped: `packages/shared-config/eslint.base.js` lines 15-25 cover `**/__tests__/**` and `**/*.test.*` with the six `no-unsafe-*` and `unbound-method` rules disabled. Scope captured in plan-002 README before verification.)_
- T-2.C.4 — Estimate recalibration based on actual plan-001 wall-clock data
- T-2.C.5 — Lessons learned doc + agent playbook update

## Dependencies + Sequence

- Slice 2.A is the long pole (VPS acquisition + DNS may take days)
- Slice 2.C can run entirely in parallel with 2.A — pure repo + agent process work
- Slice 2.B is parallel with both 2.A + 2.C — design work

## Exit criteria

- `https://qa.dailytour.example` resolves + serves the PWA over real TLS
- A guest can complete the full journey: scan QR (token URL) → Home → Eat drill-down → place detail → Call (deep-link works) → return to home → request Daily Tour → receive plan with real OSRM travel times + real IPMA weather → share the tour URL
- An owner can complete the full journey: log in via Authentik → /admin → list places → create new place with photo upload → publish
- All 6 CI checks still green on main
- TODO.md + EXECUTION.md reflect post-plan-001 reality
