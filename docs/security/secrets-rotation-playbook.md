# Secrets Rotation Playbook

> **T-3.B.2** — Authoritative rotation procedure for every secret in the Daily Tour stack.
> Read alongside the global [Secret Tier Registry](~/.claude/docs/secret-tier-registry.md) for tier criteria and hook coverage.

## Overview

| # | Secret(s) | Tier | Hands-on | Service downtime |
|---|-----------|------|----------|-----------------|
| 1 | `JWT_SIGNING_KEY` | 2 | ~5 min | ~5 s rolling |
| 2 | `AUTHENTIK_OWNER_APP_CLIENT_SECRET` | 3 | ~20 min | ~30 s |
| 3 | `AUTHENTIK_BOOTSTRAP_PASSWORD` / `_TOKEN` | 1 | ~2 min | 0 |
| 4 | `AUTHENTIK_SECRET_KEY` | 3 | ~30 min | ~2 min |
| 5 | `ANTHROPIC_API_KEY` | 2 | ~5 min | 0 (warn-and-skip) |
| 6 | `EMBEDDING_API_KEY` (OpenAI) | 2 | ~5 min | 0 (warn-and-skip) |
| 7 | WhatsApp (`ACCESS_TOKEN`, `VERIFY_TOKEN`, `APP_SECRET`) | 2 | ~15 min | ~30 s |
| 8 | Telegram (`BOT_TOKEN`, `WEBHOOK_SECRET`) | 2 | ~10 min | ~30 s |
| 9 | `MEDIA_SVC_INTERNAL_TOKEN` | 2 | ~5 min | ~5 s |
| 10 | `MINIO_ROOT_PASSWORD` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | 2 | ~10 min | ~30 s |
| 11 | PostgreSQL passwords (per-service roles) | 2 | ~20 min | ~10 s per service |
| 12 | `RABBITMQ_PASSWORD` | 2 | ~5 min | ~10 s |
| 13 | `N8N_ENCRYPTION_KEY` | 3 | 2–4 h | ~10 min |
| 14 | SMTP credentials (`SMTP_URL`) | 2 | ~5 min | 0 (retry queue) |
| 15 | `REDIS_PASSWORD` | 2 | ~5 min | ~5 s |
| 16 | Orchestrator `ANTHROPIC_API_KEY` | 2 | ~2 min | 0 |

---

## General conventions

- **Never echo secrets in your terminal** — use clipboard (`xclip -sel clip`) or editor.
- **Never let Claude write secret values** into `.env`, `.mcp.json`, or any file — use your editor directly.
- **Update `.env` first, then restart containers** — avoids a window where the DB has a new password but the app still holds the old one.
- **Backup before rotation**: `cp .env .env.bak.$(date +%Y%m%d%H%M%S)` — keep for one rotation cycle, then shred.
- When services span compose stacks, restart all consumers in the same `docker compose up -d` call to minimise the mismatch window.

---

## 1. `JWT_SIGNING_KEY`

**Used by**: `token-svc` (signs HS256 JWTs), `bff` (verifies)
**Stored in**: `.env` → `JWT_SIGNING_KEY`
**Consumed by**: `infra/compose/docker-compose.app.yml` services `token-svc` and `bff`
**Tier**: 2 — both services must receive the new key simultaneously; a mismatch causes every in-flight token verification to return 401.

### Rotation procedure

1. Generate a new key (minimum 32 chars for HS256):
   ```bash
   openssl rand -base64 48
   ```
2. Open `.env` in your editor, replace `JWT_SIGNING_KEY=...` with the new value.
3. Restart both services in a single command to minimise the mismatch window:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps token-svc bff
   ```

### Verification

```bash
# Health checks pass:
docker inspect --format='{{.State.Health.Status}}' dt_token_svc dt_bff
# → healthy healthy

# End-to-end: issue a guest token and verify it round-trips through the BFF:
curl -s http://api.dt.localhost/v1/token/guest | jq .token | \
  xargs -I{} curl -s -H "Authorization: Bearer {}" http://api.dt.localhost/v1/health
