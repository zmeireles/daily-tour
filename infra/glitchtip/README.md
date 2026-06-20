# GlitchTip (error tracking) — Daily Tour client config

Daily Tour uses the **shared** GlitchTip instance operated by po-platform. We do
**not** host an instance — this directory holds client/tenant config only.

- **Instance:** https://errors.portugalodyssey.pt — `po-glitchtip`, owned + operated
  by po-platform (sA:Douro): instance, version, caps, networking, **nightly pg
  backups**, upgrades.
- **Our tenant:** Daily Tour has its **own GlitchTip organization** inside that
  shared instance — separate projects, DSNs, members, and data scoping from
  po-platform's org. One instance serves all Daily Tour environments via the
  Sentry `environment` tag (qual/prod).

## Governance (po-platform ↔ daily-tour)

- **po-platform owns the SERVICE** — accountable that it's up + isolated.
- **Daily Tour owns its TENANT config** — org/project/DSN/alerts + the SDK wiring
  (the DSN-gated error SDK shipped in T-3.A.0).
- **Never `docker compose up` the shared instance.** Instance-level needs (caps,
  SMTP, upgrades, registration lock) → ask po-platform via the orchestrator comms
  channel: `/media/jmeireles/ssd3/my-projects/orchestrator-comms/inbox-po-platform.md`.

## Wiring (once po-platform posts the Daily Tour DSN in the comms channel)

1. Set `SENTRY_DSN` (services) + `VITE_SENTRY_DSN` (PWA) in the qual env
   (`.env.qual` on the box — gitignored; never commit the DSN).
2. Set `OTEL_DEPLOYMENT_ENVIRONMENT=qual` on the services (overlay.qual.yml) so the
   Sentry `environment` tag is correct — Plan-003 **T-3.A.1**.
3. Redeploy qual → errors flow. Verify by throwing a test error and confirming it
   lands in the Daily Tour org at errors.portugalodyssey.pt.

The error-reporting SDK itself is already wired (T-3.A.0) and is a no-op until the
DSN env is set, so steps 1–3 are all that remain to go live.
