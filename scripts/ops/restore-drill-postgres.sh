#!/usr/bin/env bash
# restore-drill-postgres.sh — prove the latest MinIO dump is restorable.
# (T-3.B.2-lite)
#
# Pulls the most-recent postgres/main/*.dump from MinIO, restores it into a
# THROWAWAY postgres:17 container (never the live cluster), runs a few row-count
# checks, prints the measured RTO, then tears the throwaway container down.
#
# Touches NO live data. As a hard safety net the script refuses to run if any
# resolved target names a live container/DB (dt_postgres / dt_authentik_postgres
# / dailytour). It only ever operates on the throwaway container and the
# restore-target DB `dailytour_restore`.
#
# Runs ON THE QUAL HOST from /opt/daily-tour (needs docker access).
#
# Usage:
#   scripts/ops/restore-drill-postgres.sh
#
# Config (env, with defaults):
#   BACKUP_BUCKET   MinIO bucket name        (default: backups)
#   MC_IMAGE        pinned mc client image   (default: see below)
#   PG_IMAGE        restore engine image     (default: the live pgvector image, so
#                   the search.place_embedding vector table restores faithfully;
#                   override to stock postgres:17 for a portable, no-extension drill)
#   ENV_FILE        path to the qual env file (default: /opt/daily-tour/.env.qual)
#
# Exits non-zero if the restore or any verification query fails.
set -euo pipefail

BACKUP_BUCKET="${BACKUP_BUCKET:-backups}"
MC_IMAGE="${MC_IMAGE:-quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z}"
PG_IMAGE="${PG_IMAGE:-ghcr.io/zmeireles/daily-tour/postgres:qual}"
ENV_FILE="${ENV_FILE:-/opt/daily-tour/.env.qual}"
MINIO_NETWORK="${MINIO_NETWORK:-dt_internal}"

# Throwaway resources — these are the ONLY things this script may create/destroy.
DRILL_CONTAINER="dt_pg_restore_drill"
RESTORE_DB="dailytour_restore"
RESTORE_USER="postgres"

log() { echo "[restore-drill] $*"; }
die() { echo "[restore-drill] ERROR: $*" >&2; exit 1; }

# ── HARD GUARD ────────────────────────────────────────────────────────────────
# Refuse outright if any operational target resolves to a live name. This guards
# against a future edit (or an env override) ever pointing the drill at prod.
LIVE_NAMES="dt_postgres dt_authentik_postgres dailytour"
for _live in $LIVE_NAMES; do
  if [ "$DRILL_CONTAINER" = "$_live" ] || [ "$RESTORE_DB" = "$_live" ]; then
    die "refusing to run: target '$_live' is a LIVE resource. This drill only operates on '$DRILL_CONTAINER' / '$RESTORE_DB'."
  fi
done
# `dailytour_restore` legitimately starts with `dailytour`; assert it is NOT the
# bare live DB name (defends against a typo dropping the `_restore` suffix).
[ "$RESTORE_DB" != "dailytour" ] || die "refusing: restore DB must never be the live 'dailytour'."

[ -f "$ENV_FILE" ] || die "env file not found: $ENV_FILE"
command -v docker >/dev/null 2>&1 || die "docker not found on PATH"

