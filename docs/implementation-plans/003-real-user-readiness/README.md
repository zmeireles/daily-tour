# Plan-003 — Real-User Readiness

> **Lifecycle: DRAFT (scoped 2026-06-20).** Gated on **Q1** (launch scope: friends-and-family beta on qual **vs** real production cutover). Promote DRAFT→READY once Q1 + the downstream questions are answered, then mint a `TODO.md` with per-task checkboxes from the slices below.
>
> Sequential after Plans 006 (owner backoffice) + 007 (qual VPS), both DONE. Plan-003 takes the feature-complete, qual-deployed system through the gates that separate "runs on the demo box" from "safely serving real EU/PT guests and owners in production."

## Status note — what already exists (so this plan only covers the genuine gap)

A large body of Plan-003's _paper_ was authored in May 2026 against the original stub and then left un-executed. This plan treats those as **drafts to validate + operationalize**, not work to redo:

| Already exists (paper, un-executed)                                                                                                                                                                                                                      | Already exists (working)                                                                                                                                                                                                                                                                                                                                                                                                   | Genuinely missing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STRIDE threat model, secrets-rotation playbook (16 secrets), PII/GDPR inventory + DSR playbook, backup/recovery runbook (RPO/RTO targets), beta program, hotfix/rollback playbook — `docs/security/`, `docs/operations/`, `docs/beta/`, dated 2026-05-18 | qual env live (Traefik+ACME, GHCR, self-hosted runner deploy, Authentik owner auth, guest redeem flow); rate-limiting **registered** on token-svc + BFF auth/exchange/redeem routes; chaos tests (osrm-down, ipma-down); load-test + lighthouse CI workflows; OTel SDK wired in every service; Grafana dashboards + Prometheus/Loki **configs**; a11y audit doc + 1 a11y test; CVE gate (pnpm/pip audit, CodeQL, gitleaks) | **No prod target/overlay** (only dev + qual). **No error tracking** (no Sentry/GlitchTip anywhere). **Observability overlay NOT deployed to qual** (deploy uses base+app+traefik+authentik+qual only). **No backup automation** (runbook is manual prose; zero cron/script/workflow). **No consent/privacy UI** in the PWA; telemetry fires unconditionally. **No axe-in-CI** a11y gate. **No `/ready` readiness probes** (only `/health`; literal TODO at `token-svc/src/routes/health.ts:6`). **i18n half-wired** (only en+pt-PT loaded; de/es/fr on disk, unwired, 79/79/25% coverage). **14 businesses photoless** (owner-upload-blocked). |

Central reframe: **Plan-003 = make the readiness real** — wire what the docs already describe, verify it against live qual, then cut prod.

---

## Premise

Plans 002/006/007 produced a feature-complete guest+owner product running on a single **qual** VPS for a demo audience. **Plan-003 takes it to a state where real EU/PT guests and owners can be served safely on a dedicated production environment** — a separate prod target with a clean promotion path; error tracking + alerting + deployed dashboards so we _see_ failures; automated, drill-tested backups so we don't _lose_ PII; the GDPR/consent surface real users legally require; and an accessibility + i18n bar adequate for the launch locales. The bar is **"a stranger's real reservation goes end-to-end, a failure pages us, and a disk loss is recoverable."** Growth, payments, and steady-state SLOs are explicitly NOT in scope (Plans 004/005).

---

## Task-ID scheme

`T-3.<slice>.<task>` (e.g. `T-3.A.0`), matching the repo's `T-<phase>.<slice>.<task>` convention. Phase = 3; slices A–H.

---

## Slices

### Slice 3.A — Observability in production reach · Size: L

_Rationale: you cannot safely cut to prod for strangers if you can't see errors. Lands first — every later slice's "verify on qual" depends on it._ **deps: none (foundational).**

