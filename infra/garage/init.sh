#!/bin/sh
# Garage bootstrap — layout, S3 key, buckets. Idempotent: runs on every `up`.
#
# WHY THE ADMIN API AND NOT THE `garage` CLI: the dxflrs/garage image is
# FROM scratch (no /bin/sh), so a conditional script cannot run inside it, and
# the CLI has no "create if missing" flags (key import / bucket create fail on
# re-run). Mounting the docker socket to `exec` into it is rejected on
# purpose. Instead this one-shot runs in a pinned alpine (busybox wget + sh,
# nothing to install at runtime — qual is cache-only) and drives Garage's
# admin API on :3903 with the admin token. Every step is guarded by a read.
#
# Env (from compose): GARAGE_ADMIN_TOKEN, S3_ACCESS_KEY, S3_SECRET_KEY,
#                     GARAGE_ADMIN_URL (default http://garage:3903),
#                     GARAGE_CAPACITY_GB (default 20; layout capacity only, not a quota)
set -eu

API="${GARAGE_ADMIN_URL:-http://garage:3903}/v2"
CAP_BYTES=$(( ${GARAGE_CAPACITY_GB:-20} * 1000000000 ))
BUCKETS="media-place media-owner media-tour daily-tour-media backups"
AUTH="Authorization: Bearer ${GARAGE_ADMIN_TOKEN}"
BODY=/tmp/body.json
log() { echo "[garage-init] $*"; }

# GET <path> → stdout; non-zero exit on any non-2xx.
api_get() { wget -q -O - --header "$AUTH" "${API}/$1"; }
# POST <path> <json> → stdout. JSON goes through a file so secrets never
# appear in the process argument list.
api_post() {
  printf '%s' "$2" > "$BODY"
  wget -q -O - --header "$AUTH" --header 'Content-Type: application/json' \
    --post-file "$BODY" "${API}/$1"
}
# First JSON string value for a key in pretty-printed output.
json_str() { sed -n "s/^ *\"$1\": *\"\([^\"]*\)\".*/\1/p" | head -n 1; }
json_num() { sed -n "s/^ *\"$1\": *\([0-9][0-9]*\).*/\1/p" | head -n 1; }

[ -n "${GARAGE_ADMIN_TOKEN:-}" ] && [ -n "${S3_ACCESS_KEY:-}" ] && [ -n "${S3_SECRET_KEY:-}" ] \
  || { echo "[garage-init] FAIL: GARAGE_ADMIN_TOKEN / S3_ACCESS_KEY / S3_SECRET_KEY must be set" >&2; exit 1; }

log "waiting for the admin API at ${API} ..."
i=0
until status=$(api_get GetClusterStatus 2>/dev/null); do
  i=$((i + 1))
  [ "$i" -le 60 ] || { echo "[garage-init] FAIL: Garage admin API not reachable after 60s" >&2; exit 1; }
  sleep 1
done

# ── 1. cluster layout (single node, zone dc1) ────────────────────────────────
layout_version=$(printf '%s\n' "$status" | json_num layoutVersion)
if [ "${layout_version:-0}" -ge 1 ]; then
  log "layout already applied (version ${layout_version})"
else
  node_id=$(printf '%s\n' "$status" | json_str id)
  [ -n "$node_id" ] || { echo "[garage-init] FAIL: cannot read node id" >&2; exit 1; }
  api_post UpdateClusterLayout \
    "{\"roles\":[{\"id\":\"${node_id}\",\"zone\":\"dc1\",\"capacity\":${CAP_BYTES},\"tags\":[]}]}" >/dev/null
  api_post ApplyClusterLayout '{"version":1}' >/dev/null
  log "layout assigned + applied (node ${node_id%"${node_id#????????}"}…, version 1)"
fi

# Reads on buckets/keys are only served once the layout is live.
i=0
until wget -q -O /dev/null "${API%/v2}/health" 2>/dev/null; do
  i=$((i + 1))
  [ "$i" -le 30 ] || { echo "[garage-init] FAIL: cluster not healthy after layout apply" >&2; exit 1; }
  sleep 1
done

# ── 2. S3 key — import the EXISTING access/secret pair unchanged ─────────────
if api_get "GetKeyInfo?id=${S3_ACCESS_KEY}" >/dev/null 2>&1; then
  log "key present: ${S3_ACCESS_KEY}"
else
  api_post ImportKey \
    "{\"name\":\"media-svc\",\"accessKeyId\":\"${S3_ACCESS_KEY}\",\"secretAccessKey\":\"${S3_SECRET_KEY}\"}" >/dev/null
  log "key imported: ${S3_ACCESS_KEY}"
fi

# ── 3. buckets + read/write/owner for that key (AllowBucketKey is idempotent) ─
for bucket in $BUCKETS; do
  if info=$(api_get "GetBucketInfo?globalAlias=${bucket}" 2>/dev/null); then
    log "bucket exists: ${bucket}"
  else
    info=$(api_post CreateBucket "{\"globalAlias\":\"${bucket}\"}")
    log "bucket created: ${bucket}"
  fi
  bucket_id=$(printf '%s\n' "$info" | json_str id)
  [ -n "$bucket_id" ] || { echo "[garage-init] FAIL: no id for bucket ${bucket}" >&2; exit 1; }
  api_post AllowBucketKey \
    "{\"bucketId\":\"${bucket_id}\",\"accessKeyId\":\"${S3_ACCESS_KEY}\",\"permissions\":{\"read\":true,\"write\":true,\"owner\":true}}" >/dev/null
done

# NOTE (behaviour change vs MinIO): the old init set anonymous download on the
# public/ prefix of the media buckets. Garage has no per-prefix anonymous policy
# and the app serves media via presigned GETs (media-svc), so the buckets stay
# private; `backups` was always private.
log "ready: ${BUCKETS}"