```

### Rollback

Restore `.env.bak.*`, rerun step 3. Any tokens issued between old-key removal and rollback are invalid but there is no data loss — guests re-acquire tokens transparently.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: ~5 seconds (container restart)

---

## 2. `AUTHENTIK_OWNER_APP_CLIENT_SECRET`

**Used by**: Authentik server + worker (blueprint `infra/authentik/blueprints/owner-app.yaml`), BFF OIDC client
**Stored in**: `.env` → `AUTHENTIK_OWNER_APP_CLIENT_SECRET`; also embedded in the Authentik application config via the blueprint `!Env` reference
**Consumed by**: `infra/compose/docker-compose.authentik.yml` (`authentik-server`, `authentik-worker`), BFF OIDC configuration (`AUTHENTIK_JWKS_URL` consumer)
**Tier**: 3 — OIDC client secret; rotation requires re-syncing Authentik's application record and the BFF config, and will briefly break owner logins.

### Rotation procedure

1. Generate a new secret:
   ```bash
   openssl rand -base64 48
   ```
2. In the Authentik admin UI (`http://auth.dt.localhost/if/admin/`), navigate to **Applications → owner-app → Edit → OAuth2/OpenID Provider → Client Secret** and paste the new value. Save.
3. Update `.env`:
   ```
   AUTHENTIK_OWNER_APP_CLIENT_SECRET=<new-value>
   ```
4. Restart Authentik server + worker so the blueprint re-applies with the new env value:
   ```bash
   docker compose -f infra/compose/docker-compose.authentik.yml \
     --env-file .env \
     up -d --no-deps authentik-server authentik-worker
   ```
5. Restart BFF (it reads the client secret indirectly via the OIDC flow):
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps bff
   ```

### Verification

```bash
# Authentik health:
curl -fsS http://auth.dt.localhost/-/health/live/ && echo ok

# Owner OIDC login: open http://app.dt.localhost, attempt owner login.
# A successful redirect to /owner/* confirms the new client secret is accepted.
```

### Rollback

Revert `.env` and Authentik UI to the old value, restart in the same order (Authentik, then BFF).

### Estimated rotation time

- Hands-on: ~20 minutes (Authentik UI + container restarts)
- Service downtime: ~30 seconds (owner logins fail during restart)

---

## 3. `AUTHENTIK_BOOTSTRAP_PASSWORD` / `AUTHENTIK_BOOTSTRAP_TOKEN`

**Used by**: Authentik server + worker (first-boot bootstrap only)
**Stored in**: `.env` → `AUTHENTIK_BOOTSTRAP_PASSWORD`, `AUTHENTIK_BOOTSTRAP_TOKEN`
**Consumed by**: `infra/compose/docker-compose.authentik.yml`
**Tier**: 1 — bootstrap-only credentials used once to create the `akadmin` account. After first boot they are effectively inert.

### Rotation procedure

1. Generate new values:
   ```bash
   openssl rand -base64 24    # AUTHENTIK_BOOTSTRAP_PASSWORD
   openssl rand -hex 32       # AUTHENTIK_BOOTSTRAP_TOKEN
   ```
2. Update `.env` with both new values.
3. If the `akadmin` account was already created with the old password, reset it separately via the Authentik admin UI: **Directory → Users → akadmin → Set Password**.
4. Restart Authentik containers (the bootstrap env vars are re-read on container start but have no effect on existing users):
   ```bash
   docker compose -f infra/compose/docker-compose.authentik.yml \
     --env-file .env up -d --no-deps authentik-server authentik-worker
   ```

### Verification

```bash
# Login to Authentik admin UI with the new password:
curl -s -X POST http://auth.dt.localhost/api/v3/core/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"akadmin","password":"<NEW_PASSWORD>"}' | jq .user
```

### Rollback

No operational impact — these values are only used on first boot. Reverting `.env` has no effect on a running stack.

### Estimated rotation time

- Hands-on: ~2 minutes
- Service downtime: 0 (bootstrap vars are inert post-boot)

---

## 4. `AUTHENTIK_SECRET_KEY`

**Used by**: Authentik server + worker (all session token + cookie signing)
**Stored in**: `.env` → `AUTHENTIK_SECRET_KEY`
**Consumed by**: `infra/compose/docker-compose.authentik.yml`
**Tier**: 3 — rotation invalidates every active Authentik session. All users (owners, admin) are logged out simultaneously.

### Pre-rotation checklist

- [ ] Communicate planned downtime to all users.
- [ ] Verify no critical workflows are in-progress (n8n runs, owner-dashboard operations).
- [ ] Backup `.env`.

### Rotation procedure

1. Generate a new key (≥50 chars):
   ```bash
   openssl rand -base64 60
   ```
2. Update `.env`:
   ```
   AUTHENTIK_SECRET_KEY=<new-value>
   ```
3. Restart Authentik server + worker:
   ```bash
   docker compose -f infra/compose/docker-compose.authentik.yml \
     --env-file .env \
     up -d --no-deps authentik-server authentik-worker
   ```
4. Inform users — all active sessions are now invalid; they must log in again.

### Verification

```bash
# Authentik health:
curl -fsS http://auth.dt.localhost/-/health/live/ && echo ok