- **T-3.A.0** — Add error tracking. Stand up self-hosted **GlitchTip** (Sentry-API-compatible, EU self-host) as a compose service; wire `@sentry/node` in the Node services (`bff`, `token-svc`, `catalog-svc`, `chat-hub`, `media-svc`, `notif-svc`) and `@sentry/react` in `apps/pwa`; DSN via env. Touches: new `infra/compose/overlay.errors.yml` (or fold into observability), each service `app.ts`/`server.ts` bootstrap, `apps/pwa/src/main.tsx`, `.env.qual.example` + `.env.prod.example`.
  - **AC:** a thrown error in BFF and an unhandled PWA exception both appear in GlitchTip within 60s with release + service tags; DSN absent ⇒ no-op (no crash).
- **T-3.A.1** — Deploy the observability overlay to qual. Add `overlay.observability.yml` to the `deploy-qa.yml` compose stack; cap resources for the 2-vCPU box; confirm OTel collector → Prometheus → Grafana renders the 4 existing dashboards (bff-latency, error-rate, mq-depth, service-health) with **live qual data**. Touches: `.github/workflows/deploy-qa.yml`, `overlay.qual.yml` (resource caps), Grafana datasource.
  - **AC:** Grafana on qual shows non-empty bff-latency + error-rate panels from real traffic; OTel collector healthy in `docker compose ps`.
- **T-3.A.2** — Uptime + alerting. Add an external uptime check (Cloudflare health-check or self-hosted **Uptime-Kuma**) on the qual apex + `/health`; wire a **Telegram** alert channel (project already uses Telegram) for: any service down ≥2min, error-rate spike, GlitchTip new-issue. Touches: new `infra/uptime/` or Cloudflare config (doc), alert routing config.
  - **AC:** killing `dt_bff` on qual fires a Telegram alert within 3min; recovery fires a resolve.
- **T-3.A.3** — `/ready` readiness probes. Add `/ready` (DB + broker + downstream reachable) distinct from `/health` (liveness) to the Node services that lack it; wire `depends_on: condition: service_healthy` / `--wait` to readiness in qual/prod overlays. Touches: `services/*/src/routes/health.ts` (TODO marker at `token-svc/src/routes/health.ts:6`), overlays.
  - **AC:** `/ready` returns 503 while DB is down and 200 once connected; `compose up --wait` blocks on readiness not just liveness.

### Slice 3.B — Reliability: backups, restore drills, SPOFs · Size: M

_Rationale: the runbook exists on paper with RPO/RTO targets but nothing is automated and no drill has run. Real PII without a tested restore is negligence._ **deps: 3.A (so a backup-failure alerts).**

- **T-3.B.0** — Automate Postgres backup. Implement the runbook's nightly base + WAL (or pragmatic nightly `pg_dump` to start) as a real cron/systemd-timer on the VPS or a scheduled GH workflow, pushing off-site (Backblaze B2 per runbook). Touches: new `scripts/ops/backup-postgres.sh`, cron unit or `.github/workflows/backup.yml`, `docs/security/backup-recovery-runbook.md` (mark automated).
  - **AC:** a backup artifact lands off-site nightly; the script run manually produces a restorable dump; runbook's "manual" rows flip to "automated."
- **T-3.B.1** — Automate MinIO media backup (`mc mirror` to B2, per runbook §off-site). Touches: `scripts/ops/backup-media.sh`, scheduler.
  - **AC:** media bucket mirrored off-site; a deleted-then-restored object round-trips.
- **T-3.B.2** — Run the restore drill the exit criteria demand: full Postgres + MinIO recovery onto a parallel/clean target; record actual RTO vs. the runbook's targets (30/60 min). Touches: `docs/security/backup-recovery-runbook.md` (drill log).
  - **AC:** a wiped-volume clone is restored from off-site backups to a working stack; measured RTO recorded; gaps filed.
