# Plan 007 — TODO

Status: **✅ DONE — qual env live + reproducible + fully UAT'd (2026-06-13).** `https://qual.stay.portugalodyssey.pt` (trusted TLS, http→https redirect, real LLM tour plans). Every criterion verified live in a real browser: deploy reproducible · guest journey (cold link → app) · owner login · owner edit (Hide/Show) · hero/attribution over TLS. Close-out UAT surfaced + fixed 3 issues — guest-entry routing (**#234**), owner-staff provisioning (**#235**), missing guesthouse seed (**#238**/#152) — all merged, redeployed, re-UAT'd PASS. Riff #157 + #152 closed. Non-blocking follow-ups: **#158** (registerSW.js), osrm deferred. Wave log in [EXECUTION.md](./EXECUTION.md).

## Phase Q.1 — VPS preparation (srv911943 / 77.37.86.126) — ✅ DONE 2026-06-12

- [x] Q.1.0 backup island-chronicles → `/root/backups/island-chronicles-2026-06-12.tgz` (216M) + off-box `/media/jmeireles/ssd3/vps-backups/` — sha256 identical, 5325 `volumes/` entries
- [x] Q.1.1 stop stale stack (`compose stop` prod+traefik) — 7 containers exited, **80/443/8080 freed**, zero config-file changes (only clean-shutdown data-volume flushes)
- [x] Q.1.2 4 GB swapfile + `vm.swappiness=10` — persisted (fstab + `sysctl.d/99-swappiness.conf`)
- [x] Q.1.3 GitLab UI-side — no-op (decided: repo-side inaction)
- [x] Q.1.4 ufw active (deny-in, allow 22/80/443) + sshd `PasswordAuthentication no` (`00-disable-password-auth.conf`, sorts before `50-cloud-init`). Deadman-protected; fresh key session verified — root + `ubuntu` keys intact
- [x] Q.1.5 prune cron → dangling-only (`docker image prune -f`) — protects tagged daily-tour images incl. rollback `:sha`
- [x] Q.1.6 host toolchain: `node v22.22.3` + `pnpm 9.14.2` + `git` system-wide (`/usr/local/bin`)

## Phase Q.2 — Repo deploy plumbing (PRs) — ✅ DONE (8/8, merged 2026-06-12)