# Walk one ForwardAuth-protected route (owner dashboard):
# Open http://app.dt.localhost/owner — should redirect to Authentik login,
# then back to the dashboard after credentials are entered.
```

### Rollback

Restore the old `AUTHENTIK_SECRET_KEY` from `.env.bak.*`, restart Authentik containers. Sessions issued under the new key become invalid; sessions from before the rotation window remain valid.

### Estimated rotation time

- Hands-on: ~30 minutes (communication + restart + user re-auth)
- Service downtime: ~2 minutes (Authentik restart)

---

## 5. `ANTHROPIC_API_KEY`

**Used by**: `planner-svc` (tour plan generation via Claude API), `chat-hub` (AI reservation drafter)
**Stored in**: `.env` → `ANTHROPIC_API_KEY`
**Consumed by**: `infra/compose/docker-compose.app.yml` services `planner-svc`, `chat-hub`
**Tier**: 2 — cost exposure + service degradation on leak; rotation is simple (no cascade outside these two services).

### Rotation procedure

1. In the [Anthropic Console](https://console.anthropic.com/), create a new API key named `daily-tour-<YYYYMMDD>`.
2. Update `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart affected services:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps planner-svc chat-hub
   ```
4. Revoke the old key in the Anthropic Console.

### Verification

```bash
# Health checks:
docker inspect --format='{{.State.Health.Status}}' dt_planner_svc dt_chat_hub
# → healthy healthy

# Smoke test — planner accepts a plan request (non-empty response):
curl -s -X POST http://api.dt.localhost/v1/plan \
  -H "Content-Type: application/json" \
  -d '{"query":"1 day in Lisbon","guests":2}' | jq .status
```

### Rollback

Restore the old key in `.env`, restart both services. The old key must still be active in the Anthropic Console — delay revocation until the new key is confirmed working.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: 0 (services warn-and-skip when key is missing; no crashes)

---

## 6. `EMBEDDING_API_KEY` (OpenAI)

**Used by**: `search-svc` (embedding worker, `EMBEDDING_API_KEY` env var)
**Stored in**: `.env` → `EMBEDDING_API_KEY`
**Consumed by**: `infra/compose/docker-compose.app.yml` service `search-svc` (also `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`)
**Tier**: 2 — cost exposure on leak; rotation is a single service restart.

### Rotation procedure

1. In the [OpenAI dashboard](https://platform.openai.com/api-keys), create a new key named `daily-tour-<YYYYMMDD>`.
2. Update `.env`:
   ```
   EMBEDDING_API_KEY=sk-...
   ```
3. Restart search-svc:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps search-svc
   ```
4. Revoke the old key on the OpenAI dashboard.

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_search_svc
# → healthy

# Trigger a place search and check embedding lookup returns results:
curl -s "http://api.dt.localhost/v1/search?q=beach+Algarve" | jq '.results | length'
```

### Rollback

Restore `.env`, restart `search-svc`. Delay old-key revocation until new key is confirmed.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: 0 (worker warns-and-skips upsert if key is absent; existing embeddings remain queryable)

---

## 7. WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`

