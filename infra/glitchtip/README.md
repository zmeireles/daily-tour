# GlitchTip (error tracking) — Daily Tour

Self-hosted GlitchTip, deployed + operated by the **po-platform** session (sA:Douro)
on the po-platform 8-vCPU box `195.35.3.6` (Daily Tour's 2-vCPU box lacks headroom),
strictly additively — it never touches the `po-prod` stack.

> **Shared service (convergence).** This GlitchTip instance is shared observability
> for **both Daily Tour and po-platform** — each consumer gets its own GlitchTip
> organization/project + uses the Sentry `environment` tag (qual/prod). It lives on
> the po box as converged infra, not a Daily-Tour-only freeloader.

> **Source of truth = the box.** The live deployment at `/opt/daily-tour-glitchtip/`
> on `195.35.3.6` is authoritative and is owned/operated by sA:Douro. This directory
> is a **committed mirror** of that deployment (the real `.env` with secrets stays
> only on the box, chmod 600, never committed). When Douro changes the box, re-sync
> `docker-compose.yml` here.

- **URL:** https://glitchtip.portugalodyssey.pt
- **Live location:** `/opt/daily-tour-glitchtip/` on `195.35.3.6`
- **Compose project:** `daily-tour-glitchtip` (isolated from `po-prod`)
- **Routing:** po-traefik, `entrypoints=websecure`, `certresolver=letsencrypt`
  (Cloudflare DNS-01). Cert issues automatically (`*.portugalodyssey.pt` → the box).

## Isolation guarantees

- `web` joins the external `traefik-public` network **for routing only**.
- `postgres` + `valkey` stay on the private `glitchtip-internal` network — GlitchTip
  cannot reach po's data mesh.
- **No host ports published** — reachable only through po-traefik (TLS).
- Resource-capped (web 1 CPU/1 GB, pg 0.5/512 MB, valkey 0.25/256 MB).
- Own volumes (`gt-pg-data`, `gt-uploads`); own secrets in `./.env` (chmod 600).

## Deploy / operate (on the box)

```bash
cd /opt/daily-tour-glitchtip
docker compose -p daily-tour-glitchtip up -d        # start / update
docker compose -p daily-tour-glitchtip ps           # status
docker compose -p daily-tour-glitchtip logs -f web  # logs
docker compose -p daily-tour-glitchtip down         # stop (never affects po-prod)
```

Always pass `-p daily-tour-glitchtip`. Do **not** restart/recreate `po-traefik`.

## First-run / TODO (owners)

1. Register the first account at the URL → it becomes the org owner.
2. **Then immediately** flip `ENABLE_USER_REGISTRATION` to `"False"` in `.env` and
   `docker compose -p daily-tour-glitchtip up -d web` to lock public sign-up.
   ⚠️ Registration is currently OPEN on a public URL — close it right after the
   first account is created.
3. Wire `EMAIL_URL` (SMTP) for real alert emails — currently `consolemail://`
   (alerts log to stdout only).
4. Create a project in the UI → copy its DSN → set `SENTRY_DSN` (+ `VITE_SENTRY_DSN`
   for the PWA) and `OTEL_DEPLOYMENT_ENVIRONMENT=qual` in the Daily Tour qual env,
   then redeploy so errors flow (Plan-003 T-3.A.1).

## Notes

- `docker-compose.yml` here is a verbatim snapshot of the box file. **Pending sync:**
  Douro is moving postgres 18 → 17 (more mature); the box compose still showed 18 at
  snapshot time — re-fetch + re-commit once that change lands on the box.