- **T-3.B.3** — Disposition the two known SPOFs as _explicit prod decisions_ (not new infra unless cheap): single-instance **chat-hub WS** (no Redis pub/sub fanout — deferred) and **osrm-disabled→haversine**. Document blast radius + the "acceptable for launch scale" call, or implement the cheap mitigation. Touches: `docs/operations/` reliability note.
  - **AC:** a written, human-signed decision per SPOF: accept-for-launch (with the scale ceiling it implies) or implement-now.

### Slice 3.C — Security: validate the paper, harden the live surface · Size: L

_Rationale: threat model + secrets-rotation + pen-test scope are written but unverified against the running qual env. Convert prose to attested controls before prod._ **deps: 3.A (observe attacks).**

- **T-3.C.0** — Re-run the STRIDE threat model against the **current** surface (host→guest chat reply shipped, reservations issue/revoke, real LLM planner — all post-date the 2026-05-18 doc) and reconcile. Touches: `docs/security/threat-model-2026-05-18.md` → dated revision.
  - **AC:** every public BFF route + guest-redeem + owner-auth + chat-WS path has a current STRIDE row; new-since-May surfaces added.
- **T-3.C.1** — Automated pen pass: OWASP **ZAP baseline** scan against qual (manual or scheduled job) + manual review of token-svc redeem lifecycle + Authentik posture. Touches: new `scripts/ops/zap-baseline.sh` or `.github/workflows/zap.yml`.
  - **AC:** ZAP report attached; zero High/Critical open (or each with a filed exception); redeem token can't be replayed after use/expiry.
- **T-3.C.2** — Make secrets-rotation real: a `gen-env-prod.sh` (mirroring `gen-env-qual.sh`) generating fresh secrets + a documented one-pass rotation drill for Tier-2/3 secrets (JWT_SIGNING_KEY, Authentik, ANTHROPIC, DB passwords) tied to the secret-tier registry. Touches: `scripts/qual/gen-env-qual.sh` sibling `scripts/prod/gen-env-prod.sh`, `docs/security/secrets-rotation-playbook.md`.
  - **AC:** rotating JWT_SIGNING_KEY on qual via the playbook invalidates old guest JWTs and new logins work; rotation time recorded.
- **T-3.C.3** — Abuse hardening review: confirm rate-limits cover the _unauthenticated_ guest-redeem + discover + tour-generate paths (today limits are on token-svc issue/revoke + BFF auth/exchange — verify the LLM-cost endpoint `/v1/tour-plans` and `/v1/discover` are covered) + add input-size caps on chat + tour intake. Touches: `services/bff/src/routes/*` (tour-plans, discover), `services/chat-hub`.
  - **AC:** `/v1/tour-plans` rejects beyond N/min/guest (protects Anthropic spend); oversized chat/intake payloads return 413.

### Slice 3.D — Legal / GDPR compliance surface · Size: L · ⛔ HARD GATE

_Rationale: serving real EU/PT PII without a privacy policy, lawful-basis + consent, and working data-subject rights is a legal non-starter. Gates "real guest" regardless of engineering readiness — blocks 3.H._ **deps: 3.D.0 needs counsel/template decision (Q5).**

- **T-3.D.0** — Privacy policy + cookie/consent page (en + pt-PT), legally reviewed (template + counsel review — Q5). Touches: new PWA routes `/privacy` + `/terms`, `apps/pwa/src/locales/{en,pt-PT}/legal.json`.
  - **AC:** `/privacy` and `/terms` render in both locales; linked from guest entry + footer; content covers data collected, lawful basis, retention, contact.
- **T-3.D.1** — Consent mechanism for analytics/telemetry. Today telemetry (`/v1/telemetry/tour`) fires unconditionally; gate non-essential telemetry behind consent; essential-cookies-only by default. Touches: `apps/pwa` consent banner component, telemetry call sites, `analytics` schema note.
  - **AC:** with consent declined, no telemetry events emit (verified in network tab + empty `analytics.tour_event`); accept ⇒ events flow.
