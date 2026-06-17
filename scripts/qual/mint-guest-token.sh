#!/usr/bin/env bash
# Mint a guest redeem link for the qual environment.
#
# Runs ON the qual VPS — `make qual-token` pipes it over SSH (`bash -s`), so it
# does NOT need to be pre-deployed to the box. It picks the still-valid
# reservation with the furthest checkout (the redeem token's lifetime tracks the
# reservation checkout), mints an opaque redeem token via token-svc on the
# internal docker network (reached from the bff container), and prints the full
# guest URL:  https://<QUAL_HOST>/r/<token>
#
# Override the apex with QUAL_HOST=... if it ever changes.
set -euo pipefail

QUAL_HOST="${QUAL_HOST:-qual.stay.portugalodyssey.pt}"

# Furthest-checkout confirmed reservation that hasn't passed checkout — token-svc
# returns 410 Gone for past-checkout reservations, and DESC gives the longest-
# lived token.
RES=$(docker exec dt_postgres psql -U postgres -d dailytour -tA -c \
  "SELECT id FROM auth_tokens.reservation
   WHERE status = 'confirmed' AND checkout >= CURRENT_DATE
   ORDER BY checkout DESC LIMIT 1")

if [[ -z "$RES" ]]; then
  echo "qual-token: no confirmed, future-checkout reservation found on qual" >&2
  exit 1
fi

# Mint via token-svc (internal :8088). The bff container can reach it on the
# compose network and ships busybox wget.
RESP=$(docker exec dt_bff wget -qO- \
  --post-data='{}' --header='content-type: application/json' \
  "http://dt_token_svc:8088/v1/reservations/${RES}/token")

TOKEN=$(printf '%s' "$RESP" | sed -nE 's/.*"token":"([^"]+)".*/\1/p')
if [[ -z "$TOKEN" ]]; then
  echo "qual-token: mint failed — $RESP" >&2
  exit 1
fi

echo "https://${QUAL_HOST}/r/${TOKEN}"
