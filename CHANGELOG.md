# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — Plan-008 Slice 5: assisted map picker + real beta metrics + motion & theme (2026-07-11)

Owner backoffice **Slice 5** merged (#355–#358, every merge Fable-gated) — **Plan-008 is now code-complete** (all 6 slices done):

- **Assisted map picker (#357)** — a shared `LocationPicker` lets a non-technical host drop a pin on a map instead of hand-typing coordinates. A MapLibre map (reusing the existing map stack, no second engine) opens in a bottom sheet with an accessible address-search combobox, a fixed centre pin, a "use my location" button, and reverse-geocoding as the pin moves; it writes into the form's lat/lng, which are demoted into an "enter coordinates manually" section. Degrades to the numeric inputs when geocoding is unconfigured.
- **Geocoding proxy (#355)** — a new owner-only `POST /v1/admin/geocode` (+ reverse) proxies **Geoapify** with the API key kept server-side, biased to Portugal + the Azores, cached and rate-limited. Returns 503 (picker falls back to numeric input) when unconfigured.
- **Real beta-metrics dashboard (#356)** — the beta screen now shows branded KPI cards (reservations / views / conversion / messages) with **trend deltas** vs the previous period and a 7d/30d/90d range. Reservations + conversion are counted from **real** reservation data; the messages KPI honestly shows "no data yet" (rather than a misleading 0) until a producer exists, and a metrics-source outage degrades one card instead of blanking the dashboard.
- **Calm motion + light/dark/system theme (#358)** — tasteful, single-shot motion on the drawer, bottom-tab indicator, add-button, and page transitions, all disabled under `prefers-reduced-motion`; and a **theme toggle** (light / dark / follow-system, persisted) in both the desktop rail and the mobile top bar.

### Added — Plan-008 Slice 3: form excellence + EN/PT/ES auto-translate (2026-07-06)

Owner backoffice **Slice 3** merged (#347–#352, every merge Fable-gated) — the three admin forms are redesigned, gain a first-class **Spanish** content locale, and get an in-form machine-translation helper:

- **`es` content locale, DRY (#347)** — a shared `form-locale-config` (`CONTENT_LOCALES`, `buildI18nText`/`i18nTextToFields`) makes Spanish a first-class editable locale across all three forms (no shared-types change needed — the locale schema already accepted `es`); the mobile bottom tab bar is suppressed on form routes.
- **Translate endpoint (#348)** — `POST /v1/admin/translate` (owner-only, rate-limited) machine-translates form content across EN/PT/ES via Claude, constrained to **European Portuguese (pré-Acordo Ortográfico)** with a do-not-translate list for proper nouns; degrades gracefully (503) when unconfigured.
- **`TranslatableField` helper (#349)** — a per-field globe + "Traduzir tudo" bulk action with suggest-not-overwrite (confirm + undo), in-flight/auto-translated/out-of-sync state, and a hard guarantee it **never blocks Save** on a translation failure.
- **Place form (#350)** — refactored onto shared form primitives with sectioned cards, a sticky save bar, a dirty-state guard, media previews, the ES tab + translate, and an **opening-hours redesign** (per-day open/closed, 24h, copy-to-all-days).
- **Profile form (#351)** — re-scoped so only the Bio is per-locale (EN/PT/ES) while phone/email/photo/contact options live in one shared section; **Portuguese is the default tab**; the "WhatsApp (Cloud API)" jargon is replaced with plain language; brand switches + avatar preview + inline validation.
- **Guesthouse form (#352)** — same redesign; name-only translation (guesthouses have no description/contacts fields) with `status`/`rooms`/media preserved and the technical slug tucked into an "Advanced" section.

### Added — Plan-008 Slice 4 (chat) + guesthouse fields + first qual deploy of the backoffice redesign (2026-07-06)

- **Chat experience redesigned (#345)** — the owner chat inbox now shows **real guest names** (joined from reservations) with colored-initials avatars, property, and relative timestamps instead of opaque `aaa001…` IDs; message bubbles with sender + time, a sticky composer, and **Quick Reply template chips**; a mobile single-pane master→detail push (list → thread → back); an unread indicator (dot/bold + a Messages nav badge) computed client-side; and a search bar.
- **Guesthouse `status` + `rooms` fields (#344)** — full-stack: migration `0007` (`status active|archived` with a CHECK + nullable `rooms`), catalog-svc + shared-types + the shared `StatusBadge` (new `guesthouse` kind); the guesthouse card shows a status badge + "N quartos" and the form gets a status select + rooms input. Closes the field gap descoped from Slice 2.
- **First qual deploy of the redesigned backoffice** — Slices 0–2 + 4 + the guesthouse fields deployed to qual (main `12cc6d5`); catalog-svc auto-migrated the new columns. **Browser-UAT verified the F&F-beta guest app is not regressed** (redeem → home → discover → place-detail, 0 JS errors) and `/admin` redirects to Authentik SSO. All merges Fable-gated.

### Added — Plan-008 Slice 2: backoffice list reflow + plain language (2026-07-05)

Owner backoffice **Slice 2** merged (#337–#341) — the admin lists are now mobile-first, plainly-worded, and localized pt/en/es; this also clears the last of the 390px table overflow:

- **Single status source (#337)** — `StatusBadge` + a `satisfies`-exhaustive status→{label,color} map (place/reservation/token/flag) + `success`/`warning`/`info` `Badge` variants; every list badge is now one localized source of truth, no raw enums.
- **Places list (#338)** — table→card reflow (`hidden md:table` + `md:hidden` cards + kebab), a real Pick switch, status/locale filter chips + search + count, mobile FAB.
- **Guesthouses list (#339)** — card reflow (cover thumbnail + last-updated) and the technical `Slug` demoted into an "Advanced" collapsible on the form. (`status`/`nº de quartos` descoped — no backing data field yet.)
- **Reservations (#340)** — a **day-grouped agenda** (Hoje/Amanhã/Esta semana) with localized dates, "N noites", party/property chips, colored status + "Acesso do hóspede" (guest-link) badges — replacing the raw table of ISO dates and enum text.
- **Mutation UX (#341)** — archive/revoke now confirm through `AlertDialog`; the Pick and guest-visibility toggles are **optimistic** (instant, with rollback on failure); success toasts on every mutation + a copy-link toast.

Reviewed with the `model:"fable"` gate on every merge (caught a permanently-0 KPI, an un-pluralized count, and a half-optimistic toggle before they landed). Execution log: `docs/implementation-plans/008-backoffice-redesign/EXECUTION.md`. Not yet deployed to qual (owner-only surface).

### Added — Plan-008 Slice 1: responsive owner-backoffice shell + first-class states (2026-07-05)

Owner backoffice **Slice 1** merged (#331–#335 + a polish/docs wrap) — the admin console is now responsive, stateful, and localized pt/en/es:

- **Responsive shell (#331)** — desktop rail + mobile top-app-bar + 5-item bottom tab bar + `Sheet` drawer, replacing the always-on `w-56` sidebar that caused the 1301px mobile overflow; nav-active tokens, count-badge slots, `es` added to the locale switcher.
- **First-class states (#332)** — every admin list + single-entity form route now uses `LoadingState`/`ErrorState` (Retry→refetch) / `EmptyState` instead of bare `<p>` text.
- **Beta metrics + shared `StatTile` (#333)** — `retry:false` so a 500 shows error+retry rather than infinite "Loading…"; new reusable KPI-tile primitive.
- **"Today" dashboard (#334)** — `/admin` is no longer blank: greeting, KPI tiles (check-ins/outs, bookings awaiting a guest link, active links, places needing attention, conversations) tapping through to filtered lists, quick actions, view-as-guest, and a first-run setup checklist.
- **Fable-5 review remediation (#335)** — a new `model:"fable"` adversarial review gate caught a 🔴 the normal review + full CI + 40+ passing tests all missed: the `es` admin locale was never registered, so selecting "Español" silently fell back to English. Fixed + regression-guarded; es key parity completed; ErrorState i18n; iOS safe-area top-bar fix; StatTile SPA-nav.

Execution log: `docs/implementation-plans/008-backoffice-redesign/EXECUTION.md`. Not yet deployed to qual (owner-only surface; qual stays on the 06-30 F&F-beta build).

### Added — Plan-008 Slice 0 foundation + Load Tests resurrected (2026-07-03)

- **Backoffice redesign — Slice 0 foundation merged** (#325, #326, #327): scoped `[data-app="admin"]` console token overlay (light+dark, STATE tokens, nav-active, card shadow; guest `tokens.css` untouched) + `touch`/`icon-touch` button sizes; ConsentBanner and SessionBootstrap gated off `/admin/*` (the two §8.11 cleanups); 11 hand-rolled radix-ui primitives (tabs, input, label, textarea, select, form RHF+zod, skeleton, loading-state, error-state, alert-dialog, tooltip) with 49 unit tests and zero new dependencies. Execution log: `docs/implementation-plans/008-backoffice-redesign/EXECUTION.md`.

### Fixed — nightly Load Tests CI green for the first time (2026-07-03)

- **`load-test.yml` resurrected (#324)** — the workflow had never produced a green run since it landed (#121, 2026-05-18). Seven stacked fixes, each verified by a live run: pnpm version-input conflict; compose `--wait` vs the `minio-init` one-shot; k6 results-dir permissions; k6 fixtures migrated to the post-#234 `/v1/r/:token` redeem (and the token-exchange false-green closed — only 200/302/429 are acceptable now); **search-svc started for the discover path** (the job never ran it — admitted requests 500'd on connect timeout); RabbitMQ definitions.json password reconciled (`rabbitmqctl change_password`, the deploy-qa pattern); scenarios made rate-limiter-aware with CI-calibrated budgets (place-detail thresholds the stable median, not the noisy tail). Follow-up filed: #328 — the limiter JWT-decodes every rejected request, so 429 floods degrade admitted-request latency.

### Added — Plan-003 Real-User Readiness: lean path A→D-eng live on qual (2026-06-25)

The friends-and-family-beta readiness path **merged, deployed, and verified live on qual** — 7 PRs (#297–#303), one consolidated main deploy:

- **Observability (#297)** — OTLP→Prometheus bridge (otel-collector `prometheus` exporter on `:8889` + metrics pipeline) and the observability overlay wired into the qual deploy; bff-latency + error-rate Grafana dashboards render live data. Fixed a latent OTel bug — tsup-bundled ESM hoisted `import fastify` above `initOtel()`, so the `http.server.duration` metric never recorded — via a `node --import @daily-tour/shared-otel/register` preload.
- **Uptime + alerting (#298, msg-fix #303)** — Alertmanager + blackbox-exporter → **Telegram** (ops bot `dt_farol_bot` + alert group); rules for endpoint-down (`BlackboxProbeDown`) and high 5xx (`HighServerErrorRate`); null-receiver fallback until creds are set. Verified live: kill `dt_bff` → firing + resolve delivered.
- **`/ready` readiness probes (#299)** — own-DB (`SELECT 1`) probes on the 6 DB-backed services, distinct from `/health`, gating `docker compose up --wait`; explicit per-route rate-limit on the probes (CWE-770).
- **Backups (#300)** — nightly Postgres `pg_dump` of both clusters → MinIO `backups` bucket + a restore drill (throwaway pgvector container), driven by a **systemd timer** on the box (01:00 UTC); on-box-only DR signed off for the beta.
- **Per-guest LLM rate-limits (#301)** — `/v1/tour-plans` 5/min and `/v1/discover` 30/min keyed on the guest JWT, plus a 16 KB body cap (413) and input-length caps, protecting Anthropic spend.
- **Consent gate (#302)** — persisted consent store + banner; non-essential telemetry (`/v1/telemetry/tour`) gated behind explicit consent (essential-only by default); privacy/terms route stubs + `legal` i18n namespace (the legal copy is the remaining 3.D.0 task).

### Added — Plan-002 Thrust B / Slice 2.D: "São Miguel Editorial" implementation (2026-06-17)

The 5 PWA screens rebuilt to the editorial design system, plus a polish and a backend follow-up. **Every screen browser-verified in light + dark.** PRs #254–#262:

- **#254** Foundations — editorial tokens (both themes; MD-role surface ladder, mockup class names 1:1) + shared primitives (`Overline`, `DistanceChip`, `BrandAppBar`, `BottomTabBar`, shadcn `Sheet`/`Avatar`) + `PlaceCard` restyle (`stacked` + new `overlay` variant).
- **#255** Place Detail — tea-green overline + Fraunces name on canvas + hydrangea category chips + conditional Details card + glass back/bookmark + action tiles. Found+fixed **D1** (theme not applied on `/p/:id`).
- **#256** Home — `BrandAppBar`, 6-card cream bento action grid, overlay-variant photo ribbon, active premium cards, `BottomTabBar`.
- **#257** Daily Tour — editorial timeline + **per-stop hero thumbnails** (new BFF `toStop` hero plumbing) + sun-amber connector pills; D1 fix on the tour routes.
- **#258** Host rename **João → Miguel** (placeholder persona → the real host).
- **#259** Chat — Miguel/Online header, day separators + timestamps, cream/tea bubbles, pill input + mic + circular send; D1 fix.
- **#260** Discover — **map-first + draggable bottom-sheet rebuild** (maplibre tea-green pins, search, locate FAB, controls relocated into the expanded sheet) + new BFF discover `geom_lat`/`geom_lng`.
- **#261** Editorial `BackLink` — replaced the bare "←" underlined links (tour / place-detail / discover) with a lucide-arrow tea-green affordance.
- **#262** Place `season` plumbing (catalog-svc `/hydrated` → BFF) + 7 seeded summer-season spots → the Place-Detail Details card is functional end-to-end.

Theme stance: auto **light + dark** editorial (kept the sunrise/sunset auto-switch; light extrapolated from the dark-only mockups). Open follow-ups: shared authed-layout theming, rich chat place-card message, OSM dark map tiles.

### Added — Plan-006 sweep: reservations + owner field-editing (6.E/6.F/6.C.2) (2026-06-13/14)

Closed out the remaining Plan-006 slices via a two-round cs-agent fan-out (orchestrator-reviewed every diff). Plan-006 now **15/15 code-complete** (UATs pending). 5 PRs:

- **Reservations management (6.E)** — token-svc `GET /v1/reservations` (with derived token_state) + reservation-scoped revoke (#240); BFF owner-gated `/v1/admin/reservations` list/issue/revoke proxy (#240); backoffice **reservations screen** at `/admin/reservations` — list + per-row Issue (copyable `/r/<token>` guest link) + Revoke, replacing the placeholder nav (#243).
- **Owner field-editing gaps (6.F)** — `place.season` column + CHECK + migration `0006` + shared-types + catalog route round-trip (#241); place-edit form **contacts** (phone/email/website), **weekly-hours** editor, and **season** select (#244, #150/#151).
- **Per-place hero (6.C.2)** — verified owner-uploaded `place.media` renders as the guest `<Hero>` (#244).

Process note: round 1 agents delivered the backend but skipped the PWA UI; round 2 used UI-only prompts (lead with file creation) and delivered. Orchestrator fixed agent prettier-bypass + a strict-index TS error during integration.

### Fixed — Plan-007 close-out UAT → **Plan-007 CLOSED** (2026-06-13)

The deferred close-out UATs were run headless against live TLS and surfaced three issues the internal smoke had masked (it bypasses Traefik). All fixed, merged, redeployed, and re-UAT'd PASS in a real browser — **every Plan-007 criterion is now verified live** (deploy reproducibility · guest journey · owner login · owner edit · hero/attribution over TLS). Riff #157 + #152 closed.

- **Guest-entry broken on the same-origin apex (#234)** — Traefik path-routed `/r/*` → BFF above the SPA, so a guest's shared link `https://<apex>/r/<token>` 200'd as raw JSON `{jwt}` and the SPA never booted. Moved the BFF redeem endpoint to **`/v1/r/:token`** (rides the existing apex `/v1` router); the SPA keeps the browser route `/r/:token`; dropped the apex `/r` path-router. Public link shape unchanged; the D15 redaction regex already covers `/v1/r/`. Re-UAT'd PASS: cold nav → SPA boots → `exchangeOpaqueToken` XHR `/v1/r/` `200 {jwt}` → authed home → `/v1/discover` 200 under the guest Bearer JWT. **Closes the Plan-002 Slice 2.A guest-journey exit criterion.**
- **Owner login 403 on a clean deploy (#235)** — the `owner-app` blueprint creates the `staff` group and Authentik bootstrap creates `akadmin`, but nothing joined them, so a fresh deploy left owner auth unprovisioned. Added an idempotent post-`up` reconcile step to `deploy-qa.yml` (qual-only, additive, fail-soft) that adds `akadmin → staff`.
- **Owner backoffice toggle dead — missing guesthouse seed (#238 / #152)** — `catalog.guesthouse` was never seeded, so the per-place Hide/Show visibility control rendered as a bare "—" (no guesthouse → the staff backoffice has no row to attach `hidden_place_ids` to). Added a "Casa do Sol" guesthouse to the catalog `dev.ts` seeder (idempotent, runs in deploy stage 5; UUIDs match the token-svc reservation fixture). Re-UAT'd PASS: the toggle renders + a Hide→Show round-trip persists (PUT/DELETE 200).
- Findings filed: **#158** (registerSW.js 404/MIME — PWA service-worker auto-registration broken on qual, non-blocking, still open) · osrm re-enable deferred (haversine fallback) · a deeper owner create-place + photo-upload + publish flow remains to be UAT'd on qual (Plan-006 uploaders).
- **T-0.4.4 (CI deploy gate) closed** via Plan-007 (`deploy-qa.yml`); Plan-001 now 84/84.

### Added — Plan-007 (qual VPS deploy) Phase Q.1 + Q.3 — qual env LIVE (2026-06-12/13)

The qual environment is live at `https://qual.stay.portugalodyssey.pt` (trusted Let's Encrypt cert, full 8-step guest-journey smoke green, real LLM tour plans). Plan dir: `docs/implementation-plans/007-qual-vps-deploy/` (EXECUTION Waves 2–3).

- **Q.1 VPS prep** — island-chronicles backed up + cleanly stopped (80/443/8080 freed); 4 GB swap; ufw + key-only SSH (deadman-verified); dangling-only prune cron; Node 22.22.3 / pnpm 9.14.2 toolchain. `make vps` SSH shortcut.
- **Q.3 runner + DNS + first deploy** — Cloudflare DNS (`qual.stay` + `*.qual.stay`), self-hosted GitHub runner (`qual-vps`), first deploy on `/opt/daily-tour` with ACME staging→prod.
- **First-deploy punch-list (8/8, #226 + #228)** — the deploy surfaced a systemic gap (hardcoded dev credentials + incomplete secret-rotation wiring), now fixed so the automated `deploy-qa.yml` reproduces it: deploy bootstrap (`dt_internal` network, `pnpm install`, `up` ordering); postgres `init-qual` mount + `02-roles.sql` reorder (forward-referenced roles aborted init); chat-hub `DATABASE_URL` + bff `ANALYTICS_DATABASE_URL` (hardcoded `change-me-please-*` defaults); rabbitmq broker-password reconcile; relative seed reservation dates; qual-only http→https redirect (dynamic config); osrm `ca-certificates` for the https PBF download.
- **osrm image** — base tag `v5.28.0`→`v5.25.0` (404) + Debian-stretch-EOL apt → `archive.debian.org` (#221/#222).
- **Reproducibility validated** — a clean re-deploy (wiped volumes, `deploy-qa.yml` workflow) proved the env rebuilds end-to-end with no hand-patching; surfaced + fixed 4 deploy-only bugs: traefik `dynamic` dir `:ro` blocking the redirect nest-mount (#230), `init-qual` perms unreadable by postgres (#231), the Geofabrik Azores PBF path 404 → **osrm deferred** / planner haversine (#231), `dev-env-check --qual` osrm expectation (#232). DEPLOYS.md first qual entry recorded.

### Added — Plan-007 (qual VPS deploy) Phase Q.2 — repo plumbing (2026-06-12)

Pure repo work (no VPS touched); 8/8 Q.2 tasks merged + the GHCR publish pipeline brought to 11/11 green. Plan dir: `docs/implementation-plans/007-qual-vps-deploy/` (EXECUTION.md = wave detail).

- **GHCR image pipeline** — `publish-images.yml` builds + pushes all 11 images (8 services + postgres + osrm + pwa) to `ghcr.io/zmeireles/daily-tour/*:{sha,qual}` (Q.2.0, #214). PWA shipped as a self-contained nginx image (`apps/pwa/Dockerfile`, VITE\_\* baked) instead of a host-side bind-mount (Q.2.4, #220).
- **Qual compose overlays** — `overlay.qual.yml`: Traefik on 0.0.0.0:80/443 + web→websecure redirect, **apex same-origin routing** (`/v1`+`/r` path-route to the BFF over the SPA), GHCR image overrides, `mem_limit`s, `NODE_ENV=production`, OSRM_URL fix; plus the production ACME resolver + email-via-command-flag fix (Q.2.1/Q.2.2, #216). `overlay.qual-authentik.yml`: auth. router websecure TLS (404 fix) + Authentik mem_limits (Q.2.5, #218).
- **Secrets + config** — `scripts/qual/gen-env-qual.sh` generates `.env.qual` (64 keys) + a rotated `infra/postgres/init-qual/02-roles.sql`; checked-in `.env.qual.example` template (Q.2.3, #215). Authentik qual redirect URI added to the owner-app blueprint (#218).
- **Deploy automation** — `deploy-qa.yml` (self-hosted `qual-vps` runner: pull→up→migrate→seed→smoke→`--qual` check→rollback-to-previous-tag) + `dev-up.sh`/`dev-smoke.sh` parameterised with `ENV_FILE`/`PROJECT`/`--to` for the `dt-qual` project (Q.2.6, #219). `dev-env-check.sh --qual` post-deploy gate (Q.2.7, #217).
- **osrm image fixes** (latent, surfaced by the maiden publish run): base tag `v5.28.0`→`v5.25.0` (404, #221) + Debian-stretch-EOL apt → `archive.debian.org` (#222).

### Added — Plan-006 (Owner Backoffice v2, in progress) + post-arc maintenance

Sessions 2026-06-04 → 2026-06-11. Plan dir: `docs/implementation-plans/006-owner-backoffice/`.

**Slice 6.A — per-guesthouse scoping (DONE, browser-UAT'd)**

- Schema: `guesthouse.hidden_place_ids uuid[]` + catalog hide/unhide endpoints (T-6.A.0/6.A.1, #191)
- BFF discover filters guest results by guesthouse hide list (T-6.A.2, #192)
- Backoffice guest-visibility toggle in `/admin/places` (T-6.A.3, #193)
- Owner-app OIDC integration fixes: JWKS host alias, `groups` scope, public PKCE client blueprint (#195)

**Slice 6.C — owner photo uploader (2/3 done)**

- Media-display foundation (public `GET /v1/media/:id`) + owner avatar uploader (T-6.C.0, #196)
- Guesthouse hero uploader (T-6.C.1, #197)

**Slice 6.D — hosts-pick governance (DONE)**

- Soft hosts-pick cap warning ~6–8/guesthouse (T-6.D.0, #198)

**Backoffice QoL batch (daily-tour #154/#155/#156)**

- Places list pagination (10/page) + clickable column sorting (#203)
- Locale switcher EN/PT-PT in owner/admin shell (#202)
- `cursor-pointer` on shared Button base (#201)

### Fixed

- Stable place list ordering by `createdAt` instead of `updatedAt` (#199)
- Security: `shell-quote` override to >=1.8.4, GHSA-w7jw-789q-3m8p (#200)
- chat-hub: add missing per-service `.gitignore`, untrack committed `__pycache__` artifacts (#204)

### Implementation arc (Plans 001-005)

This project shipped its full original 100-task roadmap (Plan-001) plus 4 subsequent plans (002 deploy/polish, 003 real-user readiness, 004 scale/monetize, 005 operate) across roughly 117 merged PRs in a single autonomous orchestration session. The CHANGELOG below captures the macro arc; per-PR detail lives in `docs/implementation-plans/001-roadmap/EXECUTION.md`.

### Added — Plan-001 (Implementation, 99/100 tasks)

**Phase 0 — Foundation** (15/16 done; T-0.4.4 VPS-blocked)

- Monorepo via pnpm + Turborepo (T-0.1.1)
- Shared TS config + ESLint 9 flat + Prettier 3 (T-0.1.2)
- Pre-commit (lefthook + gitleaks) (T-0.1.3)
- GitHub Actions CI (lint, typecheck, test, audit) (T-0.1.4)
- `packages/shared-types` zod schemas (T-0.2.0)
- `packages/shared-otel` OTel SDK helper (T-0.2.1)
- Python `daily_tour_common` (FastAPI base + pydantic mirror + OTel) (T-0.2.2)
- Compose base: PostgreSQL + pgvector + Redis + RabbitMQ + MinIO (T-0.3.0)
- Compose overlay: Traefik v3 + ACME staging (T-0.3.1)
- Compose overlay: Authentik 2026.2.2+ (T-0.3.2)
- Compose overlay: n8n LTS behind Authentik (T-0.3.3)
- PWA scaffold: Vite 6.4.2 + React 19 + TS + Tailwind v4 (T-0.4.0)
- Stitch design tokens → @theme block (T-0.4.1)
- BFF skeleton: Fastify v5.8.5 on Node 22 (T-0.4.2)
- Compose overlay: bff + pwa-static nginx (T-0.4.3)

**Phase 1 — Guest Landing & Catalog v1** (Slices 1.0-1.7 closed)

- Reservation token + Zustand session (1.0)
- Catalog data model + 28-place São Miguel seed (1.1)
- Discover 6-action grid with locale-auto + theme-auto (1.2)
- Place detail with embla gallery + MapLibre + deep-links (1.3)
- Media service + MinIO upload pipeline (1.4)
- Public landing route (1.5)
- Authentik realm + Owner backoffice MVP (1.6)
- i18n bundles + PWA install + service worker (1.7)

**Phase 2 — Discovery & Search**

- search-svc FastAPI skeleton (T-2.0.0)
- pgvector + embeddings worker (T-2.0.1)
- Backfill 28 seeded places (T-2.0.2)
- Hybrid /v1/query endpoint with SQL geo + tag ∩ vector re-rank (T-2.1.0)
- BFF /v1/discover switches to search-svc hybrid (T-2.1.1)
- Host's picks toggle + ribbon (T-2.2.0/2.2.1)
- Vehicle-aware toggle + filter (T-2.2.2)

**Phase 3 — Daily Tour Planner**

- planner-svc FastAPI + Anthropic Claude (T-3.0.0)
- Prompt assembler + RAG retrieval (T-3.0.1)
- Provenance + travel-time validators (T-3.0.2)
- Async tour-plan flow with RabbitMQ (T-3.0.3)
- PWA Daily Tour intake form + voice input (T-3.1.0)
- DailyTourTimeline component (T-3.1.1)
- Failure + timeout fallback UI (T-3.1.2)
- IPMA forecast client + Redis cache (T-3.2.0)
- Rainy-slot swap to indoor (T-3.2.1)
- BFF weather_ok_today enrichment (T-3.2.2)
- OSRM self-hosted overlay + Python client (T-3.3.0)
- Planner travel-time validator uses OSRM (T-3.3.1)
- Share tour link + public read-only view (T-3.4.0)
- Tour telemetry started/completed events (T-3.4.1)

**Phase 4 — Chat & Reservation**

- chat-hub service + driver Protocol + WebSocket (T-4.0.0)
- In-app chat with WebSocket bridge (T-4.1.0 — retried as T-2.C.1)
- Telegram driver (T-4.2.0)
- WhatsApp deep-link driver (T-4.3.0)
- AI reservation drafter via Anthropic (T-4.4.0)

**Phase 5 — Hardening & Growth**

- PWA offline catalog cache via idb (T-5.0.0)
- Locale expansion to de/es/fr/pt-BR (T-5.1.0)
- WCAG 2.2 AA audit + fixes (T-5.2.0)
- Lighthouse perf budgets + CI workflow (T-5.3.0)
- Observability overlay: Prometheus + Grafana (T-5.4.0)
- notif-svc + post-stay review notification (T-5.5.0)
- WhatsApp Business API integration (T-5.6.0)

### Added — Plan-002 (Hardening Retrospective)

- TODO.md + EXECUTION.md bulk doc sync to post-Plan-001 reality (T-2.C.0)
- T-4.1.0 retry (chat WebSocket with proper ws types) (T-2.C.1)
- cs-agent closer-fallback investigation (T-2.C.2)
- Project-wide ESLint test-file overrides for `no-unsafe-*` + `unbound-method` (T-2.C.3)
- Estimate recalibration + lessons learned docs (T-2.C.4 + T-2.C.5)

### Added — Plan-003 (Real-User Readiness)

- k6 load test scripts (token-exchange, discover, place-detail, tour-plan) (T-3.A.0)
- OSRM/IPMA/RabbitMQ chaos drills (T-3.A.1)
- STRIDE threat model (T-3.B.0)
- Secrets rotation playbook (T-3.B.2)
- PII inventory + GDPR DSR playbook (T-3.B.3)
- Backup + recovery runbook (T-3.B.4)
- Beta program selection + invite copy (T-3.C.0)
- Beta feedback + telemetry + dashboard (T-3.C.1 + T-3.C.2 + T-3.C.3)
- Hot-fix + rollback playbook for beta (T-3.C.4)
- Brand mark refresh placeholder (T-3.D.2)

### Documented — Plans 004-005

- Plan-004 Scale & Monetize draft (owner onboarding self-service + multi-tenant + Stripe + marketing + Capacitor)
- Plan-005 Operate draft (SLO/SLA + incident response + customer support + FinOps + continuous improvement)

### Repo infrastructure

- Comprehensive top-level README (PR #115)
- Implementation-plans index (`docs/implementation-plans/README.md`) listing all 5 plans

### External blockers (carried over)

- T-0.4.4 — CI deploy gate to QA VPS (needs Ubuntu 24 acquisition)
- T-3.B.1 — Pen-test (external work)
- T-3.D.0 — Stitch mockups (MCP attempts timed out; needs project DS attachment)
- T-3.D.1 — Real translation review (de/es/fr/pt-BR)
- T-3.D.3 — Stitch v2 polish (chat, daily-tour, admin)
- Real per-place photography
- Authentik realm import to a running instance
- Lighthouse CI first audit (needs deployed staging)

## Session statistics

- **117+ PRs merged** in one autonomous orchestration session
- **~20 hours wall-clock** (with sleep windows during CI)
- **5 implementation plans** outlined (001 implemented, 002-005 outlined)
- **Phase 1-5 of Plan-001**: implementation-complete
- **20+ clean Sonnet/Opus self-commits**, ~12 orchestrator rescues
- **2 closed PRs** (chat WS eslint loop — successfully retried as #98)

---

_Generated with Claude Code Sonnet 4.6 + Opus 4.7 via `/goal proceed with the identified tasks` autonomous-mode authorization._