- **T-3.D.2** — Operationalize the DSR playbook: turn `pii-inventory-gdpr.md` prose into runnable scripts for **access (SAR export)** and **erasure** across the inventoried schemas (`auth_tokens.guest`, chat, planner, analytics). Touches: `scripts/ops/dsr-export.sh`, `scripts/ops/dsr-erase.sh`, runbook update.
  - **AC:** given a guest reservation id, the export script emits all stored PII as JSON; the erase script removes/anonymizes it and the guest's chat+plans are gone, referential integrity intact.
- **T-3.D.3** — Data-retention enforcement: implement the retention windows the PII inventory states (expire guest JWTs/tokens, purge stale chat/plans) as a scheduled job. Touches: `scripts/ops/retention-sweep.sh` + scheduler.
  - **AC:** records past the documented retention window are purged on schedule; a dry-run reports what would be deleted.

### Slice 3.E — Production environment + promotion path · Size: L

_Rationale: qual is the demo box. Real users need a separate prod target so qual stays a safe staging ground. Depends on A/B/C/D being real because prod inherits them. This is the cutover._ **deps: 3.A, 3.B, 3.C, 3.D real on qual first.**

- **T-3.E.0** — Provision/confirm the prod target + DNS + TLS (mirror the 007 qual pattern). Gated on hosting target + domain (Q2). Touches: new `infra/compose/overlay.prod.yml` (sibling of `overlay.qual.yml`), `overlay.prod-authentik.yml`, Cloudflare DNS for the prod host.
  - **AC:** prod apex resolves with a trusted cert; the 8-point smoke (same as qual) passes; prod is a _distinct_ DB/MinIO/Authentik instance from qual.
- **T-3.E.1** — Promotion workflow: `deploy-prod.yml` (sibling of `deploy-qa.yml`) deploying a **qual-validated image tag** to prod (promote-by-tag, no rebuild), with the auto-rollback step qual already has. Touches: `.github/workflows/deploy-prod.yml`, `scripts/prod/gen-env-prod.sh` (3.C.2).
  - **AC:** a tag green on qual deploys to prod via one dispatch; a forced smoke-fail triggers auto-rollback to the previous tag.
- **T-3.E.2** — Prod env generation + secrets (consumes 3.C.2); seed prod with the real 43-place catalog + Miguel's guesthouses; fold in the qual data-fixes that were only ever applied to the live qual DB (picks re-point, guesthouse action-tag delete, Unsplash purge — **not in committed seed**, per handoff). Touches: seed scripts, `docs/DEPLOYS.md`.
  - **AC:** fresh prod deploy renders the correct catalog (landmarks as picks, no lodging in tours, no Unsplash placeholders) **from committed config** — qual hand-fixes folded into seed so prod is reproducible (007 reproducibility pattern).

### Slice 3.F — Content readiness · Size: M

_Rationale: 14 businesses still show the branded fallback; launch locales need real strings. Parallelizable with 3.G._ **deps: none (content track).**

- **T-3.F.0** — Resolve the 14 owner-upload-blocked business photos: either source licence-clean images (Commons/owner-supplied via the existing media-svc uploader, the lawful path) or make the branded fallback an explicit launch decision. Touches: seed `place_media`, `places-seed.test.ts` counts.
  - **AC:** every reachable place has a real photo or an intentional, on-brand fallback signed off; `places-seed.test.ts` counts updated.
- **T-3.F.1** — Decide + execute the launch-locale i18n set. If en+pt-PT only: formally descope de/es/fr (already unwired) + document. If de/es/fr in scope: wire them in `lib/i18n/index.ts` + human-review the strings (currently 79/79/25% machine-grade) + `check:i18n` gate. Touches: `apps/pwa/src/lib/i18n/index.ts`, `apps/pwa/src/locales/README.md`, locale JSON.
  - **AC:** every wired locale is 100% parity + human-reviewed; `check:i18n` green; unwired locales explicitly documented as out-of-launch.

