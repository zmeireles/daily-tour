#!/usr/bin/env bash
# Daily Tour dev test-token minter.
# Mints a fresh opaque token against the seeded fixture reservation
# (services/token-svc/src/seed/run.ts), prints the /r/:token URL, and
# tries to open it in the default browser.
#
# Usage:
#   bash scripts/dev/dev-token.sh              # EN guest (2026-06-05 checkout)
#   bash scripts/dev/dev-token.sh pt           # PT guest (2026-07-15 checkout)
#   bash scripts/dev/dev-token.sh --no-open    # Print URL only, don't xdg-open
#
# Why this exists:
#   Tokens are opaque + only revealed at mint time. Each PWA test session
#   normally requires a curl + jq dance against token-svc. This bundles it
#   into one command. Tokens stay valid until reservation.checkout + 24h,
#   so the printed URL is reusable for ~14 days for the EN fixture.

set -u
set -o pipefail

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
info() { echo "${BLUE}ℹ${RESET}  $*"; }
pass() { echo "${GREEN}✓${RESET} $*"; }
fail() { echo "${RED}✗${RESET}  $*"; exit 1; }
warn() { echo "${YELLOW}⚠${RESET}  $*"; }

# Fixture UUIDs from services/token-svc/src/seed/run.ts
FIXTURE_EN="ccc00001-0000-4000-c000-000000000001"
FIXTURE_PT="ccc00001-0000-4000-c000-000000000002"

LOCALE="en"
OPEN_BROWSER=1
PWA_BASE_URL="${PWA_BASE_URL:-http://localhost:5173}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    en) LOCALE="en"; shift ;;
    pt|pt-pt|pt-PT) LOCALE="pt"; shift ;;
    --no-open) OPEN_BROWSER=0; shift ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) fail "unknown arg: $1 — use 'en', 'pt', or '--no-open'" ;;
  esac
done

case "$LOCALE" in
  en) RESERVATION_ID="$FIXTURE_EN" ;;
  pt) RESERVATION_ID="$FIXTURE_PT" ;;
esac

if ! docker ps --format '{{.Names}}' | grep -q '^dt_bff$'; then
  fail "dt_bff isn't running — start the stack with scripts/dev/dev-up.sh first"
fi

info "minting token for reservation $RESERVATION_ID (locale=$LOCALE)…"
MINT_RESP=$(docker exec dt_bff wget -qO- \
  --post-data='{}' \
  --header='Content-Type: application/json' \
  "http://token-svc:8088/v1/reservations/$RESERVATION_ID/token" 2>&1) \
  || fail "token-svc mint call failed: $MINT_RESP"

TOKEN=$(echo "$MINT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")
EXPIRES_AT=$(echo "$MINT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('expires_at',''))" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  fail "token mint returned no token. Raw response: $MINT_RESP"
fi

URL="$PWA_BASE_URL/r/$TOKEN"

pass "token minted (preview: ${TOKEN:0:12}…)"
info "expires_at: $EXPIRES_AT"
echo ""
echo "  ${GREEN}${URL}${RESET}"
echo ""

if [[ $OPEN_BROWSER -eq 1 ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    info "opening in default browser via xdg-open…"
    xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    info "opening in default browser via open…"
    open "$URL" >/dev/null 2>&1 &
  else
    warn "no xdg-open/open found — copy the URL above manually."
  fi
fi