**Used by**: `chat-hub` WhatsApp driver
**Stored in**: `.env` → `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
**Consumed by**: `infra/compose/docker-compose.app.yml` service `chat-hub`
**Tier**: 2 — access token leaks allow sending messages as the business number; app secret leaks allow forging inbound webhooks.

> Rotate all three together — a mismatched `APP_SECRET` causes all inbound webhooks to fail HMAC verification.

### Rotation procedure

#### `WHATSAPP_ACCESS_TOKEN`

1. In the [Meta Developer Console](https://developers.facebook.com/), navigate to your app → **WhatsApp → API Setup**.
2. Generate a new System User token (or rotate the existing one under **Business Settings → System Users**). Required permission: `whatsapp_business_messaging`.
3. Update `.env`:
   ```
   WHATSAPP_ACCESS_TOKEN=<new-token>
   ```

#### `WHATSAPP_APP_SECRET`

1. In Meta Developer Console → **Settings → Basic** → regenerate the App Secret.
2. Update `.env`:
   ```
   WHATSAPP_APP_SECRET=<new-secret>
   ```

#### `WHATSAPP_VERIFY_TOKEN`

1. Generate a new verify token:
   ```bash
   openssl rand -hex 16
   ```
2. Update `.env`:
   ```
   WHATSAPP_VERIFY_TOKEN=<new-token>
   ```
3. In Meta Developer Console → **WhatsApp → Configuration → Webhooks**, click **Edit** and update the Verify Token to match.

#### Apply all three

```bash
docker compose -f infra/compose/docker-compose.app.yml \
  --env-file .env \
  up -d --no-deps chat-hub
```

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_chat_hub
# → healthy

# Send a test WhatsApp message to the business number; confirm chat-hub receives
# and logs it (check: docker logs dt_chat_hub --tail 20).
```

### Rollback

Restore `.env.bak.*` values; re-enter the old `VERIFY_TOKEN` in Meta Console if it was changed; restart `chat-hub`.

### Estimated rotation time

- Hands-on: ~15 minutes (Meta Console + three env updates)
- Service downtime: ~30 seconds (container restart)

---

## 8. Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`

**Used by**: `chat-hub` Telegram driver
**Stored in**: `.env` → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
**Consumed by**: `infra/compose/docker-compose.app.yml` service `chat-hub`
**Tier**: 2 — token leaks allow impersonating the bot; webhook secret leaks allow forging inbound updates.

> Rotate both together — the new webhook registration must use the new secret.

### Rotation procedure

1. In Telegram, message `@BotFather`:
   ```
   /token <bot_username>
   ```
   Select the bot and confirm revocation. BotFather issues a new token immediately (the old one is dead as of this moment).

2. Generate a new webhook secret:
   ```bash
   openssl rand -hex 32
   ```

3. Update `.env`:
   ```
   TELEGRAM_BOT_TOKEN=<new-token>
   TELEGRAM_WEBHOOK_SECRET=<new-secret>
   ```

4. Restart `chat-hub`:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps chat-hub
   ```

5. Re-register the webhook with the new token and secret:
   ```bash
   # Replace <BOT_TOKEN> and <WEBHOOK_URL> with real values (never paste inline here)
   curl -s -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"<WEBHOOK_URL>","secret_token":"<WEBHOOK_SECRET>"}'
   ```

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_chat_hub
# → healthy

# Send /start to the bot from a Telegram client;
# check docker logs dt_chat_hub --tail 20 for the received update.
```

### Rollback

There is no rollback for the BotFather token revocation — the old token is permanently invalidated. If the new token is wrong, re-run the `@BotFather /token` flow again.

### Estimated rotation time

- Hands-on: ~10 minutes
- Service downtime: ~30 seconds (container restart + webhook re-registration)

---

## 9. `MEDIA_SVC_INTERNAL_TOKEN`

**Used by**: `media-svc` (validates inbound requests), `bff` (sends in `X-Internal-Token` header)
**Stored in**: `.env` → `MEDIA_SVC_INTERNAL_TOKEN`
**Consumed by**: `infra/compose/docker-compose.app.yml` services `media-svc`, `bff`
**Tier**: 2 — shared internal bearer token; leaking it allows any caller to bypass the BFF and hit media-svc directly.

### Rotation procedure

1. Generate a new token (≥32 chars):
   ```bash
   openssl rand -base64 32
   ```