### Slice 3.G — Accessibility + performance bar · Size: M

_Rationale: there's a May a11y audit doc + 1 test but no CI gate; Lighthouse budgets exist but the desktop redesign just landed unaudited. Parallelizable with 3.F._ **deps: 3.A (observe load).**

- **T-3.G.0** — Full WCAG 2.2 AA pass on the 5 **desktop + mobile** guest screens (the editorial redesign hardened some contrast but no full pass post-redesign); fix serious/critical violations. Touches: `apps/pwa/src/**`, `apps/pwa/docs/a11y-audit-2026-05-17.md` → refreshed.
  - **AC:** axe reports zero serious/critical across all 5 screens at mobile + desktop breakpoints; refreshed audit doc.
- **T-3.G.1** — Wire **axe-into-CI** so a11y regressions fail the build (extend `a11y.test.tsx` to cover all routes, or add Playwright+axe per-route). Touches: `apps/pwa/src/__tests__/a11y.test.tsx` or `e2e/`, `ci.yml`.
  - **AC:** CI fails on an injected serious a11y violation; passes clean on main.
- **T-3.G.2** — Real-network/Core-Web-Vitals + load validation: confirm the Lighthouse budget gate reflects the desktop redesign; run the existing `load-test.yml` k6 suite against qual and tune DB connection-pool sizing under observed load. Touches: `.github/workflows/lighthouse.yml` budgets, `load-test` scripts, service pool config.
  - **AC:** Lighthouse PWA ≥90 on the staging URL (exit criterion); k6 run sustains target concurrency with p95 within budget; pool sizing documented.

### Slice 3.H — Onboarding, support, and closed beta · Size: L

_Rationale: the beta program + hotfix/rollback playbooks exist on paper; execute them once A–G make the system safe. Last because it consumes everything and exposes real users._ **deps: 3.E (prod), 3.D (legal gate), 3.A (observe the beta), 3.B (recover if it breaks).**

- **T-3.H.0** — Guest + owner onboarding: a first-run guest orientation on the authed home + an owner onboarding path in `/admin`; a visible **support/contact** route (email or WhatsApp deep-link, which the product already uses). Touches: `apps/pwa` onboarding component, `/admin` empty-states, footer/contact.
  - **AC:** a brand-new guest token lands on a screen explaining what to do; an owner with an empty catalog sees a guided next-step; a contact path is one tap from any screen.
- **T-3.H.1** — Validate the hotfix/rollback playbook against the **prod** deploy (3.E): dry-run rollback on prod's promote-by-tag. Touches: `docs/operations/hotfix-rollback-playbook.md` (validated section).
  - **AC:** a deliberate bad tag is rolled back on prod within the playbook's stated time; playbook steps verified accurate.