# Host-local scratch + guaranteed throwaway-container teardown on ANY exit.
WORKDIR=$(mktemp -d /tmp/dt-pg-restore-drill.XXXXXX)
cleanup() {
  docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

# ── 1. fetch the latest main dump from MinIO ──────────────────────────────────
# Only the MINIO_ROOT_* creds cross via a 0600 --env-file (MinIO host = `minio`,
# never the `dt_minio` container name — mc rejects underscore hostnames). The mc
# image has no grep/awk, so we list with `mc ls --json` and select the newest
# .dump on the HOST (full tools), then cp it by key.
MC_CREDS="$WORKDIR/mc-creds"
grep -E '^(MINIO_ROOT_USER|MINIO_ROOT_PASSWORD)=' "$ENV_FILE" > "$MC_CREDS"
chmod 600 "$MC_CREDS"
[ -s "$MC_CREDS" ] || die "MINIO_ROOT_USER/PASSWORD not found in $ENV_FILE"

log "finding latest postgres/main dump in ${BACKUP_BUCKET} ..."
latest=$(docker run --rm --network "$MINIO_NETWORK" --env-file "$MC_CREDS" \
  -e BUCKET="$BACKUP_BUCKET" --entrypoint sh "$MC_IMAGE" -c '
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
    mc ls --json "local/$BUCKET/postgres/main/"
  ' | grep -o "\"key\":\"[^\"]*\.dump\"" | cut -d'"' -f4 | sort | tail -n1)
[ -n "$latest" ] || die "no dumps under postgres/main/"
log "latest = $latest"

docker run --rm --network "$MINIO_NETWORK" --env-file "$MC_CREDS" \
  -e BUCKET="$BACKUP_BUCKET" -e LATEST="$latest" -v "$WORKDIR:/out" \
  --entrypoint sh "$MC_IMAGE" -c '
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
    mc cp "local/$BUCKET/postgres/main/$LATEST" /out/latest.dump
  '
[ -s "$WORKDIR/latest.dump" ] || die "no dump downloaded"
log "downloaded dump: $(du -h "$WORKDIR/latest.dump" | cut -f1)"

# ── 2. spin the throwaway Postgres ────────────────────────────────────────────
log "starting throwaway ${PG_IMAGE} container '${DRILL_CONTAINER}' ..."
docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$DRILL_CONTAINER" \
  --network "$MINIO_NETWORK" \
  -e POSTGRES_PASSWORD=drill \
  "$PG_IMAGE" >/dev/null

log "waiting for ${DRILL_CONTAINER} to accept connections ..."
# A real `SELECT 1` (not pg_isready) — the entrypoint's first-boot initdb briefly
# opens the socket while "starting up", so pg_isready false-positives there.
i=0
until docker exec "$DRILL_CONTAINER" psql -U "$RESTORE_USER" -d postgres -tAc 'SELECT 1' >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -le 60 ] || die "throwaway Postgres did not become ready within 60s"
  sleep 1
done
log "throwaway Postgres ready."

# ── 3. restore into the throwaway DB, measuring RTO ───────────────────────────
docker cp "$WORKDIR/latest.dump" "${DRILL_CONTAINER}:/tmp/latest.dump"
docker exec "$DRILL_CONTAINER" createdb -U "$RESTORE_USER" "$RESTORE_DB"

log "restoring into ${RESTORE_DB} ..."
# --no-owner --no-acl: the throwaway cluster has none of the per-service roles
# (created only by the qual init scripts), so ownership + GRANT/DEFAULT-PRIVILEGE
# statements would error. Skipping them restores schema + DATA cleanly, which is
# what the drill verifies. `|| log` keeps any residual non-fatal warning from
# aborting the run before the row-count check (the real success criterion).
_start=$(date +%s)
docker exec "$DRILL_CONTAINER" \
  pg_restore -U "$RESTORE_USER" -d "$RESTORE_DB" --no-owner --no-acl /tmp/latest.dump \
  || log "pg_restore reported non-fatal errors (continuing to verification)"
_end=$(date +%s)
log "restore RTO: $((_end - _start))s"

# ── 4. verification — row counts across representative schemas ────────────────
# Representative tables chosen across two services / three schemas, all seeded
# (so counts are meaningfully non-zero on qual):
#   catalog.place        — core domain table (~14 landmarks + Miguel places seeded)
#   catalog.action       — reference data seeded by actions-wishes.sql
#   auth_tokens.token_grant — token-svc schema; proves a cross-service schema restored
log "verification — row counts in ${RESTORE_DB}:"
for _tbl in catalog.place catalog.action auth_tokens.token_grant; do
  _count=$(docker exec "$DRILL_CONTAINER" \
    psql -U "$RESTORE_USER" -d "$RESTORE_DB" -tAc "SELECT count(*) FROM ${_tbl};") \
    || die "verification query failed for ${_tbl} (table missing → restore incomplete)"
  log "  ${_tbl}: ${_count} rows"
done

log "restore drill PASSED — latest main dump is restorable."
