#!/usr/bin/env bash
# gen-env-qual.sh — generate the qual environment secret/config contract.
# (Plan-007 Q.2.3)
#
# Produces, on the qual VPS, two GITIGNORED artefacts that MUST NEVER be
# committed (they hold live secrets):
#
#   <repo>/.env.qual
#       Every key from .env.example, with freshly generated secrets and
#       qual-specific hostnames filled in. Satisfies every `${VAR:?}`-required
#       var in infra/compose/*.yml and every value scripts/dev/dev-up.sh checks.
#
#   <repo>/infra/postgres/init-qual/{00-extensions,01-schemas,02-roles}.sql
#       A complete, drop-in replacement for infra/postgres/init/. 00 and 01 are
#       copied verbatim; 02-roles.sql has its `change-me-please-<svc>` password
#       literals rotated to the matching SERVICE_DB_PASSWORD_<SVC> in .env.qual,
#       so a fresh qual Postgres comes up with rotated creds that already match.
#       The qual deploy mounts init-qual/ instead of init/ on first boot.
#
# The committed template `.env.qual.example` mirrors this file's structure with
# __GENERATED__ / __SET_MANUALLY__ placeholders.
#
# Usage:
#   scripts/qual/gen-env-qual.sh --acme-email ops@portugalodyssey.pt
#   scripts/qual/gen-env-qual.sh --acme-email me@x.com --force   # overwrite
#
# Flags:
#   --acme-email <addr>   TRAEFIK_ACME_EMAIL (real address — Let's Encrypt).
#   --force               Overwrite an existing .env.qual (regenerates secrets).
#   -h, --help            Show this help.
set -euo pipefail

# ── locate the repo root from this script's location (never trust CWD) ────────
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)

ENV_OUT="$REPO_ROOT/.env.qual"
INIT_SRC="$REPO_ROOT/infra/postgres/init"
INIT_QUAL="$REPO_ROOT/infra/postgres/init-qual"

ACME_EMAIL_PLACEHOLDER="__SET_ACME_EMAIL__"
ACME_EMAIL="$ACME_EMAIL_PLACEHOLDER"
FORCE=0

usage() {
  sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

die() { echo "error: $*" >&2; exit 1; }

# ── args ──────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --acme-email) [[ $# -ge 2 ]] || die "--acme-email needs a value"; ACME_EMAIL="$2"; shift 2 ;;
    --acme-email=*) ACME_EMAIL="${1#*=}"; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: unknown arg: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# ── preconditions ─────────────────────────────────────────────────────────────
command -v openssl >/dev/null 2>&1 || die "openssl is required but not found"
[[ -f "$INIT_SRC/02-roles.sql" ]]   || die "missing source: $INIT_SRC/02-roles.sql"
[[ -f "$INIT_SRC/00-extensions.sql" ]] || die "missing source: $INIT_SRC/00-extensions.sql"
[[ -f "$INIT_SRC/01-schemas.sql" ]] || die "missing source: $INIT_SRC/01-schemas.sql"

if [[ -e "$ENV_OUT" && $FORCE -ne 1 ]]; then
  die "$ENV_OUT already exists — refusing to clobber live secrets. Re-run with --force to regenerate."
fi

# Tighten the umask so every file we create lands at 600, not 644.
umask 077

# ── secret generators ─────────────────────────────────────────────────────────
# Hex is shell-, URL- and sed-safe (alphabet [0-9a-f] only). We use it for every
# secret that ends up in a DB-URL, a sed substitution, or a sourced .env line.
gen_hex() { openssl rand -hex "$1"; }              # -> 2*N chars
# base64 only where a length/format is mandated (Authentik SECRET_KEY ≥50).
# openssl wraps base64 at 64 cols — strip newlines so it stays a single token.
gen_b64() { openssl rand -base64 "$1" | tr -d '\n'; }