2. Update `.env`:
   ```
   MEDIA_SVC_INTERNAL_TOKEN=<new-value>
   ```
3. Restart both services simultaneously:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps media-svc bff
   ```

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_media_svc dt_bff
# → healthy healthy

# Owner media upload flow:
# POST /v1/owner/media/upload via the BFF → 200 with a presigned URL
```

### Rollback

Restore `.env.bak.*`, restart `media-svc` and `bff` together.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: ~5 seconds

---

## 10. `MINIO_ROOT_PASSWORD` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`

**Used by**: MinIO container root user; `media-svc` (reads MinIO root creds via `MINIO_ROOT_PASSWORD` mapped to `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` in compose)
**Stored in**: `.env` → `MINIO_ROOT_PASSWORD`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
**Consumed by**: `infra/compose/docker-compose.base.yml` (MinIO container), `infra/compose/docker-compose.app.yml` (media-svc reads `MINIO_SECRET_KEY`)
**Tier**: 2 — MinIO admin credentials; leak grants full bucket read/write/delete access.

> Note: In this stack `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` are aliases for the MinIO root credentials. Update all three to the same new values.

### Rotation procedure

1. Generate a new password (16–32 chars, printable):
   ```bash
   openssl rand -base64 24 | tr -d '+/=' | cut -c1-32
   ```
2. Update `.env`:
   ```
   MINIO_ROOT_PASSWORD=<new-value>
   MINIO_SECRET_KEY=<new-value>
   ```
   (`MINIO_ACCESS_KEY` is the username; leave it as `dailytour` unless renaming the root user.)
3. Restart MinIO:
   ```bash
   docker compose -f infra/compose/docker-compose.base.yml \
     --env-file .env \
     up -d --no-deps minio
   ```
4. Restart `media-svc` (it reads `MINIO_SECRET_KEY` at startup):
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps media-svc
   ```

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_minio dt_media_svc
# → healthy healthy

# Confirm MinIO console login at http://localhost:27901 with new credentials.
# Confirm media-svc can issue a presigned URL via the BFF.
```

### Rollback

Restore `.env.bak.*`, restart MinIO and media-svc.

### Estimated rotation time

- Hands-on: ~10 minutes
- Service downtime: ~30 seconds (MinIO + media-svc restarts)

---

## 11. PostgreSQL passwords (per-service roles)

**Used by**: each service role (`catalog_svc`, `chat_svc`, `planner_svc`, `search_svc`, `ingest_svc`, `notif_svc`, `media_svc`, `token_svc`, `bff`, `n8n`) plus the superuser (`POSTGRES_PASSWORD`) and Authentik's dedicated PG (`AUTHENTIK_PG_PASSWORD`)
**Stored in**: `.env` → `POSTGRES_PASSWORD`, `SERVICE_DB_PASSWORD_*`, `AUTHENTIK_PG_PASSWORD`; role passwords are also set as literals in `infra/postgres/init/02-roles.sql` (used only on first boot)
**Consumed by**: each service's `DATABASE_URL` / `*_DATABASE_URL` env var
**Tier**: 2 — production DB passwords; rotation requires an `ALTER ROLE` in Postgres and a service restart, but no data migration.

> The `02-roles.sql` literals are first-boot only. Post-boot, passwords must be changed via `ALTER ROLE` — the init script does **not** re-run on existing volumes.

### Rotation procedure (per role)

Replace `<ROLE>` with the role name (e.g. `catalog_svc`) and `<ENV_VAR>` with the matching env var (e.g. `SERVICE_DB_PASSWORD_CATALOG`):

1. Generate a new password:
   ```bash
   openssl rand -base64 32
   ```

2. Apply the new password in Postgres:
   ```bash
   # Use psql from outside the container; never echo the password in the command
   docker exec -i dt_postgres psql -U postgres -c \
     "ALTER ROLE <ROLE> WITH PASSWORD '<NEW_PASSWORD>';"
   ```

3. Update `.env`:
   ```
   <ENV_VAR>=<new-value>
   ```

