#!/usr/bin/env bash
# backup-postgres.sh — nightly logical backup of both Postgres clusters → MinIO.
# (T-3.B.0)
#
# Runs ON THE QUAL HOST from /opt/daily-tour (needs docker access). Dumps the
# main cluster (dt_postgres / dailytour — one logical DB, all 11 schemas) and the
# Authentik cluster (dt_authentik_postgres / authentik) with `pg_dump -Fc -Z 9`,
# then uploads both into the private `backups` bucket on the in-cluster MinIO and
# prunes anything older than the retention window.
#
# Secret handling: the 48-char MINIO_ROOT_PASSWORD is NEVER interpolated onto a
# command line. Only the two MINIO_ROOT_* lines are extracted into a 0600 temp
# file inside $WORKDIR and handed to the mc container via `docker run --env-file`
# (docker parses KEY=VALUE directly — no shell sourcing, robust to special chars,
# and no other .env.qual secret reaches the container). The MinIO host must be
# `minio` (NOT the `dt_minio` container name — underscores are invalid hostnames
# and mc rejects them with "invalid hostname").
#
# Usage:
#   scripts/ops/backup-postgres.sh
#
# Config (env, with defaults):
#   BACKUP_BUCKET           MinIO bucket name           (default: backups)
#   BACKUP_RETENTION_DAYS   prune objects older than N  (default: 7)
#   MC_IMAGE                pinned mc client image      (default: see below)
#   ENV_FILE                path to the qual env file   (default: /opt/daily-tour/.env.qual)
#
# Exits non-zero on ANY failure so a scheduler/alert wrapper can catch it.
set -euo pipefail

TS=$(date -u +%Y%m%dT%H%M%SZ)

BACKUP_BUCKET="${BACKUP_BUCKET:-backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
MC_IMAGE="${MC_IMAGE:-quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z}"
ENV_FILE="${ENV_FILE:-/opt/daily-tour/.env.qual}"
MINIO_NETWORK="${MINIO_NETWORK:-dt_internal}"

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

# ── upload + retention, inside one mc container ───────────────────────────────
# Only the MINIO_ROOT_* creds cross the boundary, via a 0600 --env-file; $BUCKET/
# $RET cross as plain (non-secret) env vars. Everything below `-c` runs in mc.
MC_CREDS="$WORKDIR/mc-creds"
grep -E '^(MINIO_ROOT_USER|MINIO_ROOT_PASSWORD)=' "$ENV_FILE" > "$MC_CREDS"
chmod 600 "$MC_CREDS"
[ -s "$MC_CREDS" ] || die "MINIO_ROOT_USER/PASSWORD not found in $ENV_FILE"
log "uploading to ${BACKUP_BUCKET} via ${MC_IMAGE} ..."
docker run --rm \
  --network "$MINIO_NETWORK" \
  -v "$WORKDIR:/dumps:ro" \
  --env-file "$MC_CREDS" \
  -e BUCKET="$BACKUP_BUCKET" \
  -e RET="$BACKUP_RETENTION_DAYS" \
  --entrypoint sh \
  "$MC_IMAGE" \
  -c '
    set -eu
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
    # Private bucket — deliberately NO `mc anonymous set`; backups stay closed.
    mc mb --ignore-existing "local/$BUCKET"
    mc cp /dumps/dailytour-*.dump "local/$BUCKET/postgres/main/"
    mc cp /dumps/authentik-*.dump "local/$BUCKET/postgres/authentik/"
    echo "[backup-postgres] uploaded objects:"
    mc ls --recursive "local/$BUCKET/postgres/"
    # Retention: prune dumps older than the window. `|| true` so an empty/young
    # prefix never fails the whole run.
    mc rm --recursive --force --older-than "${RET}d" "local/$BUCKET/postgres/main/" || true
    mc rm --recursive --force --older-than "${RET}d" "local/$BUCKET/postgres/authentik/" || true
  '

log "backup complete: postgres/main/dailytour-${TS}.dump + postgres/authentik/authentik-${TS}.dump"