assert_len() { # name value min
  local name=$1 value=$2 min=$3
  (( ${#value} >= min )) || die "$name length ${#value} < required $min (openssl produced short output?)"
}

# ── generate secrets ──────────────────────────────────────────────────────────
# Infra root passwords (hex 24 -> 48 chars).
POSTGRES_PASSWORD=$(gen_hex 24)
REDIS_PASSWORD=$(gen_hex 24)
RABBITMQ_PASSWORD=$(gen_hex 24)
MINIO_ROOT_PASSWORD=$(gen_hex 24)

# Per-service DB passwords (hex 24 -> 48 chars; sed-safe for the roles rotation).
SERVICE_DB_PASSWORD_CATALOG=$(gen_hex 24)
SERVICE_DB_PASSWORD_CHAT=$(gen_hex 24)
SERVICE_DB_PASSWORD_PLANNER=$(gen_hex 24)
SERVICE_DB_PASSWORD_SEARCH=$(gen_hex 24)
SERVICE_DB_PASSWORD_INGEST=$(gen_hex 24)
SERVICE_DB_PASSWORD_NOTIF=$(gen_hex 24)
SERVICE_DB_PASSWORD_MEDIA=$(gen_hex 24)
SERVICE_DB_PASSWORD_TOKEN=$(gen_hex 24)
SERVICE_DB_PASSWORD_BFF=$(gen_hex 24)
SERVICE_DB_PASSWORD_N8N=$(gen_hex 24)

# Shared app secrets.
JWT_SIGNING_KEY=$(gen_hex 32)              # 64 chars (>=32; shared bff<->token).
MEDIA_SVC_INTERNAL_TOKEN=$(gen_hex 24)     # 48 chars (>=32; shared bff<->media).

# Authentik.
AUTHENTIK_SECRET_KEY=$(gen_b64 60)         # 80 chars (>=50; Django SECRET_KEY).
AUTHENTIK_PG_PASSWORD=$(gen_hex 24)
AUTHENTIK_BOOTSTRAP_PASSWORD=$(gen_hex 24)
AUTHENTIK_BOOTSTRAP_TOKEN=$(gen_hex 24)
AUTHENTIK_OWNER_APP_CLIENT_SECRET=$(gen_hex 24)

# Traefik dashboard.
TRAEFIK_DASHBOARD_PASSWORD=$(gen_hex 24)

# Self-chosen webhook secrets (NOT provider-issued — safe to generate).
TELEGRAM_WEBHOOK_SECRET=$(gen_hex 32)      # arbitrary, A-Za-z0-9_- (.env.example).
WHATSAPP_VERIFY_TOKEN=$(gen_hex 16)        # arbitrary challenge token.
N8N_ENCRYPTION_KEY=$(gen_hex 24)           # encrypts n8n stored credentials.

# Derived / coupled values.
MINIO_SECRET_KEY="$MINIO_ROOT_PASSWORD"    # MINIO_SECRET_KEY mirrors the root pw.
RABBITMQ_URL="amqp://dailytour:${RABBITMQ_PASSWORD}@dt_rabbitmq:5672/"

# ── assert minimum lengths (fail loud if openssl ever short-changes us) ────────
assert_len JWT_SIGNING_KEY "$JWT_SIGNING_KEY" 32
assert_len MEDIA_SVC_INTERNAL_TOKEN "$MEDIA_SVC_INTERNAL_TOKEN" 32
assert_len AUTHENTIK_SECRET_KEY "$AUTHENTIK_SECRET_KEY" 50
for _svc in CATALOG CHAT PLANNER SEARCH INGEST NOTIF MEDIA TOKEN BFF N8N; do
  _var="SERVICE_DB_PASSWORD_${_svc}"
  assert_len "$_var" "${!_var}" 32
done

# ── write .env.qual (mirrors .env.example section order) ───────────────────────
cat > "$ENV_OUT" <<EOF
# Daily Tour — QUAL environment (generated by scripts/qual/gen-env-qual.sh).
# DO NOT COMMIT. Holds live secrets; gitignored via \`.env.*\`.
# Re-generate with --force to rotate every secret. The committed template is
# .env.qual.example. Keys marked __SET_MANUALLY__ are provider-issued and must
# be filled in by the operator (see the summary the generator prints).

# ─────────────────────────────────────────────────────────────────────────
# Postgres
# ─────────────────────────────────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=dailytour

# Per-service DB passwords — must match init-qual/02-roles.sql literals exactly.
SERVICE_DB_PASSWORD_CATALOG=${SERVICE_DB_PASSWORD_CATALOG}
SERVICE_DB_PASSWORD_CHAT=${SERVICE_DB_PASSWORD_CHAT}
SERVICE_DB_PASSWORD_PLANNER=${SERVICE_DB_PASSWORD_PLANNER}
SERVICE_DB_PASSWORD_SEARCH=${SERVICE_DB_PASSWORD_SEARCH}
SERVICE_DB_PASSWORD_INGEST=${SERVICE_DB_PASSWORD_INGEST}
SERVICE_DB_PASSWORD_NOTIF=${SERVICE_DB_PASSWORD_NOTIF}
SERVICE_DB_PASSWORD_MEDIA=${SERVICE_DB_PASSWORD_MEDIA}
SERVICE_DB_PASSWORD_TOKEN=${SERVICE_DB_PASSWORD_TOKEN}
SERVICE_DB_PASSWORD_BFF=${SERVICE_DB_PASSWORD_BFF}
SERVICE_DB_PASSWORD_N8N=${SERVICE_DB_PASSWORD_N8N}

# ─────────────────────────────────────────────────────────────────────────
# JWT signing (T-1.0.1 / T-1.0.2)
# ─────────────────────────────────────────────────────────────────────────
# HS256 shared secret — token-svc SIGNS, BFF VERIFIES. One value, both services.
JWT_SIGNING_KEY=${JWT_SIGNING_KEY}

# Internal BFF -> downstream service URLs (compose-internal hostnames).
TOKEN_SVC_URL=http://dt_token_svc:8088
CATALOG_SVC_URL=http://dt_catalog_svc:8081

# ─────────────────────────────────────────────────────────────────────────
# PWA -> Authentik OIDC authority (T-1.6.1)
# ─────────────────────────────────────────────────────────────────────────
VITE_AUTHENTIK_URL=https://auth.qual.stay.portugalodyssey.pt/application/o/owner-app/

# ─────────────────────────────────────────────────────────────────────────
# BFF -> Authentik owner-app JWT verification (T-1.6.0)
# ─────────────────────────────────────────────────────────────────────────
# Host stays the hyphenated alias authentik-server — Authentik 404s on
# underscore hosts (dt_authentik_server). Internal, so plain http is fine.
AUTHENTIK_JWKS_URL=http://authentik-server:9000/application/o/owner-app/jwks/
AUTHENTIK_OWNER_AUDIENCE=staff

# ─────────────────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASSWORD}

# ─────────────────────────────────────────────────────────────────────────
# RabbitMQ
# ─────────────────────────────────────────────────────────────────────────
RABBITMQ_DEFAULT_USER=dailytour
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
RABBITMQ_URL=${RABBITMQ_URL}

# ─────────────────────────────────────────────────────────────────────────
# MinIO
# ─────────────────────────────────────────────────────────────────────────
MINIO_ROOT_USER=dailytour
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}

# Nightly Postgres backup → MinIO (T-3.B.0, scripts/ops/backup-postgres.sh).
# Plain config (not secrets): target bucket + local retention window in days.
BACKUP_BUCKET=backups
BACKUP_RETENTION_DAYS=7

# ─────────────────────────────────────────────────────────────────────────
# Media service (T-1.4.0)
# ─────────────────────────────────────────────────────────────────────────
# 32+ char secret shared between BFF and media-svc.
MEDIA_SVC_INTERNAL_TOKEN=${MEDIA_SVC_INTERNAL_TOKEN}
MINIO_ENDPOINT=http://dt_minio:9000
MINIO_ACCESS_KEY=dailytour
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}

# ─────────────────────────────────────────────────────────────────────────
# Embeddings (T-2.0.1) — search-svc worker
# ─────────────────────────────────────────────────────────────────────────
# Provider-issued — set before search-svc can embed (worker no-ops while blank).
EMBEDDING_API_KEY=__SET_MANUALLY__
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1024
EMBEDDING_API_BASE_URL=https://api.openai.com/v1

# ─────────────────────────────────────────────────────────────────────────
# Anthropic Messages API (T-3.0.0) — planner-svc
# ─────────────────────────────────────────────────────────────────────────
# Provider-issued — planner-svc short-circuits to None while blank.
ANTHROPIC_API_KEY=__SET_MANUALLY__

# ─────────────────────────────────────────────────────────────────────────
# Telegram (T-4.2.0) — chat-hub Telegram driver
# ─────────────────────────────────────────────────────────────────────────
# Bot token is provider-issued (@BotFather). Webhook secret is self-chosen.
TELEGRAM_BOT_TOKEN=__SET_MANUALLY__
TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}

