# `infra/authentik/` — Authentik blueprints

Versioned source of truth for the Authentik realm config consumed by Daily
Tour services. Authentik is the OIDC identity provider for the owner
backoffice (FR-BO-01..03); the BFF verifies the `staff`-audience JWTs it
issues (see [`services/bff/src/plugins/owner-auth.ts`](../../services/bff/src/plugins/owner-auth.ts)).

## Layout

| Path                        | Purpose                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `blueprints/owner-app.yaml` | OIDC provider + application + `staff` group + group-claim mapping + staff-only policy binding for the owner backoffice. Owned by **T-1.6.0**. |
| `blueprints/.gitkeep`       | Keeps the directory in git when no blueprints are checked in.                                                                                 |

## How blueprints are applied

`infra/compose/docker-compose.authentik.yml` mounts this directory at
`/blueprints/custom` (read-only) inside both `authentik-server` and
`authentik-worker`. The worker scans that path on boot and on file
change, then applies each blueprint whose
`metadata.labels.blueprints.goauthentik.io/instantiate: "true"` flag is
set. Entries are upserted by their `identifiers:` block — re-applying is
safe.

State surfaces in the admin UI at **Customization → Blueprints**. The
`BlueprintInstance` model carries a `status` field (`successful` /
`error` / `unknown`) but **no error column or traceback** on
Authentik 2026.2.2 — failures are silent (see
[`infra/README.md` §Authentik on first boot](../README.md#authentik-on-first-boot)
for the documented quirk).

## Editing workflow

1. **Source of truth = this directory**. Manual UI edits drift; if you
   absolutely must edit in the UI, immediately re-export with:
   ```bash
   docker compose exec authentik-worker ak export_blueprint > infra/authentik/blueprints/<file>.yaml
   ```
   then check in.
2. Edit the YAML and `docker compose restart authentik-worker`. Watch the
   logs for the apply attempt: `docker compose logs -f authentik-worker | grep blueprint`.
3. If `BlueprintInstance.status` lands on `error` and the worker logs are
   silent, manually create the missing entries in the admin UI as a
   one-shot fallback. The next blueprint apply will upsert and converge
   the state.

## Secret hygiene

All secrets are injected at apply time via `!Env` references — the
literal values live in `.env` only. The current set:

| Env var                             | Used by                                                | Default placeholder                        |
| ----------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `AUTHENTIK_OWNER_APP_CLIENT_SECRET` | `owner-app.yaml` — OIDC provider `client_secret` field | `change-me-please-owner-app-client-secret` |

Rotation: regenerate with `openssl rand -base64 36`, update `.env`,
restart the Authentik worker, then update any client (BFF + PWA) that
holds the secret on its side.

## BFF integration

The BFF reads two env vars to verify owner-app JWTs:

- `AUTHENTIK_JWKS_URL` — Authentik exposes the per-application JWKS at
  `http://authentik:9000/application/o/owner-app/jwks/`. The path is
  derived from the application `slug` declared in `owner-app.yaml`; if
  you rename the slug, update [`services/bff/src/config.ts`](../../services/bff/src/config.ts)
  in the same commit.
- `AUTHENTIK_OWNER_AUDIENCE` — the value the BFF requires in either the
  `aud` claim or the `groups` array. Default `"staff"` matches the group
  name declared in `owner-app.yaml`.

See [`services/bff/src/plugins/AUTH_POSTURES.md`](../../services/bff/src/plugins/AUTH_POSTURES.md)
for the full posture matrix (guest HS256 vs owner RS256 vs public).
