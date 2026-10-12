#!/usr/bin/env bash
# backup-postgres.sh — nightly logical backup of both Postgres clusters → Garage (S3).
# (T-3.B.0)
#
# Runs ON THE QUAL HOST from /opt/daily-tour (needs docker access). Dumps the
# main cluster (dt_postgres / dailytour — one logical DB, all 11 schemas) and the
# Authentik cluster (dt_authentik_postgres / authentik) with `pg_dump -Fc -Z 9`,
# then uploads both into the private `backups` bucket on the in-cluster Garage
# (pinned amazon/aws-cli) and prunes anything older than the retention window
# (pinned rclone).
#
# Secret handling: the S3 secret key is NEVER interpolated onto a command line.
# Only the MINIO_ACCESS_KEY / MINIO_SECRET_KEY lines are extracted into 0600 temp
# files inside $WORKDIR (renamed to AWS_* / RCLONE_CONFIG_GARAGE_*) and handed to
# the tool containers via `docker run --env-file` (docker parses KEY=VALUE
# directly — no shell sourcing, robust to special chars, and no other .env.qual
# secret reaches the container). The endpoint host must be `minio` (the network
# alias; NOT the `dt_garage` container name — underscores are invalid hostnames).
#
# Usage:
#   scripts/ops/backup-postgres.sh
#
# Config (env, with defaults):
#   BACKUP_BUCKET           bucket name                 (default: backups)
#   BACKUP_RETENTION_DAYS   prune objects older than N  (default: 7)
#   AWS_CLI_IMAGE           pinned aws-cli image        (default: see below)
#   RCLONE_IMAGE            pinned rclone image         (default: see below)
#   S3_ENDPOINT             S3 endpoint inside dt_internal (default: http://minio:3900)
#   ENV_FILE                path to the qual env file   (default: /opt/daily-tour/.env.qual)
#
# Exits non-zero on ANY failure so a scheduler/alert wrapper can catch it.
set -euo pipefail

TS=$(date -u +%Y%m%dT%H%M%SZ)

BACKUP_BUCKET="${BACKUP_BUCKET:-backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
AWS_CLI_IMAGE="${AWS_CLI_IMAGE:-amazon/aws-cli:2.34.0@sha256:97cc5f847898f54432492c128408c62e0df2153d9ad36573be8e5a03826123b0}"
RCLONE_IMAGE="${RCLONE_IMAGE:-rclone/rclone:1.74.0@sha256:d2e0e88359d0b2e67cfcd2c43d5405185eb8adfc207079df27c42da82c5207bc}"
S3_ENDPOINT="${S3_ENDPOINT:-http://minio:3900}"
ENV_FILE="${ENV_FILE:-/opt/daily-tour/.env.qual}"
S3_NETWORK="${S3_NETWORK:-dt_internal}"

# Container + DB coordinates (fixed by the qual compose stack).
MAIN_CONTAINER="dt_postgres"
MAIN_USER="postgres"
MAIN_DB="dailytour"
AUTHENTIK_CONTAINER="dt_authentik_postgres"
AUTHENTIK_USER="authentik"
AUTHENTIK_DB="authentik"