# ─────────────────────────────────────────────────────────────────────────
# WhatsApp Business API (T-5.6.0) — chat-hub WhatsApp driver
# ─────────────────────────────────────────────────────────────────────────
# Phone-number id / access token / app secret are provider-issued (Meta).
# Verify token is self-chosen.
WHATSAPP_PHONE_NUMBER_ID=__SET_MANUALLY__
WHATSAPP_ACCESS_TOKEN=__SET_MANUALLY__
WHATSAPP_VERIFY_TOKEN=${WHATSAPP_VERIFY_TOKEN}
WHATSAPP_APP_SECRET=__SET_MANUALLY__

# ─────────────────────────────────────────────────────────────────────────
# Traefik
# ─────────────────────────────────────────────────────────────────────────
TRAEFIK_DASHBOARD_PASSWORD=${TRAEFIK_DASHBOARD_PASSWORD}
TRAEFIK_ACME_EMAIL=${ACME_EMAIL}
TRAEFIK_DOMAIN_BASE=qual.stay.portugalodyssey.pt

# ─────────────────────────────────────────────────────────────────────────
# Host port allocations — qual keeps the dev 27xxx block (loopback-internal;
# the qual overlay republishes Traefik separately). Override to relocate.
# ─────────────────────────────────────────────────────────────────────────
DT_HOST_PORT_POSTGRES=27432
DT_HOST_PORT_REDIS=27379
DT_HOST_PORT_RABBITMQ_AMQP=27672
DT_HOST_PORT_RABBITMQ_MGMT=27673
DT_HOST_PORT_MINIO_API=27900
DT_HOST_PORT_MINIO_CONSOLE=27901
DT_HOST_PORT_TRAEFIK_HTTP=27080
DT_HOST_PORT_TRAEFIK_HTTPS=27443
DT_HOST_PORT_TRAEFIK_DASHBOARD=27088
DT_HOST_PORT_BFF=28080

