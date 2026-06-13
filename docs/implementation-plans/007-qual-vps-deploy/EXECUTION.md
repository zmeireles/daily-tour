# Plan 007 — Execution log

Wave-by-wave record of Plan-007 (qual VPS deploy). Newest wave first.

## Wave 3 — Phase Q.3 runner + DNS + first deploy (2026-06-12/13) — ✅ LIVE (full smoke green)

**`https://qual.stay.portugalodyssey.pt` is live** with a trusted Let's Encrypt prod cert; the full 8-step guest-journey smoke passes end-to-end. Q.3.0–Q.3.3 done.

- **Q.3.0 DNS** (human) — Cloudflare A `qual.stay` + `*.qual.stay` → 77.37.86.126, DNS-only. Verified resolving.
- **Q.3.1 runner** — `ghrunner` user (docker group) + GitHub Actions runner v2.335.1 registered `[self-hosted, qual-vps]`; **systemd unit `actions-runner-qual` written by hand** (the package shipped no `svc.sh`). Online, listening for jobs. Reg token via scp'd file (chown ghrunner — root-600 had blocked it), shredded after.
- **Q.3.2 first deploy** (manual runbook) — clone `/opt/daily-tour` (ghrunner), `gen-env-qual.sh --acme-email zmeireles@gmail.com`, ACME **staging→prod** (proved HTTP-01 survives the redirect, then flipped caServer + cleared acme.json), all ~20 containers up + healthy.
- **Q.3.3 verify** — `dev-smoke.sh` **8/8 green** (token→JWT→discover→place→tour-plan→chat WS persist→telemetry). Public trusted TLS on apex/api./auth.

### ⚠ The deploy required hand-patching — repo punch-list (automated `deploy-qa.yml` won't reproduce yet)

A systemic gap: **hardcoded dev credentials + incomplete secret-rotation wiring.** Each issue + the live workaround (workarounds live in untracked files / DB+broker volumes → the live env is stable across `git checkout`):