4. Restart the affected service:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps <service-name>
   ```

#### Role → env var → service mapping

| Role | Env var | Service |
|------|---------|---------|
| `catalog_svc` | `SERVICE_DB_PASSWORD_CATALOG` | `catalog-svc` |
| `chat_svc` | `SERVICE_DB_PASSWORD_CHAT` | `chat-hub` |
| `planner_svc` | `SERVICE_DB_PASSWORD_PLANNER` | `planner-svc` |
| `search_svc` | `SERVICE_DB_PASSWORD_SEARCH` | `search-svc` |
| `ingest_svc` | `SERVICE_DB_PASSWORD_INGEST` | *(no service yet — ingest schema only)* |
| `notif_svc` | `SERVICE_DB_PASSWORD_NOTIF` | `notif-svc` |
| `media_svc` | `SERVICE_DB_PASSWORD_MEDIA` | `media-svc` |
| `token_svc` | `SERVICE_DB_PASSWORD_TOKEN` | `token-svc` |
| `bff` | `SERVICE_DB_PASSWORD_BFF` | `bff` |
| `n8n` | `SERVICE_DB_PASSWORD_N8N` | `n8n` (audit read only) |
| `postgres` (superuser) | `POSTGRES_PASSWORD` | no direct service — admin access |
| `authentik` | `AUTHENTIK_PG_PASSWORD` | `authentik-server`, `authentik-worker` |

#### Superuser (`POSTGRES_PASSWORD`) rotation

```bash
docker exec -i dt_postgres psql -U postgres -c \
  "ALTER ROLE postgres WITH PASSWORD '<NEW_PASSWORD>';"
```
Update `.env` → `POSTGRES_PASSWORD`. No service restarts needed (only `psql` admin sessions use the superuser; services use dedicated roles).

#### Authentik PG password (`AUTHENTIK_PG_PASSWORD`) rotation

```bash
docker exec -i dt_authentik_postgres psql -U postgres -c \
  "ALTER ROLE authentik WITH PASSWORD '<NEW_PASSWORD>';"
```
Update `.env` → `AUTHENTIK_PG_PASSWORD`, then restart:
```bash
docker compose -f infra/compose/docker-compose.authentik.yml \
  --env-file .env up -d --no-deps authentik-server authentik-worker
```

### Verification

```bash
# Confirm role can connect (replace <ROLE>, <PASSWORD>, <SERVICE_PORT>):
docker exec -i dt_postgres psql \
  "postgresql://<ROLE>:<PASSWORD>@localhost:5432/dailytour" \
  -c "SELECT current_user;"

# Confirm service health:
docker inspect --format='{{.State.Health.Status}}' dt_<service>
```

### Rollback

Re-run `ALTER ROLE` with the old password (from `.env.bak.*`), restore `.env`, restart service.

### Estimated rotation time

- Hands-on: ~2 minutes per role (~20 minutes for all roles)
- Service downtime: ~10 seconds per service restart

---

## 12. `RABBITMQ_PASSWORD`

**Used by**: RabbitMQ broker (default user `dailytour`); `media-svc`, `planner-svc`, `search-svc`, `chat-hub` connect via `RABBITMQ_URL`
**Stored in**: `.env` → `RABBITMQ_PASSWORD`, `RABBITMQ_URL`
**Consumed by**: `infra/compose/docker-compose.base.yml` (RabbitMQ env), all services that set `RABBITMQ_URL`
**Tier**: 2 — all message-queue consumers disconnect if password is wrong.

### Rotation procedure

1. Generate a new password:
   ```bash
   openssl rand -base64 24
   ```
2. Apply the new password via the RabbitMQ management API:
   ```bash
   # Use the OLD password to authenticate this call
   curl -s -u dailytour:<OLD_PASSWORD> \
     -X PUT http://localhost:27673/api/users/dailytour \
     -H "Content-Type: application/json" \
     -d '{"password":"<NEW_PASSWORD>","tags":"administrator"}'
   ```
3. Update `.env` — both `RABBITMQ_PASSWORD` and the password embedded in `RABBITMQ_URL`:
   ```
   RABBITMQ_PASSWORD=<new-value>
   RABBITMQ_URL=amqp://dailytour:<new-value>@dt_rabbitmq:5672/
   ```
4. Restart all consumers (minimise mismatch window):
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps media-svc planner-svc search-svc chat-hub
   ```