# ─────────────────────────────────────────────────────────────────────────
# Authentik (T-0.3.2)
# ─────────────────────────────────────────────────────────────────────────
AUTHENTIK_SECRET_KEY=${AUTHENTIK_SECRET_KEY}
AUTHENTIK_PG_PASSWORD=${AUTHENTIK_PG_PASSWORD}
AUTHENTIK_BOOTSTRAP_PASSWORD=${AUTHENTIK_BOOTSTRAP_PASSWORD}
AUTHENTIK_BOOTSTRAP_TOKEN=${AUTHENTIK_BOOTSTRAP_TOKEN}
AUTHENTIK_BOOTSTRAP_EMAIL=admin@qual.stay.portugalodyssey.pt
AUTHENTIK_OWNER_APP_CLIENT_SECRET=${AUTHENTIK_OWNER_APP_CLIENT_SECRET}

# ─────────────────────────────────────────────────────────────────────────
# n8n (T-0.3.3)
# ─────────────────────────────────────────────────────────────────────────
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

# ─────────────────────────────────────────────────────────────────────────
# notif-svc (T-5.5.0) — post-stay email dispatch
# ─────────────────────────────────────────────────────────────────────────
# Dev default points at MailHog; point at the real qual relay before go-live.
SMTP_URL=smtp://localhost:1025
SMTP_FROM=no-reply@qual.stay.portugalodyssey.pt
NOTIF_SVC_URL=http://dt_notif_svc:8085
EOF

chmod 600 "$ENV_OUT"

# ── rotated Postgres init dir ──────────────────────────────────────────────────
# init-qual/ replaces init/ wholesale on the qual deploy, so it must be a
# complete init set: copy 00 + 01 verbatim, rotate 02-roles' password literals.
mkdir -p "$INIT_QUAL"
cp "$INIT_SRC/00-extensions.sql" "$INIT_QUAL/00-extensions.sql"
cp "$INIT_SRC/01-schemas.sql"    "$INIT_QUAL/01-schemas.sql"
cp "$INIT_SRC/02-roles.sql"      "$INIT_QUAL/02-roles.sql"

