# Plan-003 — Real-User Readiness — TODO

Status: **READY (executing)** — Q1 = **(a) friends-and-family beta on qual** (decided 2026-06-20). Prod cutover (3.E) deferred to Plan-004. Full slice detail + acceptance criteria in [`README.md`](./README.md); this is the (a)-scoped checklist. Task IDs `T-3.<slice>.<task>`.

## Locked decisions

GlitchTip (self-host) · cohort both/mixed (friends → Miguel's real guests) · MinIO backup target (off-site replication TBD in 3.B) · GDPR template + self-review · en+pt-PT launch locales · branded-fallback photos for beta.

## Lean critical path

`3.A → 3.B-lite → 3.C-lite → 3.D-lite → 3.H` · 3.F/3.G light-touch · **3.E DEFERRED → Plan-004**.

## Progress

| Slice | Title                                | (a) scope         | Status                   |
| ----- | ------------------------------------ | ----------------- | ------------------------ |
| 3.A   | Observability                        | full              | ◑ A.0 done; A.1–A.3 next |
| 3.B   | Reliability — backup + restore drill | lite (→ MinIO)    | ☐                        |
| 3.C   | Security — abuse/cost hardening      | lite              | ☐                        |
| 3.D   | Legal / GDPR                         | lite              | ☐                        |
| 3.E   | Production environment               | **DEFERRED →004** | —                        |
| 3.F   | Content                              | light-touch       | ☐                        |
| 3.G   | a11y + performance                   | light-touch       | ☐                        |
| 3.H   | Onboarding + closed beta             | full              | ☐                        |

---

## Slice 3.A — Observability · IN PROGRESS (3.A.0 done; A.1–A.3 next)

- [x] **T-3.A.0** — **error tracking DONE (2026-06-20).** DSN-gated SDK: `@sentry/node` in the 4 Node svcs (bff/token-svc/catalog-svc/media-svc) + `sentry-sdk` in the 4 Python svcs (chat-hub/notif-svc/planner-svc/search-svc) + `@sentry/react` in pwa (#291). **GlitchTip is NOT self-hosted by us** — Daily Tour is a tenant **org** in the shared `po-glitchtip` instance (https://errors.portugalodyssey.pt, po-platform-owned; postgres:17, nightly backups). DSN + `OTEL_DEPLOYMENT_ENVIRONMENT=qual` wired into qual (#294) + node-image Dockerfile fix for `shared-sentry` (#295); verified live (synthetic ingest HTTP 200, event `fe47cef3`). Repo holds client-config only (`infra/glitchtip/README.md`).
- [ ] **T-3.A.1 — NEXT** — Deploy the observability overlay (OTel→Prometheus→Grafana) into the qual deploy stack; resource-capped; 4 dashboards render live qual data.
- [ ] **T-3.A.2** — Uptime check (Uptime-Kuma / Cloudflare) on the qual apex + `/health`; **Telegram** alerts (service down ≥2min, error-rate spike, GlitchTip new-issue).
- [ ] **T-3.A.3** — `/ready` readiness probes (DB + broker + downstream) distinct from `/health`; wire `--wait`/`service_healthy` to readiness.

## Slice 3.B — Reliability (lite)

- [ ] **T-3.B.0** — Automated nightly Postgres backup → **MinIO** target (cron/timer or scheduled workflow); manual run produces a restorable dump.
- [ ] **T-3.B.1** — MinIO media backup (`mc mirror`); deleted-then-restored object round-trips. ⚠️ Resolve off-site replication (same-box MinIO ≠ box-loss DR) — pick a second location or sign off on-box-only for beta.
- [ ] **T-3.B.2** — Restore drill: full Postgres + MinIO recovery onto a clean target; record RTO.
- [ ] **T-3.B.3** — SPOF disposition (chat-hub single-instance WS, haversine) — signed accept-for-beta with the scale ceiling.

## Slice 3.C — Security (lite)

- [ ] **T-3.C.3** — Rate-limit the LLM-cost endpoints (`/v1/tour-plans`, `/v1/discover`) per-guest (protect Anthropic spend) + input-size caps (413) on chat + tour intake.
- [ ] _(deferred for beta)_ T-3.C.0 STRIDE re-validate · T-3.C.1 ZAP baseline · T-3.C.2 secrets-rotation drill — promote if cohort widens beyond F&F.

## Slice 3.D — Legal / GDPR (lite) · ⛔ gate before real guests

- [ ] **T-3.D.0** — Privacy + terms pages (en + pt-PT, template + self-review); linked from guest entry + footer.
- [ ] **T-3.D.1** — Consent gate for non-essential telemetry (today `/v1/telemetry/tour` fires unconditionally); essential-only by default.
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

- [ ] **T-3.H.0** — Guest first-run orientation + owner onboarding empty-states + a visible support/contact path.
- [ ] **T-3.H.2** — Execute the closed beta (`docs/beta/beta-program-2026.md`): cohort = friends first → Miguel's real guests; invite copy (en+pt-PT); feedback survey via notif-svc; consent-gated beta telemetry. AC: ≥1 real beta guest completes token→discover→tour→chat with survey returned, zero P0/P1.
- [ ] _(N/A under (a))_ T-3.H.1 prod rollback drill — folds into Plan-004's prod cutover.
