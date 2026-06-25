# Session Handoff — … → 06-25 (Plan-003 LEAN PATH A→D-eng MERGED + LIVE + verified on qual: observability · alerting→Telegram · `/ready` · backups · rate-limits · consent) → next session

> **UPDATE 2026-06-25 (LATEST — crash recovery mid-session. No work lost. The crashed session opened two PWA PRs (#305, #306); both failed the Lighthouse SEO budget. Diagnosed + fixed locally on `fix/pwa-seo-lighthouse-budget` (`af2d7c2`, NOT pushed). Resume by deciding how to land it — see this block.)**
>
> ### Crash recovery (2026-06-25, later)
>
> A session crashed mid-work. State verified — **nothing lost**: working tree clean, no stashes, both feature branches pushed to origin, no orphaned dev/docker processes.
>
> - **Two PRs were created by the crashed session, both branched off main `5f0fc8d`:**
>   - **#306** `feat(pwa): beta onboarding — orientation, empty-states, support footer (T-3.H.0)` — branch `feat/3-h-0-beta-onboarding`.
>   - **#305** `feat(pwa): privacy/terms copy, en + pt-PT (T-3.D.0)` — branch `feat/3-d-0-legal-copy`.
> - **Both green on every required check; both red only on `Lighthouse Perf Budgets`** (advisory — not one of the 6 required gates; #302 merged red on it too). Root cause: SEO 0.75 < 0.8 from three weight-1 audits — `meta-description` (always absent), `robots-txt` (always 500'd because the vite `/r` proxy key prefix-matched `/robots.txt` → forwarded to bff), and `link-text` (the #302 consent banner's generic "Learn more" link — the regression that tipped 0.83 → 0.75).
> - **Fix committed locally → `fix/pwa-seo-lighthouse-budget` (`af2d7c2`, NOT pushed):** added `<meta name="description">`; consent link text → "Read our privacy policy" / "Ler a política de privacidade"; vite proxy key `/r` → `/r/` (still matches every `/r/:token` redeem link, #234); permissive `public/robots.txt`; `.lighthouseci` gitignored. Verified via `lhci autorun`: **SEO 0.75 → 1.0**, all four budgets pass; lefthook (gitleaks/prettier/lint/CC) green.
> - **`public/robots.txt` is intentionally permissive** — a `Disallow` passes `robots-txt` but fails the higher-weight `is-crawlable` audit (→ SEO 0.66) and would de-index production (qual + prod share one build). De-index the beta at the edge (`X-Robots-Tag: noindex` on the qual route) if that's wanted.
>
> #### FIRST TASKS NEXT SESSION (crash recovery)
>
> 1. **Land the SEO fix** (`fix/pwa-seo-lighthouse-budget`). Either push it as its own PR → merge → `update-branch` #305 + #306 (both then go fully green), or cherry-pick `af2d7c2` into each branch. The handoff update itself sits on `docs/crash-recovery-2026-06-25` (also local, not pushed). Pre-existing untracked `e2e/` is unrelated — leave it.
> 2. Resume the pre-crash plan: 3.D.0 copy review (#305) + 3.H.0 beta onboarding (#306) → then 3.H.2 run the closed beta.
>
> **UPDATE 2026-06-25 (Plan-003 lean path A→B→C→D-eng ALL MERGED + LIVE + verified on qual. Remaining: 3.D.0 privacy/terms COPY (José) → 3.H beta. Resume from this block.)**
>
> ### Shipped this session (2026-06-25) — 7 PRs merged (#297–#303), one consolidated main deploy, all verified live on qual
>
> - **3.A.1 (#297)** OTLP→Prometheus **bridge** (collector `prometheus` exporter `:8889` + metrics pipeline; overlay added to `deploy-qa.yml`); bff-latency + error-rate Grafana dashboards render live qual data. **Surfaced + fixed a latent OTel bug** → [[reference-otel-esm-preload]]: tsup-bundled ESM hoists `import fastify` above `initOtel()` so the http.server metric never recorded → fixed via a `node --import @daily-tour/shared-otel/register` preload (Dockerfile CMD).
> - **3.A.2 (#298 + msg-fix #303)** **alertmanager + blackbox-exporter → Telegram.** Ops bot **`dt_farol_bot`** → group **"Daily Tour Farol Group"** (`ALERT_TELEGRAM_CHAT_ID=-5587963851`, in `.env.qual`). Rules: `BlackboxProbeDown`, `HighServerErrorRate`. **Verified live: kill `dt_bff` → firing + resolve both delivered (0 failures).** #303 fixed a real bug José caught — the message was a single-quoted YAML string so `\n` stayed literal, mangling the alert URL into a 404 (`/health%5Cn`); now a block scalar (real newlines), link works.
> - **3.A.3 (#299)** own-DB **`/ready`** (`SELECT 1`) on token/catalog/media (Node) + planner/search/chat-hub (Python); 6 healthchecks flipped `/health`→`/ready` → **gate `up --wait`** on readiness. CodeQL flagged `/ready` (DB route, rate-limit-exempt, CWE-770) → fixed with an explicit per-route 60/min limit.
> - **3.B.0 (#300)** nightly **pg backup → MinIO** (`scripts/ops/backup-postgres.sh`, both clusters → private `backups` bucket) + **restore drill** (`restore-drill-postgres.sh`, throwaway pgvector container, RTO ~1s) + **systemd timer installed on the box** (`infra/systemd/dt-backup.{service,timer}`, 01:00 UTC). On-box-only DR **signed for beta**; B2 off-site deferred to 3.B.1.
> - **3.C.3 (#301)** **per-guest LLM rate-limits** (JWT-decode keyGenerator — the limiter `onRequest` runs before auth `preHandler`, so it decodes the bearer itself): `/v1/tour-plans` 5/min, `/v1/discover` 30/min; `bodyLimit` 16KB→413 + `wishes[]` 120-char cap. **Verified live: 429 on the 6th tour-plans.**
> - **3.D.1 (#302)** **consent gate**: persisted store (default essential-only) + banner mounted above the router (works in both shells) + 1-line gate on `emit()` so declining ⇒ no `/v1/telemetry/tour`. Privacy/terms **route stubs + `legal` i18n namespace** shipped (en + pt-PT, linter-clean) — **copy is 3.D.0 (José's)**.
>
> ### Gotchas learned this arc (save the next session pain)
>
> - **Never `cp`/`scp` into the `/opt/daily-tour` deploy clone as root** — files become root-owned and the `ghrunner`-run `git checkout -f` can't unlink them → deploy **"Sync" step fails** ("Permission denied"). Fix: `chown -R ghrunner:ghrunner`. (Bit us via `scripts/ops/` after #300 made them tracked.)
> - **CodeQL `js/missing-rate-limiting` (CWE-770):** a DB-touching route needs an **explicit per-route** `config.rateLimit` — CodeQL doesn't model the _global_ fastify limiter for routes inside a child plugin scope. `--admin` can NOT bypass a failing CodeQL gate.
> - **Repo ruleset** requires 10 checks on an **up-to-date** branch → merging N PRs is sequential (each squash re-advances main → re-`update-branch` + re-CI for the rest).
> - **`gh workflow run --ref <branch>`** can race a fresh `git push` (resolves the stale tip → builds wrong commit) → **verify the run's `headSha`**.
> - **Alertmanager** `group_interval=5m` → the resolve message lands ~5 min after firing (not a bug). Bot **privacy mode** (`can_read_all_group_messages:false`) hides plain group msgs → get the group chat_id via `/start@bot` (commands reach the bot even in privacy mode) or @getidsbot, then `getUpdates`.
> - **YAML single-quoted strings keep `\n` literal** → use a block scalar (`|-`) for multi-line message templates.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **Rituals:** poll `inbox-daily-tour.md` (a new project **jo:Pico / JORAA** introduced itself — intro only, no ask) + the dt-tests `review` queue.
> 2. **3.D.0 — privacy/terms COPY (José's legal call).** Stubs + `legal` i18n ns are wired; just needs the real content in `apps/pwa/src/locales/{en,pt-PT}/legal.json` + `routes/{privacy,terms}.tsx`. **Claude offered to draft template-based GDPR copy** (data collected / lawful basis / retention / contact), en + pt-PT (pré-AO via `ptpt-excellence`) for José's review. Then **browser-UAT the consent surface** (banner shows on entry, declining truly stops telemetry, both pages render in both locales).
> 3. **3.H — closed beta** (gated on 3.D.0): 3.H.0 onboarding/orientation + 3.H.2 run the beta (`docs/beta/beta-program-2026.md`).
> 4. **Optional lean follow-ups:** Python services' `http.server` metric gap (separate FastAPI cause); a deploy smoke-assertion that every Node svc emits `http_server_duration`; mq-depth/service-health dashboards (still prom-client names); 3.B.1 (MinIO media `mc mirror` + off-site B2 decision); 3.D.2 (DSR export/erase scripts).
>
> ### State (2026-06-25)
>
> main **`96ca2fd`** (#297–#303 all merged); **0 open PRs, 0 open issues**; local branches: **main only** (clean — only pre-existing untracked `e2e/`). **qual fully healthy + current** on one consolidated deploy of main (`dt_otel_collector` shows "Up" without "(healthy)" — it has no healthcheck, benign). **Ops Telegram alerting LIVE + verified**; **systemd backup timer running** (nightly 01:00 UTC). `.env.qual` on the box now holds `ALERT_TELEGRAM_BOT_TOKEN` + `ALERT_TELEGRAM_CHAT_ID` (MANUAL_KEYS — a `gen-env --force` would reset them). Deploy-clone hygiene: `scripts/` chowned to ghrunner; `alertmanager.yml` hand-rendered live (re-renders identically on next deploy). Memory updated: [[project-plan-003]], [[reference-otel-esm-preload]], `MEMORY.md`. **Plan-003 is one legal-copy task + the beta away from done.**

> **UPDATE 2026-06-20 (Plan-003 EXECUTING: error tracking LIVE on qual; backlog tidied; cross-project comms channel established).**
>
> ### Shipped this session (2026-06-20)
>
> - **Backlog tidied:** Plan-006 TODO stale boxes closed (#289). **Plan-003 (Real-User Readiness) scoped → READY (#289/#290); Q1 decided = (a) friends-and-family beta on qual** (3.E prod cutover deferred → Plan-004). Locked: GlitchTip / cohort both-mixed / MinIO backup / template-GDPR / en+pt-PT. Lean path: 3.A → 3.B-lite → 3.C-lite → 3.D-lite → 3.H. Docs: `docs/implementation-plans/003-real-user-readiness/{README,TODO}.md`. See [[project-plan-003]].
> - **Plan-003 T-3.A.0 (error tracking) DONE + LIVE on qual.** DSN-gated SDK across all tiers: `@sentry/node` (bff/token-svc/catalog-svc/media-svc) + `sentry-sdk` (chat-hub/notif-svc/planner-svc/search-svc) + `@sentry/react` (pwa) — **#291** (also fixed a HIGH vite CVE via `pnpm.overrides "vite": ">=6.4.3 <7"` + worker-exception capture for media-svc transcode + planner-svc consumer). **GlitchTip is a SHARED service** operated by po-platform (sA:Douro) at **https://errors.portugalodyssey.pt** (po box `195.35.3.6`, postgres:17, nightly backups); Daily Tour is a tenant **org** — we do NOT self-host (repo holds client-config only: `infra/glitchtip/README.md`; #292 mirror → #293 client-config after Douro consolidated to one instance). DSN + `OTEL_DEPLOYMENT_ENVIRONMENT=qual` wired into qual (**#294**) + a **Node-image Dockerfile fix** (**#295** — the 4 Node Dockerfiles needed `@daily-tour/shared-sentry` in their curated COPY/build; had silently failed Node image builds since #291). Verified: `SENTRY_DSN` present in `dt_bff` + `dt_planner_svc` containers + a synthetic ingest → **HTTP 200, event `fe47cef3`** in the Daily Tour org. Also fixed the deploy-smoke stale-fixture blocker earlier (#286/#287).
> - **Cross-project comms channel established** at `/media/jmeireles/ssd3/my-projects/orchestrator-comms/` (file mailbox, sA:Douro ↔ me). **My handle: `dt-orch:Furnas`.** READ `inbox-daily-tour.md`, WRITE `inbox-po-platform.md`; append-only, newest at bottom; **poll at session start + when blocked**. Governance codified in its README (po-platform owns shared services; each tenant owns its org/project/DSN/SDK; tenants never `docker compose up` a shared instance). See [[reference-orchestrator-comms]].
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **Rituals:** poll the comms inbox (`inbox-daily-tour.md`) + the dt-tests `review` queue.
> 2. **Plan-003 slice 3.A (continue):** **3.A.1** observability overlay (OTel→Prometheus→Grafana) into the qual deploy stack → **3.A.2** uptime + Telegram alerts → **3.A.3** `/ready` probes. Then 3.B-lite (backup → MinIO; settle off-site replication) → 3.C-lite (rate-limit `/v1/tour-plans`+`/v1/discover`) → 3.D-lite (privacy/terms + telemetry consent) → 3.F/3.G light-touch → 3.H (onboarding + beta).
> 3. **GlitchTip follow-ups:** (a) **`SENTRY_DSN` durability** — it was hand-appended to `/opt/daily-tour/.env.qual` on the qual box; fold it into `gen-env-qual.sh` / `.env.qual.example` so a fresh env regen preserves it. (b) **SMTP (`EMAIL_URL`)** for real alert emails — Douro owns the instance; request via the comms channel (currently `consolemail://`). (c) optional real-service-error smoke (vs the synthetic event); ask Douro to confirm events in the org UI.
>
> ### State (2026-06-20)
>
> main `efcb15c`; **0 open code PRs, 0 open issues**; local branches: `main` only. Error tracking LIVE on qual across PWA + all 8 services (shared GlitchTip tenant). Comms channel active. **Lessons recorded:** [[feedback-agent-worktree-isolation]] (Agent `isolation:worktree` did NOT isolate parallel builds → use cs-agent or strictly non-overlapping file scopes); [[feedback-service-dockerfile-workspace-dep]] (a new `@daily-tour/*` workspace dep on a service ⇒ update its Dockerfile's curated COPY/build; PR-CI passes, only `publish-images` catches it — check it post-merge). Desktop phase + chat reply (#281) both done/live earlier this arc.

> **UPDATE 2026-06-19 (CHAT REPLY SHIPPED + DEPLOY SMOKE FIXED): The host→guest chat reply path (#281) is IMPLEMENTED, MERGED, DEPLOYED to qual, and core-verified LIVE — closing the send-only gap. Also fixed a deploy blocker (#286). Both issues CLOSED. Resume from this block.**
>
> ### Shipped this session (2026-06-19)
>
> - **#281 host→guest chat reply** — 3 PRs merged: **#283** chat-hub (`POST /v1/reply/{guest_id}` persist-outbound + best-effort WS push + `GET /v1/threads`), **#284** BFF owner-gated `/v1/admin/chat/*` proxy (mirrors #240), **#285** PWA owner inbox (`/admin/chat`) + guest host-frame handling. Built sequentially by delegated agents (chat-hub → bff → pwa) on a clean tree to dodge the shared-tree tangle. Caught + fixed a contract mismatch in review (BFF history returns `{messages:[...]}`; owner hook had expected a bare array). **Verified LIVE on qual** (creds-free): triggered an internal chat-hub reply → it persisted + came back through the BFF guest-history route as an `outbound/host` message. Owner-UI + live-WS push covered by unit suites (chat-hub 34, bff 109, pwa 288) + the deploy 401 gate check. **#281 CLOSED.**
> - **#286 deploy smoke fix** — **#287**: the qual deploy red-gated on token mint 410 — the seed used `onConflictDoNothing`, so its rolling `dayOffset` checkout dates froze on the persistent volume and went stale. Fixed: seed `onConflictDoUpdate` refreshes checkin/checkout/status on each re-seed; `dev-smoke.sh` now picks the furthest-checkout valid reservation dynamically (mirrors `mint-guest-token.sh`). **Verified: deploy run 27848700405 fully GREEN** (smoke ✓, readiness gate ✓, success recorded). **#286 CLOSED.**
> - Process note: Agent-tool `isolation:worktree` is unreliable here (it didn't isolate the earlier desktop builds) — use sequential builds on a clean tree + non-overlapping scopes (or cs-agent). See [[feedback-agent-worktree-isolation]].
>
> ### State (2026-06-19)
>
> main at the #287 merge (`982381e`). **0 open code PRs** (this handoff aside). Local branches: `main` only. Chat-reply (#283/#284/#285) + #286 (#287) all merged + deployed; qual deploy GREEN again. **Demo note:** the test guest thread `aaa…002` holds UAT scratch messages (06-18 desktop UAT + the #281 verification reply) — clear it / use a fresh reservation before a live demo. **Optional remaining:** full owner-UI browser walk-through of `/admin/chat` (Authentik akadmin login) — covered by tests, not re-walked live.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. dt-tests `review` poll (ritual).
> 2. Pick a new thread — desktop phase + chat reply both done. Candidates: clear/refresh the demo guest thread; optional owner-UI live UAT (`/admin/chat` via Authentik); seed a multi-image + season place for Place Detail's rich gallery path; or new product work.

> **UPDATE 2026-06-18 (DESKTOP PHASE COMPLETE — superseded by the block above): The final 2 desktop screens (Place Detail #279 + Chat #280) are MERGED, DEPLOYED to qual, and browser-UAT'd 9/9 PASS (0 JS errors). ALL 5 desktop guest screens (Home, Discover, Daily Tour, Place Detail, Chat) are now LIVE + verified on qual. One out-of-criteria finding filed: chat is send-only on qual (#281). Resume from this block.**
>
> ### Shipped this session
>
> - **#279 Place Detail desktop** (main @ `75a9226`) + **#280 Chat desktop** (main @ `7aad186`) MERGED. `publish-images` (auto on push) → `deploy-qa.yml -f image_tag=qual` both green; live on qual.
> - **browser-uat 9/9 PASS, 0 JS errors** (harness `e2e/uat-desktop-screens.e2e.mjs`; captures in `temp/desktop-audit/captures/`). **Place Detail:** full-bleed hero (chrome suppressed, opaque caption), breadcrumb, display-lg title, two-pane + sticky 360 rail (stacked Navegar/Ligar/Mensagem + Guardar-ghost + map), no tab bar ≥lg, single-photo business looks intentional, rail-float guard holds at the 1024 seam, 1920 cap 1104 centered, 834 mobile + PlaceMap clears tab bar (pb-28). **Chat:** SubHeader (Miguel+Online, no chevron), centered 820 panel, empty-state (welcome 68px Fraunces + 4 exact PT chips), chip→seed→send, composer pinned + 44px send + NO mic, SuggestionStrip persists, 1920 gutter, 834 mobile.
> - **Process gotcha + recovery:** the two build agents were launched with Agent-tool `isolation:worktree` but it did NOT isolate them — they shared the main tree and crossed branches (Place Detail commit stacked on the Chat branch). Zero file overlap → untangled cleanly (`git branch -f` chat→its own commit; `cherry-pick` place-detail onto its own branch off main). No work lost. Memory: [[feedback-agent-worktree-isolation]] — use cs-agent or strictly non-overlapping file scopes for parallel builds.
>
> ### Open follow-up
>
> - **#281 — chat send-only on qual (FILED):** a guest chat message persists + gets a WS `ack` but no host/agent reply (`them` bubble) ever returns (waited 50s/6 msgs). Server-side reply-path gap on qual (chat-hub reply worker / LLM path / qual overlay), NOT a UI bug — the Chat layout UAT passed regardless. **Confirm/repair before any chat-involving demo.** Candidate next thread.
> - **Multi-image gallery + season rich-path** on Place Detail desktop is untested with real data — no seeded place has >1 image AND a season (Lagoa do Fogo = 1 image, no season). Layout degrades cleanly (auto-absent gallery + no season chip). Seed a true rich place to demo the gallery + season chip.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. dt-tests `review` poll (ritual) — empty at close.
> 2. **#281 chat send-only** — triage chat-hub on qual (is the reply worker running? LLM reply path wired? check `docker logs` on the VPS via `make vps`). Demo-relevant.
> 3. Optionally seed a multi-image + season place to fully exercise Place Detail's gallery/season rich path.
>
> ### State
>
> main `7aad186` (#279 + #280 merged; both LIVE on qual + UAT'd). **0 open code PRs** (this handoff aside). Local branches: `main` only (feature branches deleted post-merge). dt-tests `review` empty. Open issue: **#281** (chat send-only, qual). qual data fixes from prior sessions still apply (not in committed seed). All 5 desktop guest screens live at `https://qual.stay.portugalodyssey.pt`. New captures: `placedetail-desktop-1440-{rich,business}`, `placedetail-{1024-railguard,1920-cap,834-mobile-mapclear}`, `chat-desktop-1440-{empty,active}`, `chat-{1920-gutter,834-mobile}`.

> **UPDATE 2026-06-18 (MARATHON — superseded by the block above): Desktop UI/UX EXECUTING. WF1 audit + WF2 design done. MERGED + DEPLOYED to qual: #267 PlaceCard contrast · #268 foundation · #269 Home · #271 picks-photos · #272 Discover · #274 Home cover-story · #276 BFF+planner (guest LOCALE + per-stop COORDS) · #277 Daily Tour desktop. LIVE-VERIFIED via browser-uat: Home 5/5 · Discover (split + sync + no bold arc; mobile fork intact) · picks 6/6 photographed · cover-story · BUG1 (English itinerary copy → now PT-PT, ptHits=3/enHits=0) · BUG2 (planner returned lodging → now landmarks). Daily Tour desktop LIVE-VERIFIED both stages (two-pane intake + spatial timeline rail + edge-to-edge route map with numbered markers + route line; Voltar present; PT copy; landmark+restaurant stops, no lodging; mobile fork intact). 3 of 5 desktop screens live (Home, Discover, Daily Tour). REMAINING: Place Detail, Chat. Resume from this block.**
>
> ### Done this session
>
> - **qual cleaned (live DB):** deleted 14 stale Unsplash `place_media` rows → qual now **43 places / 32 media** (exact dev parity); the 14 businesses fall back to the branded panel. One-off manual op, forward-compatible (committed seed has no Unsplash).
> - **13 desktop+tablet captures** of all 5 guest screens (browser-uat qual, light theme, 1440 + 834) → `temp/desktop-audit/captures/`.
> - **WF1 — desktop UX audit** (5 lenses → adversarial reconcile → completeness critic) → `temp/desktop-audit/wf1-audit.md`. 6 blockers / 6 majors / 5 minors. Key correction (code-verified): the "bottom-tab stranded mid-page" finding is a full-page-screenshot ARTIFACT, not a CSS bug; the ActionGrid `aspect-square` collapse is the real worst defect.
> - **WF2 — design exploration** (foundation → 5 screens × 3 candidates → judge) → `temp/desktop-audit/wf2-design.md`. **LOCKED foundation = "Editorial AppShell"**: `DesktopAppShell` (contained|rail) + `DesktopTopNav` masthead + opt-in `ContextRail` + `useLayoutMode`/`ResponsiveScreen` + `FullBleed` + `BrandLockup` extraction + `--text-display-lg/-xl`. Breakpoint: lg/1024 floor, md/768 early-engage for Home+DailyTour. **Build seq: Foundation → Discover → DailyTour → Home → PlaceDetail → Chat.** Per-screen specs + 5 paste-ready Stitch prompts in the doc.
> - **#267 MERGED** — PlaceCard overlay no-photo contrast (dark forest surface + stronger scrim); fixes a WCAG blocker on the live mobile app too.
> - **PR1 #268 MERGED** (`main` @ `c1a0984`) — desktop foundation INFRA: `DesktopAppShell`/`DesktopTopNav`/`ContextRail`/`FullBleed`/`useLayoutMode`/`ResponsiveScreen`/`BrandLockup`/tokens. Guarded edits: BrandLockup byte-identical; LocaleSwitcher → `components/`; en/pt-PT `nav.*`. +23 tests.
> - **Desktop Home #269 MERGED + DEPLOYED to qual — LIVE-VERIFIED (5/5)** (`main` @ `981a39b`). FIRST screen, mounts the shell (`ResponsiveScreen engageAt="md"`; <1024 phones untouched). `HomeDesktop` = masthead spread (Greeting `masthead` variant + `--text-display-lg`) + `DesktopSectionNav` (6 verbs as bounded nav cards, icon+label same box → artifact gone) + `HomeBodyGrid` `[1fr_360px]` (picks fluid grid + 2 `DesktopPlanPanel`s). DRY: `ACTIONS`→`actions.ts`, hosts-picks→`use-hosts-picks.ts`, mobile JSX→`home.tsx`. **Cover-story span deferred** (needs a PlaceCard aspect variant). +4 tests; full pwa **253/253**. Deploy: `publish-images` (rebuilds `pwa:qual`) → `deploy-qa.yml -f image_tag=qual` (push-deploy is skipped/manual-only). browser-uat at 1440+834 PASS; screenshot `temp/desktop-audit/captures/home-desktop-NEW-1440.png`.
> - **#271 picks-photos fix MERGED + DEPLOYED — LIVE-VERIFIED (6/6)**. Home "Escolhas do anfitrião" showed 4 photoless `eat` businesses (#135 owner-upload-blocked) → green tiles. Fix: `use-hosts-picks` queries `action=see`; seed `UPDATE` flags 6 photographed see-landmarks (Sete Cidades, Lagoa do Fogo, Furnas Caldeiras, Salto do Cabrito, Caldeira Velha, Pico do Carvão) as `is_hosts_pick` + un-flags the 4 lodging listings. Same UPDATEs applied to qual DB directly. browser-uat: 6/6 photographed, 0 fallback. (`no loc` → BFF returns all picks, no distance filter.)
> - **Desktop Discover #272 MERGED + DEPLOYED — LIVE-VERIFIED** (`main` @ `8f8f315`). Forks `/a/:action` at `lg` via inline `useLayoutMode` (mobile JSX UNTOUCHED → action-drill-down 8/8 pass). `DiscoverDesktop` = `DesktopAppShell frame="rail"` MIRRORED (`railSide="right"`, 400px): map fills the fluid LEFT, `DiscoverListPanel` (stacked PlaceCards, no fork) on the RIGHT; `DiscoverSubHeader` (title + `CategorySegmented` ToggleGroup→/a/:slug + relocated search + count); `DiscoverMapCanvas` uses the new additive `MapView fitToPins`. `DesktopAppShell` gained `railSide`/`railWidth` (additive). browser-uat: split + list↔pin sync + category switch + framed-on-island + NO stray arc (0% magenta) + mobile fork intact. +4 tests; full pwa 257/257. NOTE: a FAINT pale-lilac fit-bounds rectangle remains on the map (bold arc gone; true source still wants live devtools).
> - **#274 Home cover-story MERGED + DEPLOYED — LIVE-VERIFIED**. First host's-pick spans 2×2 as a featured cover when ≥3 picks; also balances the right-rail rhythm gap. No PlaceCard fork (just the `<li>` span). UAT: 4.19× area ratio, all photographed.
> - **#276 BFF + planner-svc (guest LOCALE + per-stop COORDS) MERGED + DEPLOYED — LIVE-VERIFIED**. (a) **BUG1 fix:** JWT `locale` threaded BFF→planner (folded into `request_payload`; planner `_build_plan_request` guards non-string→en); `pickName(locale)` prefers `names[locale]`→en. UAT: fresh tour copy now PT-PT (ptHits=3/enHits=0). (b) `TourStop` now carries `geom_lat`/`geom_lng` (BFF `toStop`/`resolvePlaceMeta` thread catalog geom; nullable) → enables the Daily Tour route map. BFF 97/97, planner 39 passed.
> - **BUG2 (planner relevance) FIXED — LIVE-VERIFIED** (qual data-only). The 4 guesthouses #40–43 were mis-tagged with a `see` `place_action_wish` row → planner correctly returned them. Deleted the 4 tags on qual → guesthouses now have ZERO action tags (invisible to discover + tours = correct for lodging). NOT in any committed seed (admin/listings-inserted); **if re-created via admin, do NOT add action tags.** UAT: tour stops now landmarks, 0 lodging.
> - **Desktop Daily Tour #277 MERGED + DEPLOYED** (`main` @ `f197715`). Forks `/tour/new` + `/tour/:planId` at `md` via `ResponsiveScreen` (timeline forks ONLY the `ready` branch; mobile JSX untouched → tour tests pass). `DailyTourDesktop(stage)`: Stage 1 INTAKE = `TwoPaneIntake` (raised form card wrapping the unforked `IntakeForm` + `EditorialImageryPanel` — reusable for Chat); Stage 2 TIMELINE = rail frame: `TourItineraryRail` (`DaySummaryRail` + unforked `DailyTourTimeline` in a `data-density="desktop"` ancestor-CSS wrapper + pinned Partilhar/Voltar toolbar) + `TourRouteMap` (numbered markers + tea-green polyline). Additive `MapView` `label?`/`route?` (default-off, guarded — mobile inert). +8 tests; full pwa **265/265**. browser-uat PASS both stages: two-pane intake (form + `EditorialImageryPanel`); rail timeline + edge-to-edge route map (numbered markers + connecting line); pinned **Voltar** + Partilhar (dead-end fixed); PT descriptions; stops = landmarks + restaurant (no lodging); mobile fork intact. **Minor polish:** the route polyline reads dark, not clearly tea-green (the `--tea-500` read may be falling back — check `tour-route-map`/`MapView` `teaGreen()`).
>
> ### FIRST TASKS NEXT SESSION
>
> 1. dt-tests `review` poll (ritual) — empty at close.
> 2. **Build the 2 remaining desktop screens** (foundation + Home + Discover + Daily Tour all live): **Place Detail** (§2.3, `engageAt="lg"`; keep the full-bleed hero via `FullBleed`, below it a wide content col + a STICKY info/actions rail + breadcrumb; build as a SEPARATE sibling — the mobile bottom-map region is fragile) → **Chat** (§2.5, `engageAt="lg"`; bounded `ConversationPanel` + editorial empty-state — **REUSE `EditorialImageryPanel`** from Daily Tour). Specs in `wf2-design.md` §2.3 + §2.5 + Stitch §4. Pattern proven 3× (Home contained; Discover + Daily Tour rail-frame, inline `useLayoutMode`/`ResponsiveScreen` fork on the live routes — mobile JSX untouched): build → test → PR → merge → `publish-images` → `deploy-qa.yml -f image_tag=qual` → browser-uat. Delegating the screen build to a focused agent (worktree) + reviewing the diff worked well for Daily Tour.
> 3. Optional: run the 5 Stitch prompts (web UI) to mock screens.
>
> ### Deferred / notes
>
> - **2 demo-critical backend bugs — BOTH FIXED + LIVE-VERIFIED** (#276 BUG1 English copy → PT-PT; qual-data BUG2 relevance → landmarks not lodging). Were the biggest demo risks; now resolved.
> - **Home picks + cover-story + right-rail rhythm** — all DONE (#271, #274), live-verified.
> - Discover **stray map arc** — `fitToPins` killed the bold arc (0% magenta UAT); a FAINT pale-lilac remnant remains. NO line-layer in code (`buildStyle` = OSM raster; only purple is the `MapPin` `--hydrangea-400` selection ring) → needs a live maplibre-instance inspection (the map isn't globally exposed). Low ROI, deferred.
> - **Daily Tour `StopSyncBridge` is INDEX-based** (the unforkable `TimelineStop` has no per-stop hover cb / `data-stop-id`). Works because reorder is local-only (DOM order = `stops` order). If reorder is ever wired to the map, add a `data-stop-id`/hover-callback to the shared `TimelineStop` for id-based sync. Stops degrade gracefully when coords absent (markers skipped, island still framed).
> - The spec's "Overline contrast hardening" = **no-op** (token already 6.8:1 AA on cream) — skipped, verified.
> - **State:** main `f197715` (#267–#277 all merged + LIVE on qual; handoff PRs #270 merged, #273 merged, #275 closed-stale). **1 open code PR: this handoff** (otherwise 0). Local branches: `main` only after merge. qual data fixes applied directly (NOT in committed seed): picks re-point + guesthouse action-tag delete (BUG2) + the 14-Unsplash delete. dt-tests `review` empty. Desktop Home (≥md) + Discover (≥lg) + Daily Tour (≥md) live at `https://qual.stay.portugalodyssey.pt`. NEW captures incl. `home-desktop-NEW-1440`, `home-desktop-PICKS-1440`, `home-desktop-COVER-1440`, `discover-desktop-NEW-1440`, `tour-timeline-PT-VERIFY`, `tour-intake-desktop-NEW-1440`, `tour-timeline-desktop-NEW-1440`.

> **UPDATE 2026-06-17: Slice 2.D shipped + DEPLOYED LIVE to qual; new phase locked — DESKTOP UI/UX (first-class).**
>
> ### Now live
>
> - **Slice 2.D (mobile editorial) = DONE + DEPLOYED to qual** (deploy run 27702539590; bundle `index-B65MhZie.js`; 43 places, 7 seasons, Miguel's 4 guesthouses). **13 PRs merged this session (#254–#265).** main `14181ef`. 0 open PRs.
> - **`make qual-token`** (#265) → prints a ready guest link `https://qual.stay.portugalodyssey.pt/r/<token>` (mints from the furthest-checkout reservation on the VPS via SSH). Owner backoffice at `/admin` via Authentik.
> - Deploy gotcha fixed (#264): `dev-smoke.sh` + `dev-env-check.sh` hard-coded `== 28` places; now `≥ 28` (the exact count false-failed the deploy — the image was actually fine; seed grew to 43).
>
> ### NEXT PHASE — Desktop UI/UX (FIRST-CLASS). Locked decisions (human, 2026-06-17)
>
> The mobile "São Miguel Editorial" app breaks badly on desktop (naive responsiveness stretches a mobile layout). Locked: **desktop = FIRST-CLASS**; **ONE design system, TWO layout systems** — share the editorial _language_ + primitives (`PlaceCard`/`Overline`/`DistanceChip`/tokens); **diverge** page-level layout + IA + interaction per form factor; implement as **desktop-specific layout components** (e.g. `HomeDesktop`/`DiscoverDesktop`) composing the SAME shared primitives, switched at a real breakpoint (~`lg`/1024) — NOT one set of CSS classes for both (that produced the mess). **Scope = guest app now** (backoffice later). **Stitch via web-UI prompts** (MCP unreliable E2E). Full detail: memory `project_desktop_redesign.md`.
>
> ### Desktop critique already captured (from the user's 6 qual desktop screenshots)
>
> `aspect-square` bento → giant empty squares at desktop width (worst); full-width `stacked` PlaceCards in the expanded Discover list → one card = a full-screen banner; the bottom-tab-bar is stranded + the map/bottom-sheet is a phone metaphor (desktop wants **map + list side-by-side**); inconsistent content widths / huge whitespace / tiny click targets. **Non-layout noise to clean first:** qual's media-less businesses show the stale pre-#250 single-Unsplash placeholder (seed residue → truncate like dev did); a stray purple arc on the Discover map (route geometry drawn at world scale).
>
> ### FIRST TASKS NEXT SESSION (the agreed plan — 2 workflows, then build)
>
> 1. **Capture fresh desktop + tablet states** of all 5 screens (browser-uat qual via `make qual-token`) + **clean qual's stale Unsplash business media** (truncate the residue). Both become trusted workflow inputs.
> 2. **Author + run WF1 — UX audit:** parallel expert lenses (mobile-purist · desktop/responsive · IA · visual · a11y) → adversarial dedupe/reconcile + a completeness critic → one curated, prioritized **defect → proposed-solution** list.
> 3. **Author + run WF2 — design exploration** (fed by WF1's curated output): per screen generate N candidate desktop layouts → judge panel (density / IA fit / primitive-reuse / build cost / brand) → recommended direction + concrete build plan + Stitch prompts for the chosen direction.
> 4. **Build** the chosen desktop layout components.
>
> - dt-tests `review` poll at start (ritual). main clean, 0 open PRs.

## Prior (mobile) Slice 2.D detail — 2026-06-17

> **UPDATE 2026-06-17 (LATEST): Marathon session — built ALL of Plan-002 Thrust B / Slice 2.D: the 5 PWA screens rebuilt to the "São Miguel Editorial" design + foundations + host rename + a polish + a backend follow-up. Every screen browser-verified in light AND dark. 8 PRs MERGED (#254–#261); #262 (season) OPEN as a PR. Resume from the "FIRST TASKS NEXT SESSION" block below.**
>
> ### What shipped (main tip after #261 = `e92b4de`; #262 awaiting merge)
>
> - **#254** foundations — editorial tokens both themes (MD-role surface ladder in `tokens.css`/`globals.css`, mockup classes 1:1) + primitives (`Overline`, `DistanceChip`, `BrandAppBar`, `BottomTabBar` 4-tab+stubs, shadcn `Sheet`/`Avatar`) + `PlaceCard` restyle (`stacked` default + `overlay` variant).
> - **#255** Place Detail · **#256** Home · **#257** Daily Tour (+per-stop hero thumbnails via new BFF `toStop` plumbing) · **#259** Chat · **#260** Discover (map+draggable-sheet rebuild + BFF discover `geom_lat/lng`). All browser-UAT'd both themes (screenshots in `temp/uat-2d-*/`).
> - **#258** host rename **João → Miguel** everywhere hardcoded. **#261** editorial `BackLink` (lucide arrow, tea-green, no underline) replacing the bare-"←" underlined links (tour/place-detail/discover) — the user's design critique.
> - **#262 (OPEN PR)** place `season` plumbing: catalog-svc `/hydrated` now returns `season`, BFF passes it through, 7 summer spots seeded → the Place-Detail **Details card is now functional end-to-end** (verified: BFF `/v1/places/<#010>` returns `season:"summer"`).
> - **D1 theme bug** (route renders light fallback because it never mounts `useThemeAuto()`) found on #255 and fixed per-route on `/p/:id`, tour+`/tour/new`, `/chat`. (`/` + `/a/:action` already had it.)
>
> ### Scope decisions locked this session (human)
>
> Auto **light+dark** editorial (kept sunrise/sunset switch; light extrapolated from the dark-only mockups) · Discover = **full map+sheet rebuild** · bottom nav = **full 4-tab with "coming soon" stubs** · premium cards kept **active** (not disabled) · the chat host is **Miguel**.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **dt-tests poll** (ritual).
> 2. **Merge #262** (season plumbing — verified, draft/PR; the only open PR). Squash → main.
> 3. **Open follow-ups** (all non-blocking, recorded in `002-deploy-and-polish/README.md` "Backend follow-ups (status)"): shared authed-layout to mount `useThemeAuto()` once (replaces the per-route calls) · rich embedded place-card message in Chat (needs a chat-hub protocol extension — text-only today) · OSM base map basalt-theming in dark (Discover) · `hours` content for the Details card (plumbing done, no data seeded) · F1 Home host's-picks `distance_km`.
> 4. **dt-tests forward-flow UATs** for the editorial screens (UI-touching; none minted this session — the browser-uat agent verified each instead).
>
> ### Gotchas / env state (learned this session)
>
> - **Guest session is IN-MEMORY** (no persist) → a full page reload onto an authed route drops it and bounces to `/?reason=expired`. To screenshot an authed route: redeem `/r/<token>` → set `localStorage.theme` on home (where `useThemeAuto` mounts) → **SPA-navigate** (not a hard `goto`). The working multi-use redeem token: `YI3yn18QsI4jGxF6yxGswb7v4BXLC-Ik` (reservation `ccc…002`, pt-PT). Reservation `…001` is past-checkout (mint → 410).
> - **Dev stack crashed mid-session** (~11 services SIGKILL/SIGTERM, exit 137/143 — transient host memory spike) and was brought back with `make up`; dt_bff also cycled once and recovered on `docker restart`. The **first redeem after a BFF restart can 500** (cold start) — retry clears it. Stack is UP at handoff.
> - **maplibre can't render in jsdom** → Discover unit tests mock `MapView` + assert pin data; the map/drag/pins are proven only by the browser-uat (5/5 PASS, `temp/uat-2d-discover/`).
> - The **rebase of each editorial PR auto-merged the `*.json` i18n overlaps** (different key regions) — no manual conflict resolution needed.
> - Dev-DB residue (harmless, reset by volume wipe): I seeded `season='summer'` on 7 places via the committed seed; a verification chat thread for guest `aaa…002` was seeded then cleaned. `places-seed.test.ts` still hard-codes 43 places / 32 media (season UPDATEs don't change counts).
>
> ### State
>
> `main` synced (`e92b4de`). **1 open PR: #262** (season). Local branches: only `main` + `docs/slice-2d-closeout` (this doc PR) + `feat/place-detail-season` (#262). dt-tests `review` empty (polled). **Slice 2.D = DONE**; Plan-002 Thrust B implementation complete (Slice 2.B design + 2.D build both done).

> **UPDATE 2026-06-16: Big session — polish tails dispositioned, Plan-006 deployed to qual, and Plan-002 Thrust B (design pass) largely shipped, ending with Miguel's 4 REAL guesthouses + 11 real POIs seeded into the catalog with real photos. 6 PRs merged (#247–#252) + the qual deploy. Resume from the "FIRST TASKS NEXT SESSION" block below.**
>
> ### What shipped this session (all merged to main, tip `eb93224`)
>
> - **#247** `fix(deps)` — patched 2 prod HIGH CVEs (ws→8.21.0, protobufjs→7.6.4 via root `pnpm.overrides`); these were silently blocking ALL pushes (the audit gate). protobufjs pinned `<8` to stay compatible with `@grpc/proto-loader`.
> - **#248** `chore: plan-002 thrust-b` — **T-2.B.2 i18n review** (pt-PT reviewed via `revisor-ptpt`: pré-AO fixes + register; only `en`+`pt-PT` are wired, `de`/`es`/`fr` unwired+incomplete → documented in `apps/pwa/src/locales/README.md`) + **T-2.B.0 design foundations** (`docs/design/DESIGN.md` "São Miguel Editorial" + the Stitch screens).
> - **#249** `feat(pwa): real brand mark` — **T-2.B.1**: pin + tea-leaf `logo.svg` (location-agnostic — deliberately NOT a single landmark) + regenerated PWA icon set. Cream icon bg. Doc `docs/design/brand-mark.md`.
> - **#250** `feat(pwa,catalog-svc)` — branded **photo-less Hero fallback** (places w/o a real photo show a tea-green "photo coming soon" panel, not a broken img / fake stock) + dropped 14 business Unsplash placeholders + **11 real near-guesthouse POIs (#29–39)** (Tasquinha Vieira, Mariserra, Portas do Mar, Intz48 coffee, Sunset Beach Bar, Praia de São Roque/Pópulo, Carlos Machado, Forte de São Brás, Gruta do Carvão, Mãe de Deus — Nominatim-geocoded, EN+pt-PT, Eat/Drink/See/Do tags).
> - **#251** `feat(catalog-svc,pwa)` — **The Place (#40)** = host Miguel's own guesthouse (Fajã de Baixo), host's pick with **6 of his own real photos** (user-supplied golden-hour exteriors; resized to 1600×1067, self-hosted `/media/the-place/`).
> - **#252** `feat(catalog-svc,pwa)` — **The Escape/View/View Point (#41–43)** = Miguel's 3 Calheta-area apartments (Gaveto building), host's picks with 4 real listing photos each (`/media/<slug>/`). Corrected The Place pin to precise coords.
> - **Qual deploy** — `deploy-qa.yml` run **27548580776** success; Plan-006 (reservations + place-form season/contacts/hours) LIVE on `qual.stay.portugalodyssey.pt` (bundle hash changed; `season` migration applied).
>
> ### Catalog state now: **43 places, 32 media**
>
> 14 landmark Commons photos (audited 2026-06-16: all live + licence-compliant — 10 PD, 4 CC-attributed) + Miguel's **4 guesthouses w/ real photos** (#40–43) + **11 POIs** (#29–39, media-less → fallback) + 14 businesses (media-less → fallback). See [[project-miguel-guesthouses]] (the guesthouse table, coords, the 149-photo browser-uat haul in `temp/miguel-photos/listings.json`) and [[project-135-photo-sourcing]].
>
> ### Stitch mockups (T-2.B.0)
>
> All 5 screens generated + in `docs/design/stitch/` (`*.png` + `*.html`): Home, Place Detail, Discover, Daily Tour, Chat — premium/editorial "São Miguel Editorial" system. **MCP `generate_screen_from_text` is blocked here (transport timeout) — use the Stitch web UI; reads work.** See [[reference-stitch-mcp-timeout]]. Project `11661203433672958283`, design system asset `8a6674ad896243c8881fc985aee6f504`.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **dt-tests poll** (ritual) — `mcp__tasks-prod__list_tasks(project_id='e03901a6-…081cc', statuses=['review'])`.
> 2. **Miguel's original high-res photos** (he's sending them — repo synced to a cloud account). Swap/supplement the current starters **additively** (new `place_media` rows; The Place has 6 user-supplied, the 3 Calheta have 4 Airbnb-starter each; 149 more URLs in `temp/miguel-photos/listings.json`). Drop incoming files in `temp/owner-photos/<slug>/`.
> 3. **See it live** — the seed has all 43 places but qual/dev hasn't been re-seeded; re-seed dev (`pnpm --filter @daily-tour/catalog-svc seed:places`) or redeploy qual to render The Place + guesthouses + POIs end-to-end. Could browser-UAT it.
> 4. **Downstairs restaurant POI** — Gaveto building ground floor (Miguel's tenant, not his) — add once named.
> 5. **Remaining Thrust B**: implement the 5 designed screens in React (a later Plan-002 slice — design is done, code is not); `de`/`es`/`fr` translations remain unwired+incomplete (documented).
> 6. **Data-model follow-up**: guesthouses are seeded as catalog places (host's picks) — pragmatic for the demo. Proper model = first-class **guesthouse entity with a hero column + media-svc owner-upload pipeline** (`catalog.guesthouse` has no media column today).
>
> ### Gotchas (learned this session)
>
> - `services/catalog-svc/src/__tests__/places-seed.test.ts` **hard-codes seed counts** (now 43 places / 32 media / ≥43 tags). It boots a Postgres testcontainer → **skipped locally without Docker, runs in CI** → it's the check that silently blocks seed PRs (#250 hit this). **Update it on EVERY seed-count change.**
> - Stitch MCP screen-gen times out + doesn't persist (use web UI). browser-uat got past Airbnb's 403 by reading the page-state JSON (real Chrome). The photos are Miguel's own uploads → legit to self-host for his app.
> - `gh pr checks --watch && gh pr merge` can exit 0 without merging when a check fails → use the verify-then-merge pattern (re-check for `fail|pending` before merging).
> - **State:** `main` synced (`eb93224`); **0 open PRs**; branches clean (only `main`). Memories updated: [[project-miguel-guesthouses]], [[project-135-photo-sourcing]], [[reference-stitch-mcp-timeout]], [[project-client-miguel]].

> **UPDATE 2026-06-15 (earlier): Plan-006 is now DEPLOYED LIVE on qual, and the three "polish tails" were investigated → ① already-resolved, ② & ③ deferred-with-rationale (not quick code fixes). Next thread is Plan-002 Thrust B (design pass) — needs human steer on brand/photo direction. Resume from here.**
>
> ### Deploy — Plan-006 → qual (✅ live)
>
> `deploy-qa.yml` dispatched (`-f image_tag=qual`, run **27548580776**, conclusion **success**). Pull → additive `season` migration 0006 → reconcile `--wait` → akadmin→staff → internal smoke 8/8 → `--qual` readiness gate → record; auto-rollback armed, not triggered. External smoke confirms live: home `200`, `/admin/reservations` SPA `200`, `registerSW.js` `200 application/javascript`. **PWA bundle hash changed `index-cknRgIsG.js`→`index-QjhTWws3.js`** = the new image (6.E reservations screen + 6.F place-form season/contacts/hours) is genuinely serving. The `season` column migration applied on the live qual DB (implied by the `--wait` health gate passing). The Plan-006 features were already forward-flow UAT'd PASS on dev (3/3); the **owner-login deep UAT on qual** (issue/revoke a token, edit a place's season/contacts/hours via Authentik) was NOT re-run here — available on request, needs akadmin creds from `.env.qual` on the box. Not a blocker.
>
> ### Polish tails — investigated, dispositioned (no code changes this session)
>
> - **① `registerSW.js` 404/MIME → ✅ ALREADY RESOLVED.** Probed live qual directly: `registerSW.js` → `200 application/javascript` (134 B), `sw.js` → `200 application/javascript`, still referenced in served `index.html`. The symptom (from the pre-#220 image) no longer reproduces; the GHCR nginx PWA image serves `.js` with the correct MIME via the stock `nginx:alpine` `mime.types`. No nginx edit warranted (would be a speculative change for a non-reproducing problem). Re-confirmed post-deploy.
> - **② osrm re-enable → ⏸️ DEFERRED (escalate infra, not a tail).** Confirmed the Geofabrik Azores extract is GONE: `europe/portugal/acores-latest.osm.pbf` → 302-redirects to site root. Re-enable needs whole-Portugal PBF (~hundreds of MB → real OOM risk on the live 2-vCPU/512 MB box during `osrm-extract`) or adding `osmium` clipping to `infra/osrm/Dockerfile`+`init.sh`. Haversine fallback is active + chaos-tested (`tests/chaos/scenarios/osrm-down.test.py`). Touches the live box + always-escalate → not executed without explicit go. Ready-to-run plan: bump `overlay.osrm.yml` mem cap to 1G, point `init.sh` at `portugal-latest.osm.pbf` OR add osmium clip step, re-add `overlay.osrm.yml`+the deferred block in `overlay.qual.yml` (currently commented lines ~252–256), validate first-run extract time/mem on a qual clone before going live.
> - **③ StrictMode `flushSync` warning (`/r/`→`/`) → ⏸️ DEFERRED (dev-only cosmetic).** The only literal `flushSync` (`apps/pwa/src/components/map-view.tsx:53`) is NOT in this path — `AuthedIndexRoute` (the authed `/`) renders no map. The warning is React dev/StrictMode console noise (stripped in prod). NOT reproducible in the test harness (`r-token-route.test.tsx` uses `createMemoryRouter`, no `<StrictMode>`), so a safe fix needs a live browser repro of the release-critical guest-entry flow. Not worth a blind edit to guest-entry for console cleanliness.
>
> ### Plan-002 Thrust B (Slice 2.B — Design Pass) — STARTED this session
>
> Direction chosen by the human: **premium / editorial** ("travel magazine, not booking app"), keeping the Green Island palette anchors. Started with **T-2.B.0 (Stitch mockups)**, then pivoted to **T-2.B.2 (translation review)** when the Stitch MCP blocked.
>
> - **T-2.B.0 — Stitch mockups: ✅ DONE (all 5 screens).** Captured the Stitch **"São Miguel Editorial"** design system (project `11661203433672958283`, asset `8a6674ad896243c8881fc985aee6f504`) into `docs/design/DESIGN.md` (was Stitch-only). All 5 screens generated + integrated into `docs/design/stitch/` (full-res `*.png` native 780-wide + structural `*.html`): **Home** (`home-v{1,2}.html`), **Place Detail**, **Discover** ("Map" variant — peek ribbon + distance chips), **Daily Tour** ("A day around Furnas", tall 5-stop timeline), **Chat** ("Journal — Chat with João"). Premium/editorial, on-brief, cohesive. **MCP gen BLOCKER (see [[reference-stitch-mcp-timeout]]):** `generate_screen_from_text` times out + doesn't persist (transport cancels the long op) → the human generated the 4 in the **Stitch web UI**; MCP _reads_ (`list_screens`/`get_screen`) work, so I pulled renders+HTML via MCP (full-res via lh3 `=w780`). Stitch auto-made 6 editorial place photos (Caldeiras, Lagoa das Furnas, Terra Nostra, Gorreana, Pico do Ferro, Lagoa do Fogo) as side assets in the project. **Reconcile note:** Stitch DS uses Newsreader; app uses Fraunces — standardise on Fraunces at implementation.
> - **T-2.B.2 — translation review: DONE.** Found only `en` + `pt-PT` are wired in `lib/i18n/index.ts` (`de`/`es`/`fr` exist on disk but are UNWIRED → those browsers fall back to en). Reviewed the LIVE **pt-PT** (100% parity, 6 ns) via `revisor-ptpt`: linter 7→0, pré-AO fixes in `admin.json` (`Acções`/`actualizar`/`Activo`/`redireccionar`/`Selector`/`seleccionar`/`vêem`) + register fix in `place.json` (`podes`→`pode`); parity + placeholders verified. Documented `de`/`es`/`fr` status (79%/79%/25% coverage, +8 stale `locale.*` keys from the abandoned 5-locale scope, machine-grade, unwired) + an activation checklist in `apps/pwa/src/locales/README.md`.
> - **Remaining Slice 2.B:** **T-2.B.1** brand mark + icon regen (needs human steer), **T-2.B.3** photography for 28 places (`temp/place-photo-sourcing.md`; commission vs Commons-curated — note Stitch already generated 6 usable editorial place photos this session). Implementation pass (build the 5 screens in React) is a later Plan-002 slice.
> - **State:** **#247** (prod CVE fix: ws + protobufjs) **MERGED** to main. **#248** (`feat/plan-002-thrust-b-design-i18n` — pt-PT i18n review + design-system + all 5 Stitch screens) **OPEN, green CI**, awaiting human merge. No cs-agent worktrees; dt-tests `review` empty. Plan-006 features live on qual (run 27548580776). The dev-stack note below is obsolete (stack stays down; qual is the live target).

> **UPDATE 2026-06-15 (earlier): Plan-006 is DONE — all 15 tasks merged (5 PRs #240–#244) AND forward-flow UAT PASS 3/3 on the local dev stack. The whole owner-backoffice plan (6.A–6.F) is shipped + verified.**
>
> Two-round cs-agent fan-out. **Round 1 (backend) delivered but skipped the PWA UI** (the under-delivery risk) → I salvaged the backend into clean PRs. **Round 2 used UI-only prompts** (lead with file creation; "backend is DONE on main") → **delivered the UI cleanly**. Merged:
>
> - **#240** 6.E.0 — token-svc list + reservation-scoped revoke + BFF owner-gated `/v1/admin/reservations`.
> - **#243** 6.E.1 — reservations screen (Issue→`/r/<token>` link + Revoke + nav link).
> - **#241** 6.F.1 (data+API) — `place.season` column/migration/shared-types + catalog route round-trip (I added the route wiring the agent omitted).
> - **#244** 6.F.0 + 6.F.1 control + 6.C.2 — contacts/hours/season controls in `place-form.tsx`; verified owner media → guest `<Hero>`.
> - Integration fixes: prettier-formatted both rounds (agents bypassed the hook); fixed one strict-index TS error; clean rebase resolved the 2 PRs' `admin.json` i18n overlap.
>
> **Plan-006 = 15/15 DONE.** All slices shipped + the 6.E/6.F UI forward-flow UAT'd PASS (reservations issue/revoke; place-form contacts/hours/season save→reopen, DB-confirmed; guest hero render). Evidence: `temp/uat-plan006/` + `temp/uat-plan006.mjs`.
>
> ### First task next session — pick a NEW thread (Plan-006 + Plan-007 both done)
>
> The major plans are closed. Candidates:
>
> 1. **Plan-002 Thrust B — real design pass** (Stitch mockups, brand mark, real photography for the 28 places, translation review). The big un-started product lane.
> 2. **Non-blocking polish:** #158 (registerSW.js 404/MIME — PWA SW auto-registration on qual) · re-enable **osrm** (deferred → haversine) · a low-pri React StrictMode `flushSync` warning on the guest `/r/`→`/` nav (UAT-noted).
> 3. **Deploy the Plan-006 features to qual** — they're on main + dev-UAT'd; a `deploy-qa.yml` redeploy + a qual smoke would put reservations/field-editing live on `qual.stay.portugalodyssey.pt`.
>
> ### Dev-stack note (THIS session brought it up for the UAT)
>
> The local dev stack is UP (12 dt\_ + 3 authentik containers + Vite on :5173) — **brought up on standard ports after the human took cc-dev down**. At session end I tear it back down (`make down` + authentik overlay down + kill Vite) so cc-dev can return. UAT test-data residue: reservation `ccc…002` has one active token; place `…021` holds UAT contacts/hours/season — both reset by a volume wipe; harmless otherwise.
>
> - **State:** `main` synced (tip #245→ this docs PR); all sweep branches merged + deleted; agent worktrees killed; **0 open code PRs**. dt-tests `review` empty.

> **UPDATE 2026-06-13 (earlier): Plan-006 sweep started — 6.E + 6.F backend landed as 2 escalate PRs; the PWA "UI wave" remains, gated on those merging.**
>
> Fanned out 2 cs-agents (reservations lane + place-form lane). Both **delivered their backend half but skipped the PWA UI** (the known under-delivery risk; they also auto-committed past the prettier hook). I reviewed both diffs, re-formatted, fixed a real gap, and split into clean PRs:
>
> - **PR #240** `feat(bff,token-svc)` — **6.E.0** reservations backend: token-svc `GET /v1/reservations` (derived token_state) + reservation-scoped `DELETE …/token` revoke + BFF owner-gated `/v1/admin/reservations` (list/issue/revoke proxy) + test. CI/gates green. **Escalate** (auth + token lifecycle).
> - **PR #241** `feat(catalog-svc,shared-types)` — **6.F.1 (data+API)** `place.season` column + CHECK + migration `0006` + shared-types enum. The agent left out the **catalog route wiring** so the column wouldn't round-trip — I added `season` to `CreatePlaceBodySchema` + POST `.values` + PATCH patch + `formatPlace` (covers list/detail/create/update). shared-types 52/52, catalog-svc 26/26. **Escalate** (migration).
>
> ### First task next session — merge the backend, then the UI wave
>
> 1. **Review + merge #240 + #241** (escalate — your call; both reviewed + gated). Serialize (branch-protection cascade).
> 2. **UI wave** (gated on #240/#241 on main — build against the merged backend): **6.E.1** reservations screen (`admin.reservations.tsx` + `features/backoffice/reservations/**`, consumes #240) · **6.F.0** contacts/hours controls + **6.F.1** season select in `place-form.tsx` (body forwards verbatim → catalog; uses #241's season) · **6.C.2** confirm owner-uploaded hero renders guest-side (likely already true). Precise spec in `006-owner-backoffice/TODO.md` (the "UI wave" block). **Re-delegate with UI-only prompts that LEAD with the exact .tsx files** (the prior agents buried the UI under backend and skipped it), or do inline.
> 3. **UATs** (need `make up` + Authentik): owner edits contacts/hours/season; reservations issue/revoke round-trip.
>
> - **State:** `main` synced; 2 feat branches pushed (#240, #241); agent worktrees killed + orphan branches deleted. Plan-006 now 11/15 (6.A–6.D done; 6.E/6.F backend in PR). dt-tests `review` empty.

> **UPDATE 2026-06-13 (earlier): Plan-007 is FULLY CLOSED. The close-out UAT found a release-blocking guest-entry bug + an owner-provisioning gap + a missing guesthouse seed; all three fixed, merged (#234, #235, #238), redeployed, and re-UAT'd PASS in a real browser. Every Plan-007 criterion is verified live on `https://qual.stay.portugalodyssey.pt`. Riff #157 + #152 closed. Resume cold from this block — start a NEW plan/thread.**
>
> ### What shipped this session
>
> - **#234** `fix(bff,pwa,infra)` (merged) — BFF redeem moved to **`/v1/r/:token`**; SPA keeps the browser route `/r/:token`; apex `/r` path-router dropped. Fixes the same-origin collision where a cold guest link 200'd as raw JSON. Public link shape unchanged; D15 redaction regex already matches `/v1/r/`.
> - **#235** `fix(infra/deploy)` (merged) — idempotent `deploy-qa.yml` step provisions **akadmin → staff** (blueprint makes the group, bootstrap makes the user, nothing joined them → owner 403 on a clean deploy). Qual-only, additive, fail-soft.
> - **Redeploy** (`deploy-qa.yml -f image_tag=qual`): all steps green incl. the new akadmin step + smoke on `/v1/r/`. `publish-images` rebuilt `bff:qual`+`pwa:qual` @ f3d216e.
>
> ### Verified live (evidence in `temp/uat-plan007/`)
>
> - **Guest cold-entry — ✅ PASS (re-UAT'd post-fix).** Genuine cold nav to `https://qual.stay.portugalodyssey.pt/r/<token>` → `200 text/html`, SPA boots, `exchangeOpaqueToken` XHR → `/v1/r/<token>` `200 {jwt}`, session stored, lands on the authed home; `/v1/discover` 200 under the guest Bearer JWT. No console errors.
> - **Owner login + backoffice — ✅ PASS.** akadmin → Authentik → `/admin` (no 403), 28 places render.
> - **Hero + attribution over TLS — ✅ PASS.** Lagoa do Fogo "© Samuel Fonseca 85 · CC BY-SA 3.0"; Praia de Santa Bárbara "© JCNazza · CC BY 3.0".
>
> ### First task next session — pick a new thread (Plan-007 done)
>
> Plan-007 is closed; the qual env is live + reproducible + fully UAT'd. Candidates, in rough priority:
>
> 1. **Plan-006 leftovers** (`docs/implementation-plans/006-owner-backoffice/TODO.md`) — the active feature plan: **6.E** reservations screen · **6.F** field gaps (#150 season col, #151 hours/contacts in admin.places) · **6.C.2** per-place hero upload.
> 2. **Deeper owner flow on qual** — UAT owner **create-place + photo-upload + publish** (Plan-006 uploaders, only dev-UAT'd so far). Not a deploy blocker; the 2.A core journeys are verified.
> 3. **Non-blocking qual polish:** **#158** registerSW.js 404/MIME (PWA SW auto-registration) · re-enable **osrm** once a lightweight Azores PBF source is sorted (deferred → haversine).
> 4. **Plan-002 Thrust B** — real design pass (Stitch mockups, brand mark, photography, translation review).
>
> **State:** `main` synced (tip = #238); all session branches merged + deleted; **0 open PRs**. Riff #152 + #157 closed; #158 open (non-blocking). dt-tests `review` queue empty. The live qual env runs entirely on committed config + idempotent deploy reconciles (akadmin→staff via #235, guesthouse via #238). 18 containers healthy.

> **UPDATE 2026-06-13 (earlier): Plan-007 — qual env LIVE + REPRODUCIBLE. `https://qual.stay.portugalodyssey.pt` (trusted cert, http→https redirect, 8/8 smoke green, real LLM tour plans). The 8-item punch-list ✅ + a CLEAN RE-DEPLOY from wiped volumes proved `deploy-qa.yml` reproduces the env end-to-end — all hand-applied workarounds dropped.** Resume cold from this block.
>
> ### What's live (srv911943 / 77.37.86.126)
>
> - Q.1+Q.2+Q.3 done: island-chronicles stopped + backed up, 4 GB swap, ufw + key-only SSH; Cloudflare DNS (apex + `*.qual.stay`); GitHub runner `qual-vps` (systemd `actions-runner-qual`, hand-written unit — no `svc.sh`); `/opt/daily-tour` clone (project `dt-qual`, `.env.qual`); ACME prod cert. 17 healthy containers; `ANTHROPIC`/`EMBEDDING` keys in `.env.qual` → real LLM plans. **Deploy = `gh workflow run deploy-qa.yml -f image_tag=qual`** (or a `[deploy-qa]` main push); `make vps` SSHes in.
> - The live env now runs **entirely on committed config + `.env.qual`** — the earlier hand-patches are gone (validated by the clean re-deploy).
>
> ### Plan-007 essentially DONE — reproducibility proven
>
> Punch-list 8/8 (#226 + #228) + the clean re-deploy surfaced + fixed 4 deploy-only bugs (#230 traefik `dynamic` `:ro`, #231 `init-qual` perms + osrm Geofabrik-404 → **osrm deferred** / haversine, #232 `dev-env-check --qual` osrm). Final `deploy-qa.yml` run = full green (pull→up→reconcile→migrate→seed→smoke→`--qual` gate→record). Detail: plan EXECUTION Wave 3.
>
> ### First task next session — final admin close of Plan-007
>
> Deploy is reproducible + DEPLOYS.md has its first entry. Remaining to fully close Plan-007: **(1) owner-login UAT** — Authentik `/admin` on the qual URL (a fresh authentik volume re-bootstrapped akadmin via `AUTHENTIK_BOOTSTRAP_PASSWORD`; verify akadmin ∈ `staff` and an owner can edit a place). **(2) hero/credit-chip-over-TLS UAT** (DT-TESTS batch for the qual URL). **(3)** close T-0.4.4 + Plan-002 Slice 2.A rows. **Optional follow-up:** re-enable osrm once a lightweight Azores PBF source (or processing budget) is sorted — currently deferred, planner uses haversine.

> **UPDATE 2026-06-12 (latest): Plan-007 Phase Q.1 (VPS prep) — ✅ COMPLETE. The VPS is deploy-ready. Only Q.3 (runner + DNS + first deploy) remains.** Resume cold from this block.
>
> ### What happened on the box (srv911943 / 77.37.86.126, root key SSH)
>
> Q.1 executed step-by-step with a verification gate after each (detail in plan EXECUTION.md Wave 2):
>
> - **island-chronicles backed up + cleanly stopped** — tar (216M, sha256-verified on-box + off-box at `/media/jmeireles/ssd3/vps-backups/`), then `compose stop` (7 containers exited, `unless-stopped` keeps them down across reboot). **80/443/8080 are now free** for the qual stack. Data volumes intact; restartable any time.
> - **4 GB swap** (persisted) + `swappiness=10`. **ufw** active (allow 22/80/443). **sshd `PasswordAuthentication no`** (key-only; root + `ubuntu` keys both work — verified via a fresh connection under a deadman switch). **prune cron** → dangling-only (won't eat tagged daily-tour images). **Toolchain**: `node v22.22.3` + `pnpm 9.14.2` + git system-wide.
>
> ### First task next session — Q.3 (the actual deploy)
>
> - **Q.3.0 Cloudflare DNS** (likely needs the human or a CF API token): A `qual.stay` + `*.qual.stay` → 77.37.86.126, **DNS-only / grey-cloud** (so ACME HTTP-01 + WS pass through). **Blocks Q.3.2 ACME.**
> - **Q.3.1 GitHub runner** — `ghrunner` user + register self-hosted runner labels `[self-hosted, qual-vps]`, concurrency 1, systemd. Doable without the human (needs a repo runner-registration token via `gh`).
> - **Q.3.2 first-deploy runbook** — clone `/opt/daily-tour`, `gen-env-qual.sh` (set the `__SET_MANUALLY__` keys: ANTHROPIC_API_KEY, EMBEDDING_API_KEY, TRAEFIK_ACME_EMAIL, telegram/whatsapp), ACME **staging→prod**, Authentik bootstrap + akadmin→staff. All GHCR images are published + the deploy workflow/overlays are merged, so this is mostly orchestration.
> - **Q.3.3 verify** — `dev-smoke.sh` + `dev-env-check.sh --qual` + owner login + hero/credit over TLS.
> - **Note:** GHCR images may be **private** by default — the VPS `docker compose pull` will need a GHCR pull credential (PAT or the runner's token) unless the packages are made public. Decide during Q.3.1/Q.3.2.

> **UPDATE 2026-06-12 (later): Plan-007 Phase Q.2 (repo plumbing) — ✅ COMPLETE, 8/8 tasks merged + GHCR pipeline 11/11 green. VPS still untouched.** Resume cold from this block.
>
> ### What shipped (all merged to `main`)
>
> - **Q.2 = 8/8 done** via cs-agent fan-out (orchestrator-reviewed every diff): **#214** GHCR publish workflow · **#216** qual overlay (TLS + apex `/v1`+`/r` path-routing + GHCR images + mem_limits) **+ Q.2.2 folded in** (prod ACME resolver + email-via-command-flag fix) · **#215** `.env.qual` generator + example + rotated `init-qual/02-roles.sql` · **#220** PWA→GHCR nginx image (`apps/pwa/Dockerfile`) · **#218** Authentik qual redirect URI + `overlay.qual-authentik.yml` (auth. 404 TLS fix) · **#217** `dev-env-check.sh --qual` · **#219** `deploy-qa.yml` self-hosted deploy workflow + parameterised `dev-up.sh`/`dev-smoke.sh` (ENV_FILE/PROJECT/--to).
> - **GHCR images all published** (`:qual` + `:sha`) for the 8 services + postgres + osrm + pwa. The maiden `publish-images` run exposed 2 latent osrm bugs — **#221** (`v5.28.0`→`v5.25.0`, 404), **#222** (stretch-EOL apt → archive.debian.org) — both fixed + locally build-validated; pipeline now **11/11 green**.
> - **Orchestrator rescues** (logged in plan EXECUTION.md): #215 missing example/gitignore, #217 unwired `--qual` vars, **#219 agent badly underdelivered** (no workflow file → orchestrator wrote it, incl. parameterising `dev-smoke.sh` which had the same project/env hardcoding).
>
> ### State for resume
>
> - `main` clean + synced; no open PRs, no cs-agent worktrees, no leftover branches. dt-tests `review` queue empty (polled at start).
> - **Merge note:** `main` ruleset requires up-to-date branches (`--admin` won't bypass) → each merge needs `gh pr update-branch`→CI→merge cascade.
> - New files on main: `infra/compose/overlay.qual.yml`, `overlay.qual-authentik.yml`, `.github/workflows/publish-images.yml` + `deploy-qa.yml`, `scripts/qual/gen-env-qual.sh`, `.env.qual.example`, `apps/pwa/Dockerfile`. `dev-up.sh`/`dev-smoke.sh`/`dev-env-check.sh` gained qual modes.
>
> ### First task next session
>
> **Q.1 (live VPS prep) + Q.3 (runner/DNS/first deploy) — both gated on the human's explicit go** (Q.1 stops island-chronicles + hardens SSH on a live box). Plan TODO Q.1/Q.3 checklists + README §1/§3 acceptance are ready. The GHCR images + all overlays/scripts are in place, so once the human green-lights the VPS, execution is: Q.1 prep → Q.3.0 DNS + Q.3.1 runner → Q.3.2 first-deploy runbook (clone `/opt/daily-tour`, gen-env, ACME staging→prod, Authentik bootstrap) → Q.3.3 verify.

> **UPDATE 2026-06-12: Plan-007 (qual VPS deploy) created from 3-agent recon and accepted → READY. New HIGH CVE fixed (#211). 6.B stack + otel fix merged + verified live (#206–#210). Stack brought DOWN (host needed for another project).** Resume cold from this block.
>
> ### What happened
>
> - **6.B + recovery follow-through merged (human-instructed):** #206 (otel→ghcr compose fix), #207+#208+#209 (full 6.B stack — note #208 auto-merged into the stack branch, so #207's squash carries the render code), #210 (wave log). catalog-svc+bff rebuilt; **verified live**: hydrated Lagoa do Fogo returns Commons URL + attribution `{Samuel Fonseca 85, CC BY-SA 3.0}`; vite hot-reloaded the credit chip.
> - **New HIGH CVE caught by the pre-push audit gate**: `@grpc/grpc-js` 1.14.3 (2 advisories, GHSA-5375-pq7m-f5r2), transitive via OTel in `packages/shared-otel`. Fixed with the #200-style pnpm override → **#211 merged**. `pnpm audit --prod` clean.
> - **Dev stack is DOWN** (`make down` + authentik overlay down + vite stopped) — host ports freed for another project. **Volumes intact** (heroes, attribution rows, #152 guesthouse row survive). `make up` works cleanly now (#206).
> - **UATs DT-TESTS-25/26/27/28 still pending the tester** (todo; review queue empty at close-out). Env bring-up steps are in each task's Setup section.
> - **Plan-007 — Qual VPS deploy — created and READY**: `docs/implementation-plans/007-qual-vps-deploy/` (README + TODO). Built from 3 parallel recon agents (read-only VPS sweep, repo deploy-surface inventory, po-platform DNS/branding). **Decisions locked 2026-06-12**: subdomain **`stay`** (qual apex `qual.stay.portugalodyssey.pt`, PWA at apex, `api.`/`auth.`/`traefik.` under it); GHCR + GitHub-hosted builds with VPS runner deploy-only at concurrency 1; hardening accepted (ufw + sshd password-auth off); island-chronicles GitLab = repo-side inaction.
>
> ### Key recon facts (full detail in plan §0)
>
> - VPS srv911943 = 77.37.86.126, root SSH key works. Ubuntu 24.04, Docker 28.3, **2 vCPU / 8 GB / no swap / 85 GB free**.
> - Stale project = **island-chronicles** under `/root/island-chronicles/` (1.6 GB incl. all bind-mounted data — tar = full backup). Its `traefik-shared` owns 80/443/8080. **No GitLab runner exists on the host.**
> - portugalodyssey.pt DNS = **Cloudflare**; PO's own infra on a different VPS (31.97.159.7). TLS plan: LE **HTTP-01 per-host**, Cloudflare records DNS-only.
> - Critical repo gap: **PWA is same-origin** (`/v1`, `/r`, chat WS, media imgs) → qual overlay must path-route those on the apex to the BFF with priority over the SPA router.
>
> ### First task next session
>
> **Execute Plan-007 Q.1** (VPS prep: backup → stop stale stack → swap → hardening → toolchain) then **Q.2** (repo plumbing PRs — can be parallelized with cs-agents; Q.2.0/Q.2.1/Q.2.3 are independent). Plan TODO has the checklist; README §1–§3 the acceptance criteria. Execution is well-specified mechanical work — suitable for an Opus (or Sonnet for Q.1/Q.3.1) session; Fable-tier not required.

> **UPDATE 2026-06-11 (crash-recovery session): computer crashed mid-close-out on 06-10 ~23:55. Nothing was lost.** Resume cold from this block.
>
> ### Crash forensics + recovery
>
> - The crashed session (2026-06-10 evening) had just pushed **PRs #201/#202/#203** (the backoffice QoL batch: cursor-pointer #155, locale switcher #156, places-list pagination+sort #154) with all CI green, and died **before close-out** — Riff tasks still `todo`, no UATs minted, handoff not updated.
> - **Recovered this session (with human merge ack):** merged **#201 → #202 → #203** (serialized — branch protection requires up-to-date branches, so each merge forces an update+CI cycle on the next). Riff #154/#155/#156 flipped to `in-progress` (merged, UAT pending). Forward-flow UATs minted: **DT-TESTS-25** (pagination+sort), **DT-TESTS-26** (locale switcher), **DT-TESTS-27** (cursor-pointer) — all three runnable in one sitting at `http://localhost:5173/admin`.
> - **Hygiene shipped (#204):** `services/chat-hub` was the only Python service missing a per-service `.gitignore` — 22 `.pyc` files had been silently committed since #86/#94 and kept polluting `git status`. Added the sibling-identical `.gitignore` + untracked the artifacts.
> - **CHANGELOG backfilled**: Plan-006 + post-arc section (#191–#204) — it had stopped at the Plans 001–005 arc.
> - **Handoff gap noted:** sessions 2026-06-05 → 06-10 (PRs #196–#200: 6.C.0 media foundation + avatar uploader, 6.C.1 hero uploader, 6.D pick-cap, #199 ordering fix, #200 shell-quote override) never updated this doc — that arc is reconstructed in the CHANGELOG entry, plan TODO was kept current.
> - **Not ours:** the 8 "finished" cs-agent worktrees visible in `cs-agent status` belong to **codecomedy-platform** — untouched.
> - **Dev-env break found+fixed:** `make up` failed — `otel/opentelemetry-collector-contrib:0.125.0` is **gone from Docker Hub** (OTel moved collector distribution to ghcr) and the local image had been pruned. Unblocked by pulling `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.125.0` + `docker tag`-ing it to the old name; proper compose fix in a separate **escalate** PR (infra). Cross-project note appended to `~/.claude/docs/cc-platform-feedback.md`.
>
> ### Where we are (Plan-006)
>
> - 6.A ✅ (browser-UAT'd) · 6.C.0/6.C.1 ✅ · 6.D ✅ (DT-TESTS-24) · QoL batch #154/#155/#156 ✅ merged (UAT pending: DT-TESTS-25/26/27)
> - **Remaining: 6.B** (place media pipeline — `place_media.attribution` schema 6.B.0 is an **escalate** migration, then landmark-manifest ingest 6.B.1, attribution render 6.B.2; manifest ready at `temp/place-photo-sourcing.md`) · **6.C.2** (per-place hero upload, needs 6.B.0) · **6.E** (reservations screen) · **6.F** (field gaps #150/#151).
> - **6.B SHIPPED this session (code-complete, in review):** PR stack **#207** (6.B.0 `attribution` migration, escalate) ← **#208** (6.B.2 credit-line render, catalog→bff→pwa) + **#209** (6.B.1 — all 14 landmark heroes resolved to real licence-verified Commons files: 10 PD + 4 attributed, zero Unsplash fallbacks; hotlinked 1280px thumbs, all verified 200). **Live dev DB already updated** — heroes render in the PWA now; credit line needs the stack merged + catalog/bff rebuild. Wave 5 in `006-owner-backoffice/EXECUTION.md` has the full detail (+ retro Wave 4 backfilling the 06-05→06-07 gap).
> - **Next after this session:** human reviews **#206** (otel→ghcr, infra) + **#207→#208/#209** (6.B stack; #208/#209 auto-retarget to main when #207 merges) → rebuild catalog-svc+bff → run UATs DT-TESTS-25/26/27 (QoL batch, env is UP and ready now) + the 6.B UAT (DT-TESTS-28). Then Plan-006 leftovers: **6.C.2** (per-place hero upload, unblocked once 6.B.0 merges) · **6.E** (reservations) · **6.F** (field gaps).

> **UPDATE 2026-06-04 (authentik session): Authentik brought up + owner-auth integration completed + Slice 6.A FULLY DONE (6.A.3 browser UAT passed).** Resume cold from this block.
>
> ### What happened
>
> - **Authentik is now UP and durable.** Booted the overlay (`authentik-postgres` + `-server` + `-worker`) and published the server on host **`:9000`** via an untracked override (`temp/authentik-ports.override.yml`) so the browser can reach OIDC discovery/auth directly (no Traefik/`/etc/hosts` needed).
> - **Found + fixed 4 latent owner-auth bugs** that had silently blocked _any_ owner login (committed straight to **main, `e84b091`**, `fix(bff,pwa,authentik): complete owner-app OIDC integration`):
>   1. **bff** `AUTHENTIK_JWKS_URL` default used the `dt_authentik_server` _container_ name — underscores are RFC-invalid in a Host header, so Authentik 404s and JWKS load fails silently. → hyphenated service alias `authentik-server` (`services/bff/src/config.ts` + `.env.example`).
>   2. **pwa** owner-oidc requested only `openid profile email` → Authentik never emitted the `groups` claim the BFF authorises staff by (would 403). → added `groups` scope (`apps/pwa/src/lib/auth/owner-oidc.ts`).
>   3. **env** `VITE_AUTHENTIK_URL` was `https`; Authentik dev serves http on :9000 → `.env.example` fixed to `http`.
>   4. **blueprint** `owner-app.yaml` defined a _confidential_ client, but the PWA is a public PKCE SPA (`owner-app-public`) and the BFF is JWKS-only — and on every worker restart the blueprint re-bound the app to the confidential provider, breaking login. → rewrote to a **public** client so the blueprint converges to the working config (now the durable source of truth; verified across a worker restart).
> - **Verified end-to-end twice** (headless `temp/authentik-e2e.py`: real PKCE login → staff token → `BFF /v1/admin/guesthouses` 200), then the **6.A.3 forward-flow UAT in a real headless Chromium** (`temp/uat-6a3.mjs`): owner login → `/admin/places` → click **Hide** on "Azores Sub-Dive" (`c0000001-…028`) → "Hidden" badge + catalog `hidden_place_ids` persisted → **Show** → reverted to `[]`. **Slice 6.A is now 4/4 DONE incl. the owner-UI path.**
>
> ### Dev-env state (for resume)
>
> - **Stack is UP**: 12 `dt_` app containers + **3 `dt_authentik_*`** healthy. BFF **rebuilt** with the JWKS fix. PWA **vite on :5173** (Node 22.22.3; `/tmp/dt-pwa.log`).
> - **Authentik reachable at `http://localhost:9000`**; admin/owner login `akadmin` / `$AUTHENTIK_BOOTSTRAP_PASSWORD` (akadmin is in the `staff` group). Browser owner login: open `http://localhost:5173/admin`.
> - **Gitignored dev-only files** (NOT committed, needed for the env to work): `apps/pwa/.env.local` (`VITE_AUTHENTIK_URL=http://localhost:9000/...`), `temp/authentik-ports.override.yml` (publishes :9000), `temp/authentik-setup.py` (idempotent realm setup — fallback if the blueprint ever fails to apply), `temp/authentik-e2e.py` + `temp/uat-6a3.mjs` (verification harnesses; the UAT pins chromium-1217 since the installed Playwright wants an un-cached headless-shell build).
> - **To bring Authentik up next time**: `docker compose --env-file .env -f infra/compose/docker-compose.base.yml -f infra/compose/docker-compose.authentik.yml -f temp/authentik-ports.override.yml up -d authentik-postgres authentik-server authentik-worker`. The blueprint auto-applies the realm (public client + staff group + groups mapping). If akadmin isn't in `staff` after a volume reset, run `AK_TOKEN=$(grep …BOOTSTRAP_TOKEN .env|cut -d= -f2-) python3 temp/authentik-setup.py` (adds akadmin→staff) — or just add via the admin UI.
>
> ### Known minor follow-ups (non-blocking)
>
> - The `groups` claim is duplicated in the token (`["authentik Admins","staff","authentik Admins","staff"]`) — benign Authentik claim-merge quirk; BFF dedups via membership check. Not worth chasing.
> - `AUTHENTIK_OWNER_APP_CLIENT_SECRET` is still a required compose env (`:?`) though the public blueprint no longer uses it — harmless; could be dropped from the authentik compose + `.env.example` in a later cleanup.
> - Local `git push` of `e84b091` was left for the human (orchestrator only commits/pushes on request).
>
> ### Next-session candidates (Plan-006, unchanged + now all browser-UAT-able)
>
> **6.C owner photo uploader** (most leveraged; unblocks #135 business heroes) · **6.B landmark photos** (manifest ready; 6.B.0 is an escalate migration) · **6.D hosts-pick cap** (quick FE-only). See `006-owner-backoffice/TODO.md`.

> **UPDATE 2026-06-04 (session close-out): Plan-006 (Owner Backoffice v2) created + Slice 6.A shipped & verified end-to-end. Plus: #149 UAT passed, #146 closed, the full #142/#135 product+photo workstream.** Resume cold from this block.
>
> ### Where we are
>
> - **Plan-006 — Owner Backoffice v2** is the active plan: `docs/implementation-plans/006-owner-backoffice/` (README + TODO + EXECUTION, 3 waves logged). Status **In Progress**. It consolidates the #142 backoffice decisions + #135 media + #150/#151 field gaps into 6 slices (6.A–6.F) and **supersedes Plan-004 Slice 4.B** (scoping model reconciled).
> - **Slice 6.A — per-guesthouse scoping — DONE (4/4 code) + functionally verified.** Merged: 6.A.0 schema `guesthouse.hidden_place_ids uuid[]` + 6.A.1 catalog hide/unhide (**#191**), 6.A.2 BFF discover filter (**#192**), 6.A.3 backoffice visibility toggle (**#193**). **API UAT passed live** (count 8→7→8: a hidden place vanishes from the guest's discover and returns on un-hide, via the real `gh` claim → `catalog.hidden_place_ids` → BFF discover filter). +5 unit tests across the slice.
>   - **Model:** opt-out overlay — `place.guesthouse_scope` stays for inclusion; `guesthouse.hidden_place_ids[]` is the per-gh hide list. The 28 global staples remain the cold-start baseline.
>   - **NOT done:** owner _clicking_ the toggle in `/admin` (6.A.3 UI→BFF proxy) — unit-tested but not browser-UAT'd because **Authentik isn't up** (owner login). Optional; the API loop proves the same effect. The "add own place" half of 6.A.3 was left light (folds into 6.C).
>   - **Deferred in 6.A.2:** the `+gh-scoped / − other-gh` _inclusion_ filter needs the catalog query to be scope-aware — no-op today (all 28 places `{all:true}`); matters once owners add own places (6.C).
>
> ### Remaining Plan-006 slices (next-session candidates, in plan TODO with owns/deps/acceptance)
>
> - **6.C — Owner photo uploader** (`#142c`) — **recommended next.** Avatar + guesthouse hero uploaders on the media-svc signed-URL flow; unblocks the **14 #135 business hero photos** (the only lawful source). Reuses the T-1.6.2 media pipeline.
> - **6.B — Place media pipeline** (`#135`) — add `place_media.attribution` column, then ingest the **landmark manifest** (`temp/place-photo-sourcing.md`: 5 verified Commons files, 4 public-domain) replacing the single placeholder Unsplash URL. Needs 6.C for business photos.
> - **6.D — Hosts-pick cap** (`#142b`) — soft ~6–8/gh warn; trivial after 6.A.
> - **6.E — Reservations screen** (`#142d`) — new `admin.reservations` route + BFF list/issue/revoke; on `auth_tokens.reservation`.
> - **6.F — Field-editing gaps** (`#150` season col, `#151` verify hours/contacts in admin.places form).
>
> ### Environment (stack is UP)
>
> - `make up` done this session; **12 dt\_ containers healthy**. **bff + catalog-svc REBUILT** with 6.A code. PWA **vite on :5173** (started manually with **Node 22.22.3** — `.nvmrc` pins it; **Node 25 in PATH breaks pnpm/vite**, always `source ~/.nvm/nvm.sh && nvm use 22.22.3`). Vite log: `/tmp/dt-pwa.log`.
> - **Authentik is NOT up** (separate overlay `docker-compose.authentik.yml`; needs server+worker boot + blueprint import + an owner staff user created — fiddly). Required only for the owner-side browser UAT.
> - **Seed gap fixed for UAT (now Riff #152):** `catalog.guesthouse` was empty; I inserted `bbb00001-0000-4000-b000-000000000001` ("Casa do Sol", owner `aaa00001-…`) to match the seeded reservation's `gh`. The row is in the **live dev DB** (`hidden_place_ids` reset to `{}`) but NOT in any seed — so it survives until `make down`/volume reset.
> - **Guest UAT entry:** reservation `ccc00001-…001` → mint via `docker exec dt_bff wget --post-data='{}' http://dt_token_svc:8088/v1/reservations/<res>/token`, exchange via host `curl localhost:28080/r/<token>` → JSON `.jwt` (gh=bbb00001-…). busybox `wget` has **no `--method`** (can't PUT/DELETE); set hidden state via psql for API UAT. bff internal `localhost:8080` resolves IPv6 → use host `:28080`.
>
> ### Riff state (daily-tour project)
>
> - **Done:** #147, #148, #144, #146, #149 (all this multi-day arc). #142a–d map to Plan-006 6.A–6.E.
> - **Open:** #142 (umbrella, decisions locked — comment links Plan-006), #135 (manifest ready), #150, #151 (6.F), **#152 (new — catalog.guesthouse seed gap)**.
> - dt-tests `review` queue empty at close-out. tasks-prod tunnel `:15432` has flaked repeatedly — `/mcp` reconnect when `*tasks-prod*` tools vanish.
>
> ### First task next session
>
> Promote/continue Plan-006: pick **6.C (uploader)** — most leveraged (unblocks #135 business photos + is the owner content path). Or 6.B landmark ingest (manifest ready, smaller). Read `006-owner-backoffice/TODO.md` for the task specs. Optional: bring up Authentik for the 6.A.3 browser UAT.

> **UPDATE 2026-06-02 (session close-out): five tasks landed — #147 slice-C fully shipped + consumed end-to-end, plus the telemetry-grant prevention work.** Everything below merged to `main`; the un-gated engineering backlog is now cleared. Remaining work is gated on the human (photography/product) or on dev-up (the stack is `make down` for another project).
>
> | Task         | What                                                             | PR   | Status                                                                      |
> | ------------ | ---------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
> | #147 slice-C | OSRM travel-time + IPMA weather wired into planner pipeline      | #184 | ✅ merged; #147 **done**                                                    |
> | #149         | PWA+BFF surface travel-time + weather-aware in the tour timeline | #186 | ✅ merged; task **in-progress** (UAT pending dev-up)                        |
> | #148         | planner → canonical `dt.events`/`tour.requested` bus             | #187 | ✅ merged; task **done**                                                    |
> | #144         | analytics GRANT INSERT (telemetry 500)                           | —    | ✅ **closed done** (already fixed in source `02-roles.sql` + live via #166) |
> | #146         | `dev-env-check.sh` asserts bff analytics grants (P4 prevention)  | #188 | ✅ merged; task **in-progress** (live-run pending dev-up)                   |
>
> **Key arc:** #184 wired the slice-C enrichment into planner, but on close-out I found it was **not user-visible** — the BFF `toStop()` dropped `travel_to_minutes`/`weather_aware` and the PWA had no UI. #186 closed that gap (BFF carries the field; PWA renders a `Car`-icon drive time per stop + a translated `CloudRain` weather banner; i18n en/pt-PT/es). #187 moved planner off its bespoke `planner` exchange onto the `tour.requested` queue that `definitions.json` already provisioned (+ a regression test that reads the real definitions.json so topology can't drift again). #146 adds a grant assertion to the env-check SMOKE section (mirrors the #177 schema-table check) so the bff→analytics USAGE drift that caused a UAT-G07 telemetry 500 fails loudly at env-check time instead.
>
> **Deferred to next `make up` (all documented in the respective PRs/tasks):**
>
> - **#149 forward-flow UAT** — the genuine browser verification of travel/weather rendering (carried by the task; mint a dt-tests UAT then).
> - **#148 one-time broker cleanup** — delete the now-dead `planner` exchange + `planner.tour-plan.requested` queue (cosmetic; nothing uses them). `rabbitmqadmin delete queue name=planner.tour-plan.requested` + `... exchange name=planner`.
> - **#146 live env-check run** — `bash scripts/dev/dev-env-check.sh` against the live DB (verifies the new grant assertion passes; `bash -n` already clean).
>
> **Still gated (need the human):** #135 (signed media URLs — real photography), #142 (backoffice cap rule / per-guesthouse scoping / reservations — product decisions).
>
> **dt-tests `review` queue empty** at close-out. tasks-prod MCP required a `/mcp` reconnect this session.

> **UPDATE 2026-06-01 (close-out): #184 MERGED (`1ab8310`), #147 slice-C CLOSED (done), two follow-ups spun out.** All four slice-C parts now on `main` (parts 1+2 #184, part 3 #181, part 4 #182). **Key finding on close-out:** the enrichment is **not actually user-visible** — planner produces `travel_to_minutes`/`weather_aware`, but the BFF `toStop()` (`services/bff/src/lib/tour-plan-view.ts` ≈L59-69) **drops both**, and the PWA `TimelineStop` has no travel/weather UI. So #147 closed as a **backend skip-case** (no rendered consumer change), and the genuine user-visible work + its forward-flow UAT moved to a new task:
>
> - **daily-tour #149** `[pwa+bff]` — surface travel-time + weather-aware in the tour timeline (BFF `toStop` mapping → PWA `TimelineStop` render). **Carries the deferred forward-flow UAT.** Start here if picking up user-facing planner work.
> - **daily-tour #148** `[planner-svc]` — reconcile planner's own `planner` exchange/queue onto canonical `dt.events` bus (the #182 carry-over; tech-debt).
> - dt-tests `review` queue was empty at close-out. tasks-prod MCP needed a `/mcp` reconnect this session.

> **UPDATE 2026-06-01 (later): #147 slice-C parts 2+3 SHIPPED — OSRM travel-time + IPMA weather wired (PR #184, merged).** This closes the OSRM/IPMA slice the prior entry scoped. `process_plan` is now wired into the consumer (`_process_plan` → `_enrich_plan` → annotate travel times → `process_plan`). Highlights:
>
> - **Gap the prior scope missed:** RAG candidates carry no coords, but `estimate_minutes` needs lat/lng. Resolved in-house by reading `catalog.place` (planner already has `GRANT SELECT ON catalog`) via a minimal read-only `PlaceRow` + `repository/places.get_place_coords` — **no second-service change**.
> - Added the **Redis client planner-svc lacked** (`cache.get_redis`, lazy singleton) + `REDIS_URL`/`OSRM_URL` compose env. **Weather degrades gracefully** — `process_plan` now catches `RedisError` around `get_forecast` (the prior code only caught IPMA HTTP failures, so a Redis outage would have dead-lettered plans).
> - `annotate_travel_times` recomputes inter-stop `travel_to_minutes` (first step left unset — placeholder guesthouse origin). Over-budget day → `TravelTimeError` → `mark_rejected("travel_time: …")`.
> - **Live-verified** (rebuilt planner-svc): POST → `ready`, per-step travel `None,3,4,14` (haversine — OSRM not deployed locally), IPMA forecast cached in Redis (5 days, ~30m TTL), `weather_aware:false` (today < 60% rain). ruff+mypy+pytest green (34 passed, 4 new).
> - **Remaining #147:** parts 2+3 done; **part 1 (#181) + part 4 (#182)** shipped earlier this session — so **all of slice-C is now landed pending #184 review.** Only the carry-over follow-up remains: planner's own `planner` exchange vs canonical `dt.events`/`tour.requested` (flagged in #182).
> - **OSRM overlay not brought up** (`overlay.osrm.yml`, optional) — haversine fallback verified instead.
> - ⚠️ **Riff/dt-tests MCP (`mcp__tasks-prod__*`) was NOT loaded this session** — polling ritual couldn't run; user must `/mcp` to reconnect. #147 progress not recorded in Riff yet.

> **UPDATE 2026-06-01 (#147 planner slice-C, 2/4 done + the other 2 fully scoped).** Marathon session also shipped the retro prevention work (P4 #177 env-check table asserts, P2 #178 journey smoke, **#180 Python services finally in CI** — ruff+mypy+pytest matrix; cleared the accumulated lint/type debt across all 4 py services) and a `make help` fix (#179). Then opened #147 slice-C:
>
> - **#181 (part 1 — real `reservation_id`)** — JWT `rid` → BFF → planner POST → `tour_plan.reservation_id` column → `plan_payload.reservation_id` (was the `plan_id` placeholder). Live-verified. ⚠️ schema migration 0002, **awaiting review/merge**.
> - **#182 (part 4 — DLQ)** — planner's queue now dead-letters poison-pills to the canonical **`dt.dlx`** (discovered planner was the _lone_ queue off the project's `dt.events`/`dt.dlx` convention; aligned it). Live-verified (nack → `dt.dlx.unrouted`). ⚠️ broker-topology (one-time queue-delete migration), **awaiting review/merge**.
>
> **Remaining #147 parts 2+3 (OSRM travel-time + IPMA weather) = ONE fresh slice — fully de-risked this session:**
>
> - The enrichment is **built + tested already** (`validators/travel_time.py`, `weather/swap.py`, `workers/plan_worker.py::process_plan`) but **`process_plan` is never wired into the pipeline** (`produce_plan` doesn't call it). That's the gap.
> - Both degrade gracefully: `estimate_minutes` is OSRM-first with **haversine fallback**; `get_forecast` (in `daily_tour_common.weather.ipma_client`) is a **read-through cache** (fetches the IPMA public API for Ponta Delgada `3490100`, no key; **returns `[]` on failure**). The slice-B-feared "IPMA cache-accounting gap" is NOT real.
> - **Work for the fresh slice:** (1) add a **redis client** to planner-svc — it has _none_ today (config `redis_url` + connection + compose `REDIS_URL`); `process_plan` needs `aioredis.Redis`. (2) recompute `travel_to_minutes` per step via `estimate_minutes` (OSRM/haversine) using candidate coords, replacing the LLM's guess. (3) call `process_plan(plan, candidates, redis)` after `produce_plan` in `mq._process_plan`. (4) behavior change: over-budget days now → `TravelTimeError` → `mark_rejected` (new failure surface). (5) optional: bring up `overlay.osrm.yml` (~15MB PBF + ~60s build) to verify the real OSRM path vs haversine. `planner.config.osrm_url` already defaults to `http://osrm-routed:5000`.
> - **Follow-up flagged (#182):** planner uses its own `planner` exchange + a queue absent from `infra/rabbitmq/definitions.json`, instead of the canonical `dt.events`/`tour.requested`. Worth reconciling.
> - **Riff tunnel `:15432` was DOWN** at session end (ECONNREFUSED) — couldn't update #147. Reconnect (L021) + record slice-C 2/4 progress + the parts-2/3 scope above as a #147 sub-task.

> **UPDATE 2026-05-31 (T-4.0.1 shipped): UAT-G08 PASSED.** PR #175 shipped chat-hub Postgres persistence + typed ack + `GET /v1/history`, a bff `GET /v1/chat/history` proxy, and pwa history re-hydration — closing the UAT-G08 "messages don't survive reload" gap. Browser-verified via **DT-TESTS-23 PASS** (send → reload → persists; send+ack frames). Latent fix bundled: blank `${VAR:-}` chat-hub credentials now coerce to `None` (was crashing startup via `aiogram.Bot("")` on first rebuild since the telegram mount). **T-4.0.1 is the 2nd of the four retro-flagged false-resolves genuinely shipped + browser-attested.** Reservation-scoped threads deferred to BFF `rid` forwarding (Riff #147). **Next leveraged lane: P4 — `dev-env-check.sh` table-existence assertions (would have caught the empty `chat.*`/`planner.tour_plan` schemas).**

> **UPDATE 2026-05-31 (post-#171): UAT-G07 PASSED.** After #172 (BFF `steps[]`→`stops[]` mapping) + #173 (Makefile compose lifecycle) landed, DT-TESTS-21 (UAT-G07 retry) was browser-verified PASS in a fresh incognito window: 4-step time-ordered timeline, real Azores places, `POST /v1/tour-plans`→201, telemetry→204, no console errors. daily-tour Riff **#143 closed (done)** — its slice-C enhancements (IPMA/OSRM/DLQ/real `reservation_id`) spun out to **Riff #147**. T-3.0.3 is now the first of the four retro-flagged false-resolves to be genuinely shipped _and_ browser-attested. **Next leveraged lane: T-4.0.1 retry (chat-hub persistence + `in_app` echo) → unblocks UAT-G08 full PASS.**

> **Multi-day arc, 11 PRs merged (#160–#170).** Closed out Plan-002 Slice 2.C to 5/6 (only T-2.C.1 chat WS eslint retry remains, gated on a concrete repro), surfaced + fixed four Plan-001 plan-accounting failures, shipped the planner worker end-to-end (UAT-G07 now returns a real LLM-generated plan), and patched the BFF chat WS framing bug that was blocking UAT-G08. **Next session resumes by re-running UAT-G07 to verify the planner pipeline lands a real plan in the browser.** ✅ done — see UPDATE above.

## TL;DR — resume next session

```bash
git checkout main && git fetch origin --prune && git reset --hard origin/main
source /home/jmeireles/.nvm/nvm.sh && nvm use 22.22.3       # Node 25 in PATH; .nvmrc pins 22.22.3
bash scripts/dev/dev-env-check.sh --markdown                # env gate — should be ✅ all checks
# Vite likely down (it dies SIGTERM across long gaps); restart:
pnpm --filter @daily-tour/pwa dev                            # → http://localhost:5173
# tasks-prod MCP: if `mcp__tasks-prod__*` not visible, user runs /mcp.
# If SSH tunnel to VPS Postgres on :15432 is down (ECONNREFUSED), user must reconnect (see L021).
```

**Then, in priority order:**

1. **Re-run dt-tests UAT-G07** — the planner worker now ships real LLM plans (PR #167+#168). UAT was BLOCKED at end of last UAT session; should now PASS-or-PASS-with-issues. Re-fingerprint task body + fresh token first; the existing token from the last G07 attempt is invalid (used by the test).
2. **Pick next lane** from the "Still outstanding" list below.

## What landed this arc (chronological)

### 2026-05-28 — Plan-002 Slice 2.C kick-off

| #    | Title                                                                       | What                                                                                                                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #160 | docs(handoff,plan-002): session closeout 2026-05-29 + close T-2.C.2/T-2.C.3 | repo squash-merge setting fix (`squash_merge_commit_title=PR_TITLE`) — eliminates the per-PR `--subject` workaround that bit #151/#159. Also marked T-2.C.3 done (was already shipped in `eslint.base.js`).                                                                    |
| #161 | docs(lessons): close T-2.C.5 — L019-L021 project-local + L017-L018 playbook | Lessons codified from the operational pain points (layout-wrapper cross-route audit, Node nvm drift, tasks-prod tunnel diagnosis, squash-merge title setting, cs-agent push PR title gap).                                                                                     |
| #162 | docs(plan-001,plan-002): close T-2.C.0 — retroactive Wave 29-bulk catch-up  | EXECUTION.md gap closed with a retroactive Wave 29-bulk entry mapping the 45 Phase 2-5 tasks to PRs #61-#94.                                                                                                                                                                   |
| #163 | docs(plan-001): close T-2.C.4 — estimate recalibration from Plan-001 data   | `calibration.md` — 28-wave wall-clock analysis. Headline: late-Plan-001 ratio is **0.20× of predictions with a 10-min floor**. New heuristic: `realistic_actual = max(10 min, 0.20 × first_instinct)` for steady-state familiar work; reverts to 0.5-1.0× for novel territory. |

### 2026-05-29 — PWA gap + chat WS fix

| #    | Title                                                        | What                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #164 | feat(pwa): enable 'Plan my day' CTA linking to /tour/new     | `premium-stubs.tsx` was still a disabled "Coming soon" stub even though T-3.1.0 had shipped the intake form at `/tour/new`. Converted to an enabled `<Link>`. Dropped the redundant "Message João" stub (chat tile in ActionGrid covers it). Unblocked UAT-G07 entry path.                                                                                                                  |
| #165 | fix(bff): forward chat WS frames preserving text/binary type | BFF chat-ws bridge was calling `upstream.send(data)` on a `Buffer` without `{ binary: isBinary }` → `ws` defaulted to **binary** frames → chat-hub's `receive_text()` crashed with `KeyError('text')`. Fix threads `isBinary` through both relay directions. Regression test asserts text frames stay text end-to-end via a fake upstream WS server. Unblocked the UAT-G08 transport layer. |

### 2026-05-30 — UAT-G07/G08 cycle + Plan-001 accounting fixes

**UAT-G07** (BLOCKED): the planner-svc crashed on `POST /v1/tour-plans` with `relation "planner.tour_plan" does not exist` (Python migrations never applied), then once that was patched the row sat at `queued` forever (the planner async consumer was never wired — T-3.0.3 plan-accounting failure). Telemetry `POST /v1/telemetry/tour` separately returned 500 with `permission denied for schema analytics` (the BFF GRANT was an `ALTER DEFAULT PRIVILEGES` clause that only covered future tables, not the pre-existing `analytics.tour_event`). Three filed retries + the dev-env migration gap → four PRs this day:

| #    | Title                                                                   | What                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #166 | fix(infra): grant BFF INSERT on existing analytics tables (#144)        | Explicit `GRANT INSERT ON ALL TABLES IN SCHEMA analytics TO bff` covering existing tables; the DEFAULT PRIVILEGES clause still handles future tables. Applied locally via manual one-liner; the SQL is in `02-roles.sql` for fresh DBs.                                                                                                                                                                                        |
| #167 | feat(planner-svc): wire aio-pika publisher + consumer (T-3.0.3 slice A) | Restored the transport layer: publisher on POST flow, consumer in `__main__.py` via `asyncio.wait FIRST_COMPLETED` (mirrors search-svc), stub handler marks plan ready with placeholder payload. UAT-G07 stops polling at `queued` forever.                                                                                                                                                                                    |
| #168 | feat(planner-svc): real LLM + RAG pipeline (T-3.0.3 slice B)            | Replaced stub with the full pipeline: translate request_payload → RAG fanout → Anthropic Messages → JSON parse → provenance check. Live-verified: POST → `ready` with 4-step plan, real place_ids, timezone-aware datetimes, contextual rationales. Failure modes (invalid_request / rag_unavailable / rag_empty / llm_unavailable / llm_error / llm_unparseable / provenance) all land in `mark_rejected` with reason+detail. |
| #169 | chore(dev-env): auto-migrate Python services in dev-up.sh (#145)        | `dev-up.sh` Stage 4 now applies `services/<svc>/migrations/*.sql` for `search-svc` and `planner-svc` as the schema-owning role. Idempotent. Verified by dropping `planner.tour_plan` + re-running the stage.                                                                                                                                                                                                                   |

**UAT-G08** (PASS-with-issues): transport works after #165, but chat-hub has zero Postgres code so messages don't persist and there's no echo. Closed as `pass-with-issues` referencing the still-open T-4.0.1 retry.

### 2026-05-30 (later) — Plan-001 accounting retrospective

| #    | Title                                                                        | What                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #170 | docs(plan-001): accounting retrospective + L022 (Plan-002 T-2.C.5 close-out) | `docs/implementation-plans/001-roadmap/retrospective.md` captures the **4 confirmed instances** of Plan-001 tasks marked done in TODO.md without shipping the working behavior (T-3.0.3, T-4.0.1, analytics GRANT, Python migrations), **4 root causes** (PR bundling, CI testing gaps, TODO ticks ≠ feature works, dev-env drift), and **5 prevention proposals (P1-P5)** for Plan-002+. L022 distils into the lessons catalog. |

## Plan-002 Slice 2.C status — 5/6 done

- ✅ T-2.C.0 — TODO.md/EXECUTION.md doc sync (#162)
- ⬜ T-2.C.1 — chat WS eslint retry (open; gated on a concrete repro that hasn't surfaced)
- ✅ T-2.C.2 — cs-agent closer-fallback fix (repo setting via #160)
- ✅ T-2.C.3 — ESLint test override (was already shipped in `eslint.base.js`; verified via #161)
- ✅ T-2.C.4 — estimate recalibration (#163)
- ✅ T-2.C.5 — lessons L017-L022 + Plan-001 accounting retro (#161 + #170)

## Still outstanding (next-session candidates)

### A. Direct continuation of today's work

1. **Re-run UAT-G07** — verify the planner pipeline lands a real plan in the browser. Re-fingerprint dt-tests #8 (DT-TESTS-8 is currently `done + failed + blocked` per fail-trail protocol; mint a fresh token, post a re-fingerprint comment, file a `retry-1` task if structure follows the G05/G08 pattern). On PASS: flip daily-tour Riff #143 to done.
2. **T-4.0.1 retry** — chat-hub schemas + persistence + in_app echo. Unblocks UAT-G08 full PASS. Substantial novel territory (need to design the persistence model + driver logic). Per calibration, plan for 60-90 min real wall-clock.

### B. Open Riff items

- **daily-tour #143.C** — IPMA weather + OSRM travel-time integration in `planner-svc`; real `reservation_id` propagation (currently using `plan_id` as a placeholder); dead-letter queue for poison-pill nacks. Multi-layer novel territory, expect 90-180 min.
- **daily-tour #135** — Signed media-svc URLs for place hero images. Still gated on real photography (product decision).
- **daily-tour #142** — host's-pick cap rule, single-vs-multi guesthouse scoping, reservations admin screen. Three product decisions — needs YOUR call before any of them is buildable.

### C. Prevention work from the Plan-001 retro

- **P4** (concrete, ~30 min) — `scripts/dev/dev-env-check.sh` should assert expected tables exist per schema. Loud failure on `planner.tour_plan` missing (rather than discovering it during a UAT).
- **P2** (~half-day) — end-to-end smoke tests for the three known journey gaps: `/v1/tour-plans` → `ready`, WS → reload → persist, `/v1/telemetry/tour` → 204. Either added to `dev-smoke.sh` or as a new CI job.
- **P1, P3, P5** — process changes that need orchestrator + human alignment before codifying in CLAUDE.md / agent playbook.

### D. Plan-002 Thrust A + B (next major phases)

- **Thrust A — Deploy to QA VPS** — long pole is VPS acquisition (Ubuntu 24, 4-8 vCPU, 16-32 GB RAM). Can stage configs (Traefik+ACME, Authentik realm import, smoke-test playbook) ahead of the box.
- **Thrust B — Real design pass** — Stitch mockups for Home/Detail/Discover/Tour/Chat, real brand mark, translation review, real photography for 28 places. Needs design/product decisions.

## Operational notes (carry-forward)

- **PR titles now land verbatim as squash commit subjects** (repo setting via #160). No more `--subject` workaround on `gh pr merge`. Test ran 4× consecutive (#161-#163, #166-#170 batch) — works.
- **planner-svc** is now a real worker. POST `/v1/tour-plans` triggers the full pipeline (~5-10s end-to-end with real Anthropic key). Failure modes are visible — check the row's `plan_payload.error` field if the status is `rejected`.
- **BFF rebuilt in this session** (twice — once for #165 chat-ws fix, once for #166 GRANT didn't actually need a rebuild). Currently running the latest fix. Restart with:
  ```bash
  set -a; . ./.env; set +a
  docker compose -f infra/compose/docker-compose.base.yml -f infra/compose/docker-compose.app.yml up -d --build --no-deps bff planner-svc
  ```
- **Lefthook can reject commits** if the subject line is too long or doesn't match conventional commits even when valid. Today's #170 first attempt failed with `docs(retro): ...` (passing CC syntax) but worked with `docs(plan-001): ...`. Worth investigating the regex on a calmer day.
- **The `mcp__tasks-prod__*` MCP** can show schemas while the SSH tunnel is down (see L021). When in doubt: `ss -tlnp \| grep 15432`.

## Riff state (daily-tour project `e98dfe58-…d3df`)

- **#143** in-progress at "B done" — slice C pending. Comment thread documents A → B → C breakdown.
- **#144** done via #166.
- **#145** done via #169.
- **#142** todo — waiting for product decisions (cap rule, scoping, reservations).
- **#135** todo — waiting for real photography.
- Phase 0 / Phase 1 / Slice 0.4 epics still showing in-progress in Riff but are effectively done per TODO.md — minor Riff housekeeping for next session.

## dt-tests state

- DT-TESTS-8 (UAT-G07) — `done + failed + blocked + blocked?` labels. Full diagnosis comment posted. Now unblocked by #167+#168. **Next session should re-fingerprint and re-run.**
- DT-TESTS-9 (UAT-G08) — `done + pass-with-issues + transport-only`. Transport works; persistence + echo gap remains (T-4.0.1).
- DT-TESTS-19 — `done + failed` (Wave-2 G05/etc UAT, separate flow).
- DT-TESTS-20 — `done + PASS` (G05 retry, separate flow).
- Review queue empty as of session end.

## Bus number

1 (you). State on origin + this doc + Riff (`daily-tour` + `dt-tests` projects) + `~/.claude/docs/agent-playbook.md` (lessons L017+L018) + `docs/ai/lessons/L019-L022` (project-local lessons).

---

**Session arc**: started 2026-05-28 morning on Plan-002 Slice 2.C close-out (squash-merge setting + lessons + doc sync + calibration), pivoted into the PWA "Plan my day" CTA on 05-29, followed by the chat-WS framing fix, then ran the UAT-G07/G08 cycle on 05-30 which surfaced four Plan-001 plan-accounting failures — all four fixed in the same session (analytics GRANT, planner consumer slice A, planner LLM pipeline slice B, dev-up migration loop) plus a retro doc + L022 capturing the pattern.

Next session: re-run UAT-G07 first to verify the planner pipeline lands a real plan in the PWA. Then pick from the outstanding list (T-4.0.1 retry is the most leveraged, P4 env-check assertion is the cheapest).