# Map each `change-me-please-<svc>` literal -> the generated DB password.
# Passwords are hex (no sed metacharacters), so `|` is a safe delimiter and the
# replacement is literal. We anchor on the surrounding single-quotes to avoid
# any partial-token surprises.
declare -A ROLE_PW=(
  [catalog]="$SERVICE_DB_PASSWORD_CATALOG"
  [chat]="$SERVICE_DB_PASSWORD_CHAT"
  [planner]="$SERVICE_DB_PASSWORD_PLANNER"
  [search]="$SERVICE_DB_PASSWORD_SEARCH"
  [ingest]="$SERVICE_DB_PASSWORD_INGEST"
  [notif]="$SERVICE_DB_PASSWORD_NOTIF"
  [media]="$SERVICE_DB_PASSWORD_MEDIA"
  [token]="$SERVICE_DB_PASSWORD_TOKEN"
  [bff]="$SERVICE_DB_PASSWORD_BFF"
  [n8n]="$SERVICE_DB_PASSWORD_N8N"
)
for _svc in "${!ROLE_PW[@]}"; do
  sed -i "s|'change-me-please-${_svc}'|'${ROLE_PW[$_svc]}'|g" "$INIT_QUAL/02-roles.sql"
done
# The postgres container (uid 999) bind-mounts init-qual/ and runs the init
# scripts AS that user, so the dir must be traversable + the files readable by
# it — the committed init/ is world-readable; gen-env's umask 077 would instead
# give postgres "Permission denied" listing the dir on first boot. Host-local
# exposure only (VPS, key-only SSH; these passwords already live in .env.qual).
chmod 755 "$INIT_QUAL"
chmod 644 "$INIT_QUAL"/*.sql

# Verify ZERO placeholder literals survive — fail loudly otherwise.
_remaining=$(grep -c 'change-me-please' "$INIT_QUAL/02-roles.sql" || true)
if [[ "$_remaining" -ne 0 ]]; then
  die "$_remaining change-me-please literal(s) still present in $INIT_QUAL/02-roles.sql"
fi

# ── summary ───────────────────────────────────────────────────────────────────
MANUAL_KEYS=(
  ANTHROPIC_API_KEY
  EMBEDDING_API_KEY
  TELEGRAM_BOT_TOKEN
  WHATSAPP_PHONE_NUMBER_ID
  WHATSAPP_ACCESS_TOKEN
  WHATSAPP_APP_SECRET
)
[[ "$ACME_EMAIL" == "$ACME_EMAIL_PLACEHOLDER" ]] && MANUAL_KEYS+=(TRAEFIK_ACME_EMAIL)

cat <<EOF

✓ Wrote $ENV_OUT (600)
✓ Wrote $INIT_QUAL/{00-extensions,01-schemas,02-roles}.sql  (02 rotated, 0 placeholders left)

Generated secrets:
  Infra        POSTGRES_PASSWORD REDIS_PASSWORD RABBITMQ_PASSWORD MINIO_ROOT_PASSWORD (=MINIO_SECRET_KEY)
  Per-svc DB   SERVICE_DB_PASSWORD_{CATALOG,CHAT,PLANNER,SEARCH,INGEST,NOTIF,MEDIA,TOKEN,BFF,N8N}
  Shared app   JWT_SIGNING_KEY MEDIA_SVC_INTERNAL_TOKEN
  Authentik    AUTHENTIK_SECRET_KEY AUTHENTIK_PG_PASSWORD AUTHENTIK_BOOTSTRAP_PASSWORD
               AUTHENTIK_BOOTSTRAP_TOKEN AUTHENTIK_OWNER_APP_CLIENT_SECRET
  Traefik      TRAEFIK_DASHBOARD_PASSWORD
  Webhooks     TELEGRAM_WEBHOOK_SECRET WHATSAPP_VERIFY_TOKEN N8N_ENCRYPTION_KEY

Qual config (fixed):
  TRAEFIK_DOMAIN_BASE=qual.stay.portugalodyssey.pt   TRAEFIK_ACME_EMAIL=${ACME_EMAIL}
  VITE_AUTHENTIK_URL=https://auth.qual.stay.portugalodyssey.pt/...
  AUTHENTIK_JWKS_URL=http://authentik-server:9000/...   AUTHENTIK_OWNER_AUDIENCE=staff

⚠ Fill in manually (provider-issued — not generated):
EOF
for _k in "${MANUAL_KEYS[@]}"; do echo "    $_k"; done
cat <<EOF

Next:
  1. Edit $ENV_OUT and replace each __SET_MANUALLY__ value (and __SET_ACME_EMAIL__ if shown above).
  2. Deploy with the qual overlay (mounts infra/postgres/init-qual/ as the Postgres init dir).

Reminder: $ENV_OUT and $INIT_QUAL/ are gitignored. NEVER commit them.
EOF