- [x] Q.2.0 GHCR publish workflow (8 services + postgres + osrm + **pwa** → ghcr.io, tags `{sha,qual}`) — **#214**
- [x] Q.2.1 `infra/compose/overlay.qual.yml` (0.0.0.0:80/443, websecure+resolver+redirect, apex PWA router, `/v1`+`/r` path-routers → bff, NODE_ENV=production, OSRM_URL, mem limits, ghcr image overrides) — **#216**
- [x] Q.2.2 Traefik prod ACME resolver + email-via-command-flag fix (folded into #216) — **#216**. Dashboard htpasswd deferred to the Q.3.2 runbook (per-deploy secret).
- [x] Q.2.3 `.env.qual` generator (`scripts/qual/gen-env-qual.sh`) + `.env.qual.example` + rotated `02-roles.sql` flow — **#215**
- [x] Q.2.4 PWA qual build → GHCR nginx image (`apps/pwa/Dockerfile`; VITE\_\* baked) — **#220**
- [x] Q.2.5 Authentik qual redirect URI + `overlay.qual-authentik.yml` (auth. router websecure TLS, the 404 fix) — **#218**
- [x] Q.2.6 `.github/workflows/deploy-qa.yml` (runs-on `[self-hosted, qual-vps]`; pull→up→migrate→seed→smoke→check→rollback) + parameterised `dev-up.sh`/`dev-smoke.sh` (ENV_FILE/PROJECT/--to) — **#219**
- [x] Q.2.7 `dev-env-check.sh --qual` mode — **#217**

**Post-merge:** the maiden `publish-images` run exposed a latent osrm bug — `osrm-backend:v5.28.0` 404 (#221 → v5.25.0), then stretch-EOL apt 404 (#222 → archive.debian.org). **Pipeline now 11/11 green; all GHCR images published with `:qual` + `:sha`.** EXECUTION.md has the wave detail.

## Phase Q.3 — Runner + DNS + first deploy — ✅ LIVE 2026-06-12/13 (full smoke green; see EXECUTION Wave 3)

- [x] Q.3.0 Cloudflare DNS (human) — `qual.stay` + `*.qual.stay` → 77.37.86.126, DNS-only. Resolving.
- [x] Q.3.1 GitHub Actions runner — `ghrunner` + runner v2.335.1 `[self-hosted, qual-vps]`, **hand-written systemd unit `actions-runner-qual`** (no `svc.sh` in the package). Online.
- [x] Q.3.2 first deploy — `/opt/daily-tour` clone, gen-env (ACME zmeireles@gmail.com), ACME staging→prod, all containers healthy. **Required hand-patching — see the Wave-3 punch-list (8 repo fixes).**
- [x] Q.3.3 verification — `dev-smoke.sh` **8/8 green**; trusted TLS on apex/api./auth.; **`ANTHROPIC`/`EMBEDDING` keys in `.env.qual` → planner produces real LLM plans** (smoke: "plan ready, full LLM+RAG"). ⏳ owner-login UAT + hero/credit over TLS still to verify.
- [x] Q.3.4 close-out — repo punch-list ✅ 8/8 (#226 + #228) **+ clean re-deploy ✅** (`deploy-qa.yml` run from wiped postgres/rabbitmq volumes → pull→up→reconcile→migrate→seed→smoke→`--qual` gate all green; workarounds dropped). Re-deploy surfaced 4 deploy-only bugs, all fixed: traefik `dynamic` dir `:ro` blocked the redirect nest-mount (#230); gen-env `init-qual` perms unreadable by postgres uid 999 (#231); osrm Geofabrik PBF path 404s → **osrm deferred** (#231); `dev-env-check --qual` still expected `dt_osrm` (#232). DEPLOYS.md first entry added. ⏳ remaining: owner-login UAT + hero/credit-over-TLS UAT (dt-tests batch); close T-0.4.4 + Plan-002 2.A.

## Repo punch-list — ✅ 8/8 DONE (#226: 1/2/3/5/6 · #228: 4/7/8). Automated `deploy-qa.yml` now reproduces the hand-patched first deploy.

1. ✅ `deploy-qa.yml`: `docker network create dt_internal` + `pnpm install` before migrate (#226).
2. ✅ `overlay.qual.yml`: mount `infra/postgres/init-qual/` as the postgres initdb dir (#226).
3. ✅ `02-roles.sql`: reorder — all roles created before `ALTER DEFAULT PRIVILEGES FOR ROLE …` (#226; verified 0 errors / 10 roles).
4. ✅ rabbitmq: `deploy-qa.yml` reconciles the broker password post-`up` (RabbitMQ skips `RABBITMQ_DEFAULT_USER` with `load_definitions`, so `definitions.json` can't be env-driven; left unchanged for dev) (#228).
5. ✅ chat-hub `DATABASE_URL` from `SERVICE_DB_PASSWORD_CHAT` (#226).
6. ✅ bff `ANALYTICS_DATABASE_URL` from `SERVICE_DB_PASSWORD_BFF` (#226).
7. ✅ token-svc seed: reservation dates relative to seed time (#228).
8. ✅ redirect: qual-only `infra/traefik/redirect-qual.yml` (catch-all + redirectScheme), overlay-mounted — verified live 301→https; osrm: `ca-certificates` for the https PBF download (#228).

**Live-env note:** the running VPS stack still uses the hand-applied workarounds (untracked `overlay.qual-local.yml`, ALTER'd roles, `change_password`, `redirect-test.yml`, refreshed fixture dates). The merged fixes apply to the **next clean deploy** — a fresh re-deploy (postgres volume reset so `init-qual` re-inits) would validate `deploy-qa.yml` end-to-end and drop all workarounds.

## Close-out UAT (2026-06-13) — headless real-browser, live TLS

Run against `https://qual.stay.portugalodyssey.pt` (evidence: `temp/uat-plan007/`). **3/3 core scenarios PASS**, 2 blocking-class findings now in fix PRs:

| Scenario                           | Verdict  | Notes                                                                                                                                                                                                                                 |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner login + backoffice           | ✅ PASS  | akadmin → Authentik → `/admin` (no 403); 28 places render → staff claim authorises BFF. Precondition: akadmin added to `staff` by hand (→ #235 makes it reproducible).                                                                |
| Hero photos + attribution over TLS | ✅ PASS  | Lagoa do Fogo "© Samuel Fonseca 85 · CC BY-SA 3.0"; Praia de Santa Bárbara "© JCNazza · CC BY 3.0" — heroes 200, chips correct.                                                                                                       |
| Guest-entry `/r/<token>` cold nav  | ✅ FIXED | Was: 200'd as raw JSON, SPA never booted (apex `/r/*` → BFF above the SPA). **Fixed (#234) + re-UAT'd PASS**: cold nav → `200 text/html`, SPA boots, XHR `/v1/r/` `200 {jwt}`, lands authed home, `/v1/discover` 200 under guest JWT. |
| Owner _edit_ (Hide/Show toggle)    | ✅ FIXED | Was blocked by empty `catalog.guesthouse` (#152). **Fixed (#238 seeds "Casa do Sol") + re-UAT'd PASS**: toggle renders on every row; Hide → PUT 200 (`hidden_place_ids {…021}`), Show → DELETE 200 (`{}`). Owner can edit a place.    |

**Fixes (merged + redeployed 2026-06-13):**

- **#234** `fix(bff,pwa,infra)` — BFF redeem → `/v1/r/:token`; SPA keeps `/r/:token`; drop apex `/r` router. **Merged + deployed; guest cold-entry re-UAT'd PASS → Plan-002 2.A guest-journey exit criterion MET.**
- **#235** `fix(infra/deploy)` — idempotent `deploy-qa.yml` step adds akadmin → staff (reproducible owner login). Merged + the deploy step ran clean.

**Other findings:** **#158** registerSW.js 404/MIME (PWA SW auto-registration broken on qual; non-blocking) · **#152** empty `catalog.guesthouse` now on the owner-edit critical path.

**Plan-007 CLOSED 2026-06-13.** All criteria verified live (deploy reproducibility · guest journey · owner login · owner edit · hero/credit). #234/#235/#238 merged + redeployed + re-UAT'd PASS; Riff #157 + #152 done. Non-blocking follow-ups tracked separately: #158 (registerSW.js), osrm re-enable (deferred → haversine), and a deeper owner create+photo+publish qual UAT (Plan-006).
