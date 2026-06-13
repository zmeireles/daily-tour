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

### Slice 2.A — Deploy — ✅ DONE via Plan-007 (2026-06-13), modulo the guest-journey edge

**Implemented by [Plan-007 — Qual VPS Deploy](../007-qual-vps-deploy/README.md)** (amended for a self-hosted-runner + GHCR topology on VPS srv911943; qual apex `qual.stay.portugalodyssey.pt`).

- ✅ T-2.A.0 — VPS provisioned + prepped (Q.1: backup/stop stale stack, swap, ufw + key-only SSH, toolchain)
- ✅ T-2.A.1 — DNS (Cloudflare `qual.stay` + `*.qual.stay`) + ACME prod (LE HTTP-01 per-host); trusted cert + http→https redirect live
- ✅ T-2.A.2 — Authentik realm via `owner-app.yaml` blueprint + akadmin (owner login UAT'd PASS; akadmin→staff made reproducible by #235)
- ✅ T-2.A.3 — all 8 services + PWA (GHCR images) healthy on the qual apex (18 containers)
- ✅ T-2.A.4 — smoke playbook = `dev-smoke.sh` (8/8 in `deploy-qa.yml`) + `dev-env-check.sh --qual`
- ✅ T-2.A.5 — T-0.4.4 closed (`deploy-qa.yml` CI deploy gate)

**Exit criteria — ✅ MET (2026-06-13), via Plan-007.** The close-out UAT (live qual, real browser) verified: **guest journey** (cold `/r/<token>` link → SPA → authed home → `/v1/discover` 200; fixed the same-origin routing in **#234**), **owner login** (akadmin → `/admin`), **owner edit** (Hide/Show toggle round-trip, PUT/DELETE 200; unblocked by the **#238** guesthouse seed / #152), and **hero/attribution over TLS**. The one part not re-exercised on qual is the owner **create-place + photo-upload + publish** deep-flow (the Plan-006 uploaders, dev-UAT'd) — worth a later qual pass, not a deploy blocker.

### Slice 2.B — Design Pass

- T-2.B.0 — Generate 5 Stitch mockups (Home, Place Detail, Discover, Daily Tour, Chat)
- T-2.B.1 — Real brand mark + icon regeneration
- T-2.B.2 — Translation review pass (de/es/fr/pt-BR)
- T-2.B.3 — Photography for 28 places (commission or Unsplash-curated)

### Slice 2.C — Hardening Retrospective

- ✅ T-2.C.0 — TODO.md + EXECUTION.md bulk doc sync to plan-001 reality _(resolved 2026-05-29: TODO.md verified accurate (83/84 done, PR refs intact, only `2026-MM-DD` was in the template instructions — false alarm). EXECUTION.md had a real gap: waves 29+ covering Phases 2-5 (45 tasks across PRs #61-#94) were never logged. Added a single retroactive "Wave 29-bulk" catch-up entry with the full PR→task mapping; flagged that the data needed for T-2.C.4 must be reconstructed from PR/commit timestamps rather than this log.)_
- T-2.C.1 — T-4.1.0 retry (chat WebSocket eslint)
- ✅ T-2.C.2 — cs-agent closer-fallback investigation + fix _(resolved 2026-05-29: not in cs-agent itself — the failure was the GitHub repo's `squash_merge_commit_title=COMMIT_OR_PR_TITLE` falling back to the first commit's headline whenever a branch had >1 commit. Patched the repo to `PR_TITLE` + `PR_BODY` so every squash uses the PR title verbatim. Eliminates the `--subject` workaround on `gh pr merge`.)_
- ✅ T-2.C.3 — Project-wide eslint override for test files (`no-unsafe-*` exemption) _(already shipped: `packages/shared-config/eslint.base.js` lines 15-25 cover `**/__tests__/**` and `**/*.test.*` with the six `no-unsafe-*` and `unbound-method` rules disabled. Scope captured in plan-002 README before verification.)_
- ✅ T-2.C.4 — Estimate recalibration based on actual plan-001 wall-clock data _(resolved 2026-05-30: `docs/implementation-plans/001-roadmap/calibration.md` documents 28 logged-wave data points + Phase 2-5 PR-timestamp sample. Headline finding: late Plan-001 actuals were 0.20× of predictions with a 10-minute floor, far more aggressive than the playbook's current 0.5× correction. Doc recommends shifting the complexity table bands to 10-20 / 20-40 / 40-90 min — pending playbook update.)_
- ✅ T-2.C.5 — Lessons learned doc + agent playbook update _(resolved 2026-05-29: created `docs/ai/lessons/` with L019 (cross-route audit), L020 (nvm + Node 25 PATH drift), L021 (tasks-prod SSH tunnel diagnosis). Appended L017 (squash-merge title setting) + L018 (`cs-agent push` PR title gap) to the cross-project playbook at `~/.claude/docs/agent-playbook.md`.)_

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