log() { echo "[backup-postgres] $*"; }
die() { echo "[backup-postgres] ERROR: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "env file not found: $ENV_FILE"
command -v docker >/dev/null 2>&1 || die "docker not found on PATH"

# Host-local scratch dir; wiped on every exit so no dump ever lingers on disk.
WORKDIR=$(mktemp -d /tmp/dt-pg-backup.XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

# dump_cluster <container> <user> <db> <local-basename>
# Dumps inside the container to /tmp, copies the file out to $WORKDIR, then
# removes the in-container copy. Custom format (-Fc) + max compression (-Z 9).
dump_cluster() {
  local container="$1" user="$2" db="$3" base="$4"
  local in_path="/tmp/${base}.dump"

  log "dumping ${db} from ${container} ..."
  docker exec "$container" pg_dump -U "$user" -d "$db" -Fc -Z 9 -f "$in_path"
  docker cp "${container}:${in_path}" "${WORKDIR}/${base}.dump"
  docker exec "$container" rm -f "$in_path"
}

dump_cluster "$MAIN_CONTAINER"      "$MAIN_USER"      "$MAIN_DB"      "dailytour-${TS}"
dump_cluster "$AUTHENTIK_CONTAINER" "$AUTHENTIK_USER" "$AUTHENTIK_DB" "authentik-${TS}"

log "local dumps ready:"
ls -lh "$WORKDIR"

# ── upload (aws-cli) + retention (rclone) ─────────────────────────────────────
# Only the S3 key pair crosses the boundary, via a 0600 --env-file whose lines
# are renamed to what each tool reads; $BUCKET/$RET cross as plain (non-secret)
# env vars. The two tools are separate pinned images on purpose: aws-cli has no
# age-based delete, rclone has `delete --min-age`.
#   WHEN_REQUIRED checksums: Garage rejects the CRC32 trailer aws-cli v2 adds by
#   default (400 InvalidDigest) — same cause as media-svc's S3Client option.
S3_ENV="$WORKDIR/s3-env"
sed -n -e 's/^MINIO_ACCESS_KEY=/AWS_ACCESS_KEY_ID=/p' \
       -e 's/^MINIO_SECRET_KEY=/AWS_SECRET_ACCESS_KEY=/p' "$ENV_FILE" > "$S3_ENV"
chmod 600 "$S3_ENV"
[ "$(wc -l < "$S3_ENV")" -eq 2 ] || die "MINIO_ACCESS_KEY/MINIO_SECRET_KEY not found in $ENV_FILE"
{
  echo "AWS_DEFAULT_REGION=us-east-1"
  echo "AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED"
  echo "AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED"
} >> "$S3_ENV"

log "uploading to ${BACKUP_BUCKET} via ${AWS_CLI_IMAGE} ..."
docker run --rm \
  --network "$S3_NETWORK" \
  -v "$WORKDIR:/dumps:ro" \
  --env-file "$S3_ENV" \
  -e BUCKET="$BACKUP_BUCKET" \
  -e ENDPOINT="$S3_ENDPOINT" \
  --entrypoint sh \
  "$AWS_CLI_IMAGE" \
  -c '
    set -eu
    # Private bucket — nothing here ever grants public access. garage-init
    # creates it; the fallback keeps a hand-rolled store working.
    aws --endpoint-url "$ENDPOINT" s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1 \
      || aws --endpoint-url "$ENDPOINT" s3 mb "s3://$BUCKET"
    # An empty dump uploads "successfully"; refuse it so the run fails loudly.
    for f in /dumps/dailytour-*.dump; do
      [ -s "$f" ] || { echo "[backup-postgres] FAIL: empty or missing dump: $f" >&2; exit 1; }
      aws --endpoint-url "$ENDPOINT" s3 cp "$f" "s3://$BUCKET/postgres/main/$(basename "$f")"
    done
    for f in /dumps/authentik-*.dump; do
      [ -s "$f" ] || { echo "[backup-postgres] FAIL: empty or missing dump: $f" >&2; exit 1; }
      aws --endpoint-url "$ENDPOINT" s3 cp "$f" "s3://$BUCKET/postgres/authentik/$(basename "$f")"
    done
    echo "[backup-postgres] uploaded objects:"
    aws --endpoint-url "$ENDPOINT" s3 ls --recursive "s3://$BUCKET/postgres/"
  '

# Retention: prune dumps older than the window. `|| true` so an empty/young
# prefix never fails the whole run (same as the old `mc rm ... || true`).
log "pruning dumps older than ${BACKUP_RETENTION_DAYS}d via ${RCLONE_IMAGE} ..."
RCLONE_ENV="$WORKDIR/rclone-env"
sed -n -e 's/^MINIO_ACCESS_KEY=/RCLONE_CONFIG_GARAGE_ACCESS_KEY_ID=/p' \
       -e 's/^MINIO_SECRET_KEY=/RCLONE_CONFIG_GARAGE_SECRET_ACCESS_KEY=/p' "$ENV_FILE" > "$RCLONE_ENV"
chmod 600 "$RCLONE_ENV"
{
  echo "RCLONE_CONFIG_GARAGE_TYPE=s3"
  echo "RCLONE_CONFIG_GARAGE_PROVIDER=Other"
  echo "RCLONE_CONFIG_GARAGE_REGION=us-east-1"
  echo "RCLONE_CONFIG_GARAGE_ENDPOINT=${S3_ENDPOINT}"
} >> "$RCLONE_ENV"
for prefix in postgres/main postgres/authentik; do
  docker run --rm --network "$S3_NETWORK" --env-file "$RCLONE_ENV" "$RCLONE_IMAGE" \
    delete --min-age "${BACKUP_RETENTION_DAYS}d" "garage:${BACKUP_BUCKET}/${prefix}/" || true
done

log "backup complete: postgres/main/dailytour-${TS}.dump + postgres/authentik/authentik-${TS}.dump"
