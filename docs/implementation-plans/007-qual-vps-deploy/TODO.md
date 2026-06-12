# Plan 007 — TODO

Status: **READY** (accepted 2026-06-12). Task detail + acceptance live in [README.md](./README.md) §1–§3; this file tracks state only. Update on every wave; log waves in EXECUTION.md (create on first wave).

## Phase Q.1 — VPS preparation (srv911943 / 77.37.86.126)

- [ ] Q.1.0 backup island-chronicles (tar on box + off-box copy, verify listing)
- [ ] Q.1.1 stop stale stack (`compose stop`, NOT down; verify 80/443 freed, zero file changes)
- [ ] Q.1.2 4 GB swapfile + swappiness 10
- [ ] Q.1.3 GitLab UI-side — DECIDED: repo-side inaction, nothing to do
- [ ] Q.1.4 ufw 22/80/443 + sshd password-auth off (`ubuntu` key user is the fallback)
- [ ] Q.1.5 scope nightly `docker image prune` cron away from daily-tour images
- [ ] Q.1.6 host toolchain: Node 22.22.3 + pnpm 9.14.2 + git

## Phase Q.2 — Repo deploy plumbing (PRs)

- [ ] Q.2.0 GHCR publish workflow (8 services + postgres + osrm → ghcr.io, tags `{sha,qual}`)
- [ ] Q.2.1 `infra/compose/overlay.qual.yml` (0.0.0.0:80/443, websecure+resolver+redirect, apex PWA router, `/v1`+`/r` path-routers → bff, NODE_ENV=production, OSRM_URL, mem limits, ghcr image overrides)
- [ ] Q.2.2 Traefik prod ACME resolver + fix email env-interpolation + qual dashboard htpasswd
- [ ] Q.2.3 `.env.qual` generator (`scripts/qual/gen-env-qual.sh`) + `.env.qual.example` + rotated `02-roles.sql` flow
- [ ] Q.2.4 PWA qual build (`VITE_AUTHENTIK_URL=https://auth.qual.stay.portugalodyssey.pt/...`; dist COPY'd into nginx image)
- [ ] Q.2.5 Authentik qual blueprint override (redirect URI `https://qual.stay.portugalodyssey.pt/admin/callback`)
- [ ] Q.2.6 `.github/workflows/deploy-qa.yml` (runs-on `[self-hosted, qual-vps]`; pull→up→migrate→seed→smoke→DEPLOYS.md; rollback to previous `:sha`)
- [ ] Q.2.7 `dev-env-check.sh --qual` mode

## Phase Q.3 — Runner + DNS + first deploy

- [ ] Q.3.0 Cloudflare DNS (DNS-only): A `qual.stay` + `*.qual.stay` → 77.37.86.126
- [ ] Q.3.1 GitHub Actions runner (`ghrunner` user, labels `[self-hosted, qual-vps]`, concurrency 1, systemd)
- [ ] Q.3.2 first deploy runbook (clone `/opt/daily-tour`, gen-env, ACME staging→prod, Authentik bootstrap + staff)
- [ ] Q.3.3 verification gate (dev-smoke + dev-env-check --qual + owner login + hero/credit over TLS)
- [ ] Q.3.4 close-out (T-0.4.4 + Plan-002 2.A rows, DEPLOYS.md, handoff, CHANGELOG, dt-tests UAT batch)