### Verification

```bash
# Management UI reachable with new credentials:
curl -s -u dailytour:<NEW_PASSWORD> http://localhost:27673/api/overview | jq .rabbitmq_version

# All consumer services healthy:
docker inspect --format='{{.Name}} {{.State.Health.Status}}' \
  dt_media_svc dt_planner_svc dt_search_svc dt_chat_hub
```

### Rollback

Re-apply old password via management API (using new password to auth), restore `.env`, restart consumers.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: ~10 seconds (consumers reconnect on restart)

---

## 13. `N8N_ENCRYPTION_KEY`

**Used by**: n8n (encrypts all stored credentials at rest in its SQLite/Postgres DB)
**Stored in**: `.env` → `N8N_ENCRYPTION_KEY`
**Consumed by**: `infra/compose/docker-compose.n8n.yml` service `n8n`
**Tier**: 3 — losing this key without a migration makes every stored credential unreadable. Rotation requires a full credential re-entry cycle.

> **Do not rotate unless the key is confirmed leaked.** Routine rotation is not worth the operational cost.

### Rotation procedure (Option A — migration, preferred)

1. Document every n8n credential's connection parameters (host, user, database/org, scope) outside of n8n before starting.
2. Generate a new key:
   ```bash
   openssl rand -hex 24
   ```
3. Update `.env`:
   ```
   N8N_ENCRYPTION_KEY=<new-value>
   ```
4. Restart n8n:
   ```bash
   docker compose -f infra/compose/docker-compose.n8n.yml \
     --env-file .env up -d --no-deps n8n
   ```
5. In the n8n UI, open every stored credential, re-enter its secret value, and click **Save**. n8n re-encrypts on save with the new key. Credentials that are not re-saved remain encrypted under the old key and will fail.
6. Verify each workflow that uses credentials by running a manual test execution.

### Rotation procedure (Option B — wipe, only if key is fully compromised and migration is impossible)

1. Export all n8n workflows (JSON export via Settings → Export) before starting.
2. Delete all credentials in n8n UI.
3. Stop n8n, update `.env`, restart.
4. Re-create all credentials from step 1's documentation.
5. Re-bind credentials to every workflow.

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_n8n
# → healthy

# Manually trigger a workflow that calls an external API (e.g. the post-stay-review
# workflow against notif-svc). A successful execution confirms credentials are
# correctly re-encrypted and readable under the new key.
```

### Rollback (Option A only)

Restore the old `N8N_ENCRYPTION_KEY` from `.env.bak.*`, restart n8n. Credentials that were re-saved under the new key will be unreadable — re-enter those.

### Estimated rotation time

- Hands-on: 2–4 hours (Option A) / 4+ hours (Option B)
- Service downtime: ~10 minutes (n8n restart + credential verification)

---

## 14. SMTP credentials (`SMTP_URL`)

**Used by**: `notif-svc` (post-stay email dispatch)
**Stored in**: `.env` → `SMTP_URL` (scheme includes credentials: `smtp://user:pass@host:port`)
**Consumed by**: `infra/compose/docker-compose.app.yml` service `notif-svc`
**Tier**: 2 — SMTP credential leak allows sending arbitrary email via your account; rotation is a single service restart.

### Rotation procedure

1. Generate or obtain a new SMTP password / app password from your email provider (e.g. Mailgun, SendGrid, Google Workspace).
2. Update `.env`. The entire URL must be updated atomically — edit in your editor (not via CLI cat/echo):
   ```
   SMTP_URL=smtps://user:<new-password>@smtp.example.com:465
   ```
3. Restart notif-svc:
   ```bash
   docker compose -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps notif-svc
   ```

### Verification

```bash
docker inspect --format='{{.State.Health.Status}}' dt_notif_svc
# → healthy

# Trigger a test notification:
curl -s -X POST http://notif-svc.dt.localhost/v1/notify/post-stay \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","guest_name":"Test"}' | jq .status
```

### Rollback

Restore `.env.bak.*`, restart `notif-svc`. Email queue is advisory (n8n triggers); in-flight notifications retry on the next n8n schedule.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: 0 (SMTP failures queue/retry in n8n; health check is internal-only)

---

