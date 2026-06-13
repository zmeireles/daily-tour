# Plan 007 — TODO

Status: **LIVE** — Q.1+Q.2+Q.3 done 2026-06-12/13; **`https://qual.stay.portugalodyssey.pt` is up with full guest-journey smoke green.** Remaining: **Q.3.4 close-out = the 8-item repo punch-list** (so the automated `deploy-qa.yml` reproduces the hand-patched first deploy) + the `ANTHROPIC`/`EMBEDDING` keys (human, on the VPS). Wave log in [EXECUTION.md](./EXECUTION.md).

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
- [x] Q.3.3 verification — `dev-smoke.sh` **8/8 green**; trusted TLS on apex/api./auth. ⏳ owner-login UAT + hero/credit over TLS pending the `ANTHROPIC`/`EMBEDDING` keys (human to fill on the VPS).
- [ ] Q.3.4 close-out — **repo punch-list PRs** (make `deploy-qa.yml` reproducible) + DEPLOYS.md + CHANGELOG + dt-tests UAT batch. **IN PROGRESS.**

## ⚠ Repo punch-list (from the Q.3 first deploy — automated deploy won't reproduce until these land)

1. `deploy-qa.yml`: add `docker network create dt_internal` + `pnpm install` before migrate.
2. `overlay.qual.yml`: mount `infra/postgres/init-qual/` as the postgres initdb dir.
3. `infra/postgres/init/02-roles.sql`: reorder — create ALL roles before the `ALTER DEFAULT PRIVILEGES FOR ROLE …` grants.
4. `infra/rabbitmq/definitions.json`: stop hardcoding the `dailytour` password hash (breaks rotated envs).
5. `docker-compose.app.yml` chat-hub: add `DATABASE_URL` (from `SERVICE_DB_PASSWORD_CHAT`).
6. `docker-compose.app.yml` bff: add `ANALYTICS_DATABASE_URL` (from `SERVICE_DB_PASSWORD_BFF`).
7. token-svc seed: relative/future reservation dates (past dates → 410).
8. overlay redirect rework (http→https 404) + osrm PBF-download fix.
