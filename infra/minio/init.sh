#!/bin/sh
# MinIO bucket bootstrap. Idempotent — safe to re-run.
# Runs in the mc client container as a one-shot Compose service.
set -eu

ALIAS="dailytour"
ENDPOINT="http://minio:9000"

echo "[minio-init] Waiting for MinIO to accept connections at ${ENDPOINT}..."
i=0
until mc alias set "${ALIAS}" "${ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "${i}" -gt 30 ]; then
    echo "[minio-init] FAIL: MinIO did not become reachable after 30s." >&2
    exit 1
  fi
  sleep 1
done
echo "[minio-init] Connected as alias '${ALIAS}'."

for bucket in media-place media-owner media-tour daily-tour-media; do
  if mc ls "${ALIAS}/${bucket}" >/dev/null 2>&1; then
    echo "[minio-init] Bucket exists: ${bucket}"
  else
    mc mb "${ALIAS}/${bucket}"
    echo "[minio-init] Created bucket: ${bucket}"
  fi
  # public/ prefix is anonymously readable so the PWA can fetch place media
  # without signed URLs once T-1.4.x media-svc is wired in.
  mc anonymous set download "${ALIAS}/${bucket}/public/" >/dev/null 2>&1 || true
done

# Private bucket — created idempotently, NO anonymous policy. The `backups`
# bucket holds Postgres dumps (T-3.B.0, scripts/ops/backup-postgres.sh) and must
# never be publicly readable. (Add further private buckets here the same way.)
mc mb --ignore-existing "${ALIAS}/backups"
echo "[minio-init] Private bucket ready: backups"

echo "[minio-init] Buckets ready: media-place, media-owner, media-tour, daily-tour-media, backups (private)"
