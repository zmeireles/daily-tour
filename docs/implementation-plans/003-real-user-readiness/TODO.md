# Plan-003 — Real-User Readiness — TODO

Status: **READY (executing)** — Q1 = **(a) friends-and-family beta on qual** (decided 2026-06-20). Prod cutover (3.E) deferred to Plan-004. Full slice detail + acceptance criteria in [`README.md`](./README.md); this is the (a)-scoped checklist. Task IDs `T-3.<slice>.<task>`.

## Locked decisions

GlitchTip (self-host) · cohort both/mixed (friends → Miguel's real guests) · MinIO backup target (off-site replication TBD in 3.B) · GDPR template + self-review · en+pt-PT launch locales · branded-fallback photos for beta.

## Lean critical path

`3.A → 3.B-lite → 3.C-lite → 3.D-lite → 3.H` · 3.F/3.G light-touch · **3.E DEFERRED → Plan-004**.

## Progress

| Slice | Title                                | (a) scope         | Status                                                 |
| ----- | ------------------------------------ | ----------------- | ------------------------------------------------------ |
| 3.A   | Observability                        | full              | ✅ DONE + LIVE (A.0–A.3; #291–#299,#303)               |
| 3.B   | Reliability — backup + restore drill | lite (→ MinIO)    | ✅ lite DONE (B.0 backup+drill #300); B.1/B.3 deferred |
| 3.C   | Security — abuse/cost hardening      | lite              | ✅ lite DONE (C.3 #301)                                |
| 3.D   | Legal / GDPR                         | lite              | ◑ D.0+D.1 done (#305,#302); D.2 next; **gate CLEARED** |
| 3.E   | Production environment               | **DEFERRED →004** | —                                                      |
| 3.F   | Content                              | light-touch       | ☐                                                      |
| 3.G   | a11y + performance                   | light-touch       | ☐                                                      |
| 3.H   | Onboarding + closed beta             | full              | ◑ H.0 done (#306); H.2 beta UNBLOCKED (3.D.0 ✓ #305)   |

---

## Slice 3.A — Observability · ✅ DONE + LIVE on qual (2026-06-25)

- [x] **T-3.A.0** — **error tracking DONE (2026-06-20).** DSN-gated SDK: `@sentry/node` in the 4 Node svcs (bff/token-svc/catalog-svc/media-svc) + `sentry-sdk` in the 4 Python svcs (chat-hub/notif-svc/planner-svc/search-svc) + `@sentry/react` in pwa (#291). **GlitchTip is NOT self-hosted by us** — Daily Tour is a tenant **org** in the shared `po-glitchtip` instance (https://errors.portugalodyssey.pt, po-platform-owned; postgres:17, nightly backups). DSN + `OTEL_DEPLOYMENT_ENVIRONMENT=qual` wired into qual (#294) + node-image Dockerfile fix for `shared-sentry` (#295); verified live (synthetic ingest HTTP 200, event `fe47cef3`). Repo holds client-config only (`infra/glitchtip/README.md`).
- [x] **T-3.A.1 DONE (#297)** — OTLP→Prometheus bridge (collector `prometheus` exporter :8889) + overlay in `deploy-qa.yml`; bff-latency + error-rate dashboards render live qual data. Surfaced+fixed a latent OTel bug ([[reference-otel-esm-preload]]). Follow-ups: Python http.server gap; mq-depth/service-health dashboards (out of AC).
- [x] **T-3.A.2 DONE (#298, msg-fix #303)** — alertmanager + blackbox-exporter → **Telegram** (ops bot `dt_farol_bot` → group `-5587963851`); rules BlackboxProbeDown + HighServerErrorRate. Verified live: kill-dt_bff → firing + resolve delivered (0 failures). (GlitchTip-new-issue→Telegram deferred — needs a tenant webhook relay.)
- [x] **T-3.A.3 DONE (#299)** — own-DB `/ready` (SELECT 1) on token/catalog/media (Node) + planner/search/chat-hub (Python); 6 healthchecks flipped to `/ready` → gate `up --wait`. (CodeQL: `/ready` needs an explicit per-route rate-limit, CWE-770.)

## Slice 3.B — Reliability (lite)

- [x] **T-3.B.0 DONE (#300)** — `scripts/ops/backup-postgres.sh` (pg_dump both clusters → private `backups` bucket) + `restore-drill-postgres.sh` (throwaway pgvector container, verified RTO ~1s) + **systemd timer installed on the box** (`infra/systemd/dt-backup.{service,timer}`, 01:00 UTC). On-box-only DR **signed for beta**; B2 off-site → 3.B.1.
- [ ] **T-3.B.1** — MinIO media backup (`mc mirror`); deleted-then-restored object round-trips. ⚠️ Resolve off-site replication (same-box MinIO ≠ box-loss DR) — pick a second location or sign off on-box-only for beta.
- [ ] **T-3.B.2** — Restore drill: full Postgres + MinIO recovery onto a clean target; record RTO.
- [ ] **T-3.B.3** — SPOF disposition (chat-hub single-instance WS, haversine) — signed accept-for-beta with the scale ceiling.

## Slice 3.C — Security (lite)

- [x] **T-3.C.3 DONE (#301)** — per-guest rate-limits (JWT-decode keyGenerator): `/v1/tour-plans` 5/min, `/v1/discover` 30/min; `bodyLimit` 16KB → 413 + `wishes[]` 120-char cap; defensive chat-hub draft caps. Live-verified 429 on the 6th tour-plans. (In-memory store — fine for single-BFF beta.)
- [ ] _(deferred for beta)_ T-3.C.0 STRIDE re-validate · T-3.C.1 ZAP baseline · T-3.C.2 secrets-rotation drill — promote if cohort widens beyond F&F.

## Slice 3.D — Legal / GDPR (lite) · ⛔ gate before real guests

- [x] **T-3.D.0 DONE (#305)** — Privacy + terms **copy** (en + pt-PT) merged into `apps/pwa/src/locales/{en,pt-PT}/legal.json` + `routes/{privacy,terms}.tsx`; linked from guest entry + footer (#306). **Clears the 3.D "⛔ before real guests" gate** → 3.H.2 beta unblocked on legal. (Goes live on the next qual deploy.)
- [x] **T-3.D.1 DONE (#302)** — persisted consent store (default essential-only) + banner above the router (both shells) + 1-line gate on `emit()`; declined ⇒ no `/v1/telemetry/tour`. pt-PT linter clean. Verified: banner in the bundle, gate unit-tested.
- [ ] **T-3.D.2** — Basic DSR: runnable export + erase scripts for a guest's PII (lighter than full prod automation, but real).
- [ ] _(deferred for beta)_ T-3.D.3 scheduled retention sweep — promote when the beta widens.

## Slice 3.F — Content (light-touch)

- [ ] **T-3.F.0** — Accept branded fallback for the 14 photoless businesses for the beta (real photos = owner/content follow-up); OR source 1–2 licence-clean landmark photos to exercise the Place-Detail gallery (the deferred rich-path item).
- [ ] **T-3.F.1** — Confirm en+pt-PT launch set; document de/es/fr as out-of-launch.

## Slice 3.G — a11y + performance (light-touch)

- [ ] **T-3.G.1** — Wire axe-into-CI (quick pass over the 5 screens); fail on serious/critical.
- [ ] _(deferred for beta)_ T-3.G.0 full WCAG 2.2 AA cycle · T-3.G.2 k6 load tune — promote post-beta.

## Slice 3.E — Production environment · DEFERRED → Plan-004

Qual is the beta box; no separate prod env this plan.

## Slice 3.H — Onboarding + closed beta

- [x] **T-3.H.0 DONE (#306)** — Guest first-run orientation + owner onboarding empty-states + a visible support/contact path. Merged + deployed to qual (2026-06-27); forward-flow UAT **DT-TESTS-29 PASS** (orientation card · support footer · backoffice empty-states).
- [ ] **T-3.H.2** — Execute the closed beta (`docs/beta/beta-program-2026.md`): cohort = friends first → Miguel's real guests; invite copy (en+pt-PT); feedback survey via notif-svc; consent-gated beta telemetry. AC: ≥1 real beta guest completes token→discover→tour→chat with survey returned, zero P0/P1.
- [ ] _(N/A under (a))_ T-3.H.1 prod rollback drill — folds into Plan-004's prod cutover.
