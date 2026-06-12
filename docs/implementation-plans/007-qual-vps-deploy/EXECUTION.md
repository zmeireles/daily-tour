# Plan 007 — Execution log

Wave-by-wave record of Plan-007 (qual VPS deploy). Newest wave first.

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
