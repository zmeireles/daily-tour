# Session Handoff — 2026-05-28 → … → 06-13(plan-007 guest-journey FIXED + re-UAT'd) → next session

> **UPDATE 2026-06-13 (LATEST): Plan-007 close-out UAT found a release-blocking guest-entry bug + an owner-provisioning gap; BOTH fixed, MERGED (#234, #235), REDEPLOYED to live qual, and the guest leg RE-UAT'd PASS end-to-end in a real browser — the qual guest journey now works via the host's shared link. Only owner-_edit_ verification remains (blocked on #152). Resume cold from this block.**
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
> ### First task next session — close Plan-007's last thread
>
> 1. **Owner-_edit_ re-UAT** — blocked by **#152** (empty `catalog.guesthouse` on qual → backoffice Hide/Show toggle never renders). Seed a guesthouse for the qual reservation's `gh` (bbb00001-…), then verify a reversible Hide→Show. Owner _login_ already PASSes.
> 2. Then flip the **Plan-007 epic (#157)** to done. **Plan-002 Slice 2.A guest-journey exit criterion is now MET** (guest link → app → discover, verified live). T-0.4.4 + the 2.A task rows already done.
> 3. **Optional / non-blocking:** **#158** registerSW.js 404/MIME (PWA SW auto-registration broken on qual) · re-enable **osrm** once a lightweight Azores PBF source is sorted (deferred → haversine).
>
> **State:** `main` synced; both fix branches merged + local copies deleted; no open PRs. dt-tests `review` queue empty. The live qual env runs committed config (the akadmin→staff hand-add is now reproduced by #235's deploy step). 18 containers healthy.

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
