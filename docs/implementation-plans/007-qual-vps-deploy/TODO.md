# Plan 007 — TODO

Status: **EXECUTING** — Phase Q.2 (repo plumbing) ✅ DONE 2026-06-12; **Q.1 (VPS prep) + Q.3 (runner/DNS/deploy) remain**, both gated on the human's go for live-VPS work. Task detail + acceptance live in [README.md](./README.md) §1–§3; this file tracks state only. Wave log in [EXECUTION.md](./EXECUTION.md).

## Phase Q.1 — VPS preparation (srv911943 / 77.37.86.126)

- [ ] Q.1.0 backup island-chronicles (tar on box + off-box copy, verify listing)
- [ ] Q.1.1 stop stale stack (`compose stop`, NOT down; verify 80/443 freed, zero file changes)
- [ ] Q.1.2 4 GB swapfile + swappiness 10
- [ ] Q.1.3 GitLab UI-side — DECIDED: repo-side inaction, nothing to do
- [ ] Q.1.4 ufw 22/80/443 + sshd password-auth off (`ubuntu` key user is the fallback)
- [ ] Q.1.5 scope nightly `docker image prune` cron away from daily-tour images
- [ ] Q.1.6 host toolchain: Node 22.22.3 + pnpm 9.14.2 + git

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

## Phase Q.3 — Runner + DNS + first deploy

- [ ] Q.3.0 Cloudflare DNS (DNS-only): A `qual.stay` + `*.qual.stay` → 77.37.86.126
- [ ] Q.3.1 GitHub Actions runner (`ghrunner` user, labels `[self-hosted, qual-vps]`, concurrency 1, systemd)
- [ ] Q.3.2 first deploy runbook (clone `/opt/daily-tour`, gen-env, ACME staging→prod, Authentik bootstrap + staff)
- [ ] Q.3.3 verification gate (dev-smoke + dev-env-check --qual + owner login + hero/credit over TLS)
- [ ] Q.3.4 close-out (T-0.4.4 + Plan-002 2.A rows, DEPLOYS.md, handoff, CHANGELOG, dt-tests UAT batch)