| #   | Bug                                                                                                                                                               | Live workaround on the VPS                                          | Repo fix                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | `deploy-qa.yml` never `docker network create dt_internal` + no `pnpm install` before migrate                                                                      | ran both manually                                                   | add both to the workflow                                        |
| 2   | qual overlay never mounts the rotated `init-qual/` → postgres used placeholder `init/`                                                                            | `ALTER ROLE` all svc roles to `.env.qual`                           | mount `init-qual` as the postgres initdb dir                    |
| 3   | `02-roles.sql` does `ALTER DEFAULT PRIVILEGES FOR ROLE token_svc`/`search_svc` **before** `CREATE ROLE` → `ON_ERROR_STOP` aborts init (2/10 roles)                | applied `init-qual/02-roles.sql` w/o ON_ERROR_STOP + explicit grant | reorder: create all roles, then grants                          |
| 4   | `rabbitmq/definitions.json` hardcodes the `dailytour` user with a **dev password_hash** → rotated pass refused                                                    | `rabbitmqctl change_password dailytour`                             | env-drive the user (or gen-env emits a qual definitions)        |
| 5   | chat-hub `config.py` `database_url` default = `change-me-please-chat`, **no `DATABASE_URL` in compose**                                                           | `overlay.qual-local.yml` sets `DATABASE_URL`                        | add `DATABASE_URL` (from `SERVICE_DB_PASSWORD_CHAT`) to app.yml |
| 6   | bff `ANALYTICS_DATABASE_URL` default hardcoded, **not set in compose** → telemetry 28P01                                                                          | `overlay.qual-local.yml` sets it                                    | add to app.yml (from `SERVICE_DB_PASSWORD_BFF`)                 |
| 7   | seed reservations use past dates (`2026-06-05`) → token-svc 410                                                                                                   | `UPDATE reservation SET checkin/checkout` to a current window       | relative/future dates in the seed                               |
| 8   | overlay http→https redirect returns 404 (Traefik won't merge a CLI entrypoint-redirection into a file-defined entrypoint); osrm init loops re-downloading the PBF | redirect left (https works); osrm stopped (planner→haversine)       | rework redirect (middleware/co-located); fix osrm init URL      |

### Live-env state (for resume / reconcile)

- Stack under compose project **`dt-qual`** in `/opt/daily-tour`, env `.env.qual` (ghrunner-owned, 600). Extra untracked override `/opt/daily-tour/overlay.qual-local.yml` (chat-hub/bff DB URLs) — must be in the `-f` stack until fixes 5+6 land in app.yml.
- `__SET_MANUALLY__` still pending in `.env.qual`: **`ANTHROPIC_API_KEY` (L90)** + **`EMBEDDING_API_KEY` (L80)** — human to fill on the VPS, then recreate planner-svc + search-svc. Telegram/WhatsApp blanked (in-app chat only).
- island-chronicles remains stopped + backed up; ufw + key-only SSH active.

## Wave 2 — Phase Q.1 VPS preparation (2026-06-12) — ✅ COMPLETE

Live ops on srv911943 (77.37.86.126) over SSH (root key auth), step-by-step with a verification gate after each. island-chronicles preserved.

- **Q.1.0 backup** — `tar` of `/root/island-chronicles` → `/root/backups/island-chronicles-2026-06-12.tgz` (216M, from 1.6G) + `scp` off-box to `/media/jmeireles/ssd3/vps-backups/`. **sha256 identical** both places (`38a1af05…`); 5325 `volumes/` entries. (Hot copy taken before any change, per the risk register; the subsequent clean stop quiesced the on-disk data anyway.)
- **Q.1.1 stop** — `docker compose -f docker-compose.prod.yml -f docker-compose.traefik.yml stop` (project `island-chronicles`, all 7 `unless-stopped`). Verified: 0 running, **80/443/8080 freed**, and a `find -newermt` check confirmed **only `volumes/` data files changed** (postgres checkpoint/WAL, redis RDB, logs — normal clean-shutdown writes) — no config/source touched. Stays down across reboot (`unless-stopped` + explicit stop).
- **Q.1.2 swap** — 4 GB `/swapfile` + `vm.swappiness=10`; persisted in `/etc/fstab` + `/etc/sysctl.d/99-swappiness.conf`. `free -h` shows 4.0Gi swap.
- **Q.1.4 hardening** — `ufw allow 22,80,443` then `ufw --force enable` (allow-before-enable); sshd `PasswordAuthentication no` via `/etc/ssh/sshd_config.d/00-disable-password-auth.conf` (sorts before `50-cloud-init.conf`, which set `yes` — effective value flipped to `no`, confirmed by `sshd -T` _before_ reload). **Lockout-safe protocol:** a detached 5-min deadman armed to auto-revert ufw+sshd unless `/root/.hardening-ok`; a genuinely fresh key-auth connection was verified working post-change; then the marker confirmed the deadman (it stood down without reverting). root + `ubuntu` both retain key access; `at` was absent so the deadman was a nohup loop.
- **Q.1.5 prune cron** — `/etc/cron.d/docker-image-prune` changed from `prune -af --filter until=24h` to **dangling-only `prune -f`** so tagged images survive (incl. the qual deploy's previous-`:sha` rollback target). Disk is 85G-free, so the less-aggressive prune is fine.
- **Q.1.6 toolchain** — Node **v22.22.3** (official binary → `/usr/local`) + **pnpm 9.14.2** (corepack) + git, all system-wide so the future `ghrunner` (Q.3.1) + host-side migrate can use them.
- **Q.1.3** — no-op (GitLab repo-side inaction, decided at READY).

**Next: Q.3** — runner (Q.3.1) + Cloudflare DNS (Q.3.0, needs human/CF token) + first-deploy runbook (Q.3.2, ACME depends on DNS) + verify (Q.3.3).

## Wave 1 — Phase Q.2 repo plumbing (2026-06-12) — ✅ COMPLETE (8/8)

All eight Q.2 tasks shipped + merged in one session via cs-agent fan-out (orchestrator-reviewed; every diff validated independently before merge). VPS untouched — Q.2 is pure repo work.

### Sub-wave 1 — 3 independent agents → 3 PRs

| Task  | PR   | Output                                                                                                                                                            | Validation                                                                                              |
| ----- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Q.2.0 | #214 | `.github/workflows/publish-images.yml` — 10-image matrix (8 svcs + postgres + osrm) → GHCR `{sha,qual}`                                                           | YAML lint; contexts confirmed against every Dockerfile                                                  |
| Q.2.1 | #216 | `infra/compose/overlay.qual.yml` — 0.0.0.0:80/443, web→websecure redirect, **apex `/v1`+`/r` path-routers**, GHCR images, `mem_limit` (via `deploy: !reset null`) | merged `compose config` asserted: ports, redirect, 10 ghcr images, NODE_ENV/OSRM_URL, router priorities |
| Q.2.3 | #215 | `scripts/qual/gen-env-qual.sh` + `.env.qual.example` + rotated `init-qual/02-roles.sql` flow                                                                      | ran generator end-to-end: 0 `change-me-please` left, 64 keys, no secret staged (gitleaks green)         |

**Q.2.2 folded into #216** (not a separate agent): Compose _replaces_ `command:` across files, so all Traefik CLI flags must live in the one overlay that owns the command. Added the `letsencrypt` production resolver to `traefik.yml` + supplied ACME email per resolver via the overlay's Traefik command flags (fixes the `${TRAEFIK_ACME_EMAIL}` static-YAML non-interpolation bug). Dashboard htpasswd → Q.3.2 runbook step.

**Orchestrator finished two agent gaps:** #215 was missing the example + gitignore rule (agent committed only the script); added both + verified.

### Sub-wave 2 — 2 independent agents → 2 PRs

| Task  | PR   | Output                                                                                                                         | Notes                                                                                                                                          |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Q.2.5 | #218 | Authentik qual redirect URI on `owner-app.yaml` + new `overlay.qual-authentik.yml` (auth. router → websecure+TLS, the 404 fix) | merged render asserted router entrypoints/tls + host rule + authentik mem_limits                                                               |
| Q.2.7 | #217 | `dev-env-check.sh --qual` mode (qual containers, apex+api. probes, skip Vite, project-aware smoke)                             | **orchestrator rewired**: agent declared `QUAL_APEX`/`CURL_OPTS` but left them unused; wired probes + fixed `/health`-on-apex routing subtlety |

### Sub-wave 3 — 2 independent agents → 2 PRs (after sub-wave 1+2 merged)

| Task  | PR   | Output                                                                                                                         | Notes                                                                                                                                                        |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q.2.4 | #220 | `apps/pwa/Dockerfile` (dist→nginx, VITE\_\* baked) + pwa in publish matrix + `overlay.qual.yml` pwa→GHCR image                 | local `docker build` smoke passed (exit 0)                                                                                                                   |
| Q.2.6 | #219 | `deploy-qa.yml` (self-hosted runner: pull→up→migrate→seed→smoke→check→**rollback**) + parameterised `dev-up.sh`/`dev-smoke.sh` | **agent badly underdelivered** (no workflow file; params declared-not-wired) → **orchestrator wrote it**; `--from 4 --to 5` verified, dev defaults unchanged |

### Post-merge — maiden `publish-images` run + osrm fixes

The first-ever `publish-images` run (triggered by #220) failed on **osrm only** (10/11 green). Two latent bugs in the rarely-built optional osrm image:

- **#221** — `osrm-backend:v5.28.0` 404s (never existed; project went 5.25 → 6.0) → pinned **v5.25.0** (newest published tag).
- **#222** — v5.25.0 is Debian **stretch (EOL)**; apt repos archived → `apt-get update` 404 → point apt at `archive.debian.org` with `[trusted=yes]` + `Check-Valid-Until=false` (local build validated).

**Result: `publish-images` 11/11 green.** All GHCR images now published: `ghcr.io/zmeireles/daily-tour/{bff,token-svc,catalog-svc,media-svc,planner-svc,search-svc,chat-hub,notif-svc,postgres,osrm,pwa}:{qual,<sha>}` — ready for Q.3 deploy.

### Merge mechanics note

`main` is protected by a **ruleset requiring up-to-date branches** (classic branch-protection API 404s; `--admin` does not bypass). Each merge after the first forces an `gh pr update-branch` → CI re-run → merge cascade. Disjoint-file PRs still serialize this way.

**Next:** Q.1 (live VPS prep — backup/stop island-chronicles, swap, hardening, toolchain) + Q.3 (runner, DNS, first deploy). Both gated on the human's go for live-VPS operations.