- **T-3.H.2** — Execute the closed beta per `docs/beta/beta-program-2026.md`: cohort selection (friends-and-family or owner-1's real bookings — Q1), invite copy (en+pt-PT, exists), feedback survey via notif-svc, beta telemetry events (consent-gated per 3.D.1). Touches: `docs/beta/`, notif-svc survey, analytics events.
  - **AC:** ≥1 real beta guest completes the end-to-end journey on prod (token→discover→tour→chat) with the survey returned and zero P0/P1.

---

## Dependency / execution order

```
Wave 1 (parallel):  3.A Observability   3.F Content   3.G a11y/perf
Wave 2 (parallel):  3.B Reliability     3.C Security        (both need 3.A)
Wave 3 (gate):      3.D Legal/GDPR      (hard gate; doc/counsel track can start in Wave 1)
Wave 4 (cutover):   3.E Production       (needs A,B,C,D real on qual)
Wave 5 (launch):    3.H Onboarding + Beta (needs E,D,A,B)
```

Critical path: **3.A → 3.C/3.B → 3.D → 3.E → 3.H**. 3.F/3.G ride alongside and only gate 3.H.

Suggested first three to execute: **3.A.0 (error tracking), 3.A.1 (observability→qual), 3.B.0 (Postgres backup)** — highest leverage, unblock everything, make every subsequent "verify on qual" step observable.

---

## Risk register

| Risk                                                                                                                               | Likelihood          | Impact                       | Mitigation                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Real PII leaks/loss before D+B are real**                                                                                        | Med                 | Critical (legal + trust)     | 3.D is a HARD GATE blocking 3.H; 3.B restore drill (3.B.2) must pass before prod takes real guests. No real-guest token issued until both attested.                            |
| **Prod cutover (3.E) repeats qual's hand-fix drift** — qual was patched live (picks, action-tags, Unsplash) outside committed seed | High                | High (prod non-reproducible) | 3.E.2 explicitly folds the three qual hand-fixes into committed seed; prod must come up correct from `deploy-prod.yml` with zero manual DB edits, proven by a clean re-deploy. |
| **GDPR DSR/consent done as paper only** (existing pii-inventory is prose)                                                          | High                | Critical                     | 3.D.2/3.D.3 require _runnable_ export/erase/retention scripts with ACs, not doc updates; 3.D.1 verified in the network tab.                                                    |
| **2-vCPU/8GB box can't host observability + GlitchTip + ZAP**                                                                      | Med                 | Med                          | Resource-cap every new service (3.A.1); GlitchTip/ZAP can run scheduled/off-box; prod sizing revisited in 3.E.0 (may need a larger box than qual).                             |
| **Anthropic cost blowout from abuse** on `/v1/tour-plans`                                                                          | Med                 | Med ($)                      | 3.C.3 rate-limits the LLM endpoint per-guest; 3.A.2 alerts on spend spike.                                                                                                     |
| **Single-instance chat-hub WS / haversine** silently caps scale                                                                    | Low (at beta scale) | Low–Med                      | 3.B.3 makes it an explicit signed launch decision with a stated scale ceiling, not an accident; Redis-fanout + osrm re-enable deferred to 004/005.                             |
| **Stale 2026-05-18 security docs trusted as current**                                                                              | Med                 | High                         | 3.C.0 forces a re-validation pass against the post-May surface (chat reply, reservations, real planner) before any control is claimed.                                         |

---

## OUT-of-scope (deferred to 004 / 005)

- **Payments / monetization / direct-booking commerce** → **004 (Scale & Monetize)**.
- **WhatsApp Business API onboarding** (BSP approval) → 004; only the existing `wa.me` deep-link ships in 003.
- **Redis pub/sub multi-replica chat fanout** + **OSRM re-enable** → 004/005 (3.B.3 only _documents_ the SPOF decision; haversine stays).
- **Formal SLOs / on-call rotation / error budgets / steady-state ops** → **005 (Operate)**.
- **Growth analytics, A/B testing, internet-scan crawler, autonomous reservations** → 004.
- **Crawler/auto-ingest of new places** → out (catalog stays curated for launch).
- **#281 chat send-only** — ✅ RESOLVED 2026-06-19 (host→guest reply shipped: #283 chat-hub, #284 BFF, #285 PWA; verified live on qual). Already handled — listed only so it isn't re-scoped here.

---

## Open questions for the human (gate execution)

> **Q1 (DECIDE FIRST — gates the whole plan): Launch scope.** Does "real users" mean a **friends-and-family beta on the existing qual box**, or a **real production cutover serving strangers' PII**?
>
> - If **F&F-on-qual**: 3.E (prod) defers to 004; critical path collapses to 3.A → 3.D-lite (consent + privacy page, lighter DSR) → 3.H; whole plan ~3 slices. Fast, low-risk, but qual is never hardened _as prod_.
> - If **real prod**: the full A→B→C→D→E→H chain is required, 3.D is a non-negotiable legal gate, and Q2–Q5 must be answered _before_ execution starts.
>   Every question below is downstream of this one.

2. **Production hosting target + domain** — same provider/larger box, or managed? What prod domain (e.g. `stay.portugalodyssey.pt` apex vs. a new one)? Blocks 3.E.0.
3. **Error tracking** — self-hosted **GlitchTip** (EU data residency, free, +1 service) vs. **paid Sentry** (less ops; data leaves EU unless EU region). Blocks 3.A.0.
4. **Off-site backup provider** — Backblaze B2 (runbook's pick) acceptable, and who holds the credentials? Blocks 3.B.0/3.B.1.
5. **GDPR posture** — engage counsel for the privacy policy/DSR, or template + self-review? Blocks 3.D.0.
6. **Launch locales** — en+pt-PT only (descope de/es/fr cleanly) or fund human translation review for de/es/fr? Blocks 3.F.1.
7. **14 business photos** — owner-upload sourcing, commission, or accept branded fallback for launch? Blocks 3.F.0.
8. **Pen-test depth** — internal ZAP baseline only, or external firm before real PII? Blocks 3.C.1 scope.

---

## Sizing summary + suggested order

| Order | Slice                   | Size | Profile (suggested)                                              |
| ----- | ----------------------- | ---- | ---------------------------------------------------------------- |
| 1     | 3.A Observability       | L    | `claude-yolo` (cross-cutting infra)                              |
| 2     | 3.B Reliability/backups | M    | `claude-yolo` (ops, touches live box)                            |
| 3     | 3.C Security            | L    | `claude` (secrets) + `claude-sonnet-yolo` (ZAP/threat-model doc) |
| 4     | 3.D Legal/GDPR          | L    | `claude-yolo` (DSR scripts) — gated on counsel decision          |
| 5     | 3.E Production cutover  | L    | `claude` (interactive — live prod, secrets, DNS)                 |
| –     | 3.F Content             | M    | `claude-sonnet-yolo` (parallel, Wave 1)                          |
| –     | 3.G a11y/perf           | M    | `claude-sonnet-yolo` (parallel, Wave 1)                          |
| 6     | 3.H Onboarding + Beta   | L    | `claude-yolo` (consumes all)                                     |

Total: ~6 sequenced slices + 2 parallel tracks — meaningfully **smaller than the old stub's 30–40h estimate**, because the doc-heavy slices (security/PII/backup/beta playbooks) are already written. Plan-003 is mostly _operationalize + verify + cut prod_.

---

## Exit criteria

- Error tracking + deployed dashboards + uptime alerting live on the target env (qual and/or prod per Q1).
- Backup automation running + a restore drill passed (full DB + MinIO recovery, RTO recorded).
- STRIDE re-validated + ZAP shows no open High/Critical; secrets-rotation drill passed.
- Privacy/terms pages live (en+pt-PT); consent gates non-essential telemetry; DSR export/erase + retention sweep are runnable scripts.
- (If prod) prod env reproducible from committed config via `deploy-prod.yml` with auto-rollback; promote-by-tag verified.
- Every reachable place has a real photo or signed-off fallback; wired locales 100% reviewed.
- axe-in-CI green; WCAG 2.2 AA pass on all 5 screens; Lighthouse PWA ≥90 on staging.
- ≥1 real beta guest completes token→discover→tour→chat with survey returned and zero P0/P1.

---

> Superseding note: this README replaces the original 2026-05-18 stub (which was framed against Plan-002 Slice 2.A and a 4-slice load/security/beta/content structure). The prior slices are folded into 3.A/3.B/3.C/3.D/3.F/3.G/3.H here; the security/PII/backup/beta playbooks the stub planned to _author_ already exist in `docs/security`, `docs/operations`, `docs/beta` and are now treated as drafts to operationalize.