## 15. `REDIS_PASSWORD`

**Used by**: Redis (auth), BFF (session cache, rate-limit buckets, WS fanout), Authentik (session store)
**Stored in**: `.env` → `REDIS_PASSWORD`
**Consumed by**: `infra/compose/docker-compose.base.yml` (Redis), `docker-compose.authentik.yml` (Authentik), `docker-compose.app.yml` (BFF via `REDIS_URL`)
**Tier**: 2 — all consumers disconnect on mismatch; rotation must be applied to Redis and all consumers simultaneously.

### Rotation procedure

1. Generate a new password:
   ```bash
   openssl rand -base64 32
   ```
2. Update `.env`:
   ```
   REDIS_PASSWORD=<new-value>
   ```
   The `REDIS_URL` in BFF's compose env (`redis://default:${REDIS_PASSWORD}@dt_redis:6379/0`) reads from this variable automatically.
3. Restart Redis and all consumers in a single compose call:
   ```bash
   docker compose \
     -f infra/compose/docker-compose.base.yml \
     -f infra/compose/docker-compose.authentik.yml \
     -f infra/compose/docker-compose.app.yml \
     --env-file .env \
     up -d --no-deps redis authentik-server authentik-worker bff
   ```

### Verification

```bash
# Redis accepting connections with new password:
docker exec dt_redis redis-cli -a <NEW_PASSWORD> ping
# → PONG

# All consumers healthy:
docker inspect --format='{{.Name}} {{.State.Health.Status}}' \
  dt_redis dt_authentik_server dt_bff
```

### Rollback

Restore `.env.bak.*`, restart Redis + all consumers.

### Estimated rotation time

- Hands-on: ~5 minutes
- Service downtime: ~5 seconds (container restarts; Redis evicts in-memory sessions — guests re-authenticate)

---

## 16. Orchestrator `ANTHROPIC_API_KEY`

**Used by**: Claude Code orchestrator sessions (the `cs-agent` workflow and direct Claude Code invocations)
**Stored in**: `~/.claude/.env` or the shell profile sourced before Claude Code sessions (project-agnostic, user-level)
**Consumed by**: the Claude Code CLI (`claude` / `cs-agent`) on the local machine
**Tier**: 2 — cost exposure; rotation is entirely local with no service restarts required.

### Rotation procedure

1. In the [Anthropic Console](https://console.anthropic.com/), create a new API key named `orchestrator-<hostname>-<YYYYMMDD>`.
2. Update the stored key. Depending on how it is configured on this machine:
   - **If set in `~/.claude/.env`**: edit that file in your editor, replace `ANTHROPIC_API_KEY=...`.
   - **If set in shell profile (`~/.bashrc`, `~/.zshrc`)**: edit the `export ANTHROPIC_API_KEY=...` line.
   - **If set via `claude config`**: run `claude config set apiKey <new-key>` in a terminal with Claude Code closed.
3. Restart any running Claude Code sessions to pick up the new key.
4. Revoke the old key in the Anthropic Console.

### Verification

```bash
# From a fresh terminal:
claude --version && echo "session auth ok"
# A successful version print confirms the key is valid.
```

### Rollback

Restore the old key via the same editing path, restart Claude Code. Delay old-key revocation until new key is confirmed.

### Estimated rotation time

- Hands-on: ~2 minutes
- Service downtime: 0 (local-only; no containers involved)

---

## Emergency contacts and escalation

| Scenario | Action |
|----------|--------|
| Tier-3 secret confirmed leaked | Stop the session. Rotate immediately (no async). Notify the project owner. File `~/.claude/incidents/INC-NNN.md`. |
| Tier-2 secret leaked in production | Rotate within the hour. File an incident row. |
| Tier-1 secret leaked | Rotate at next convenient time. Log in session memory if it shows a recurrence pattern. |
| n8n encryption key lost (no backup) | All stored credentials are permanently unreadable. Re-enter every credential manually. Estimated recovery: 4+ hours. |
| Postgres superuser password lost | `docker exec -it dt_postgres psql -U postgres` still works if the container has no `pg_hba.conf` restriction on local sockets. Reset via `ALTER ROLE postgres WITH PASSWORD '...'`. |
