#!/usr/bin/env bash
# Daily Tour dev smoke — exercises a guest journey end-to-end.
# Run after `scripts/dev/dev-up.sh` returns 0.
#
# Calls go through `docker compose exec bff wget …` so they hit the
# internal compose network — the app-tier services are intentionally
# unpublished to the host. BusyBox wget ships in the alpine runtime
# images, so no extra tooling is required.

set -u
set -o pipefail

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
pass()  { echo "${GREEN}✓${RESET} $*"; }
fail()  { echo "${RED}✗ FAIL${RESET}: $*"; exit 1; }
warn()  { echo "${YELLOW}⚠${RESET}  $*"; }
info()  { echo "${BLUE}ℹ${RESET}  $*"; }
step()  { echo ""; echo "${BLUE}━━━ $* ━━━${RESET}"; }

cd "$(dirname "$0")/../.." || exit 1
COMPOSE_BASE="--env-file .env -f infra/compose/docker-compose.base.yml"
COMPOSE_APP="-f infra/compose/docker-compose.app.yml"
COMPOSE_ALL="$COMPOSE_BASE $COMPOSE_APP"

# Verify the bridge container is running — every wget call goes through it.
if ! docker compose $COMPOSE_ALL ps bff --status running --quiet | grep -q .; then
  fail "bff is not running — start the stack with scripts/dev/dev-up.sh first"
fi

# Wget calls run inside `bff` so they reach the dt_internal network.
# Service names resolve via compose's embedded DNS.
internal_wget() {
  docker compose $COMPOSE_ALL exec -T bff wget -qO- "$@"
}

# Internal endpoints (compose service:container_port). Resolving by service
# name (not localhost) sidesteps the IPv6/IPv4 mismatch inside the alpine
# runtime — `localhost` maps to ::1, but fastify binds 0.0.0.0 only.
TOKEN_SVC="http://token-svc:8088"
BFF="http://bff:8080"

info "Smoking via internal network: dt_bff → {token-svc, bff}"

# ─── Step 1: catalog-svc has 28 places ─────────────────────────────────────────
step "Step 1 — catalog-svc has 28 seeded places"
PLACE_COUNT=$(docker compose $COMPOSE_BASE exec -T postgres psql -U postgres -d dailytour -t -c "SELECT count(*) FROM catalog.place;" 2>/dev/null | tr -d ' \n')
if [[ "$PLACE_COUNT" == "28" ]]; then
  pass "28 places in catalog"
else
  fail "expected 28 places, got: '$PLACE_COUNT'"
fi

# ─── Step 2: mint a test token ─────────────────────────────────────────────────
step "Step 2 — mint test token for fixture reservation"
# Fixed UUID from services/token-svc/src/seed/run.ts — EN guest, checkout 2026-06-05.
RESERVATION_ID="ccc00001-0000-4000-c000-000000000001"

MINT_RESP=$(internal_wget --post-data='{}' --header='Content-Type: application/json' "$TOKEN_SVC/v1/reservations/$RESERVATION_ID/token" 2>&1) || true
TOKEN=$(echo "$MINT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [[ -n "$TOKEN" ]]; then
  pass "token minted: ${TOKEN:0:20}…"
else
  warn "mint response: $MINT_RESP"
  fail "token-svc /v1/reservations/:id/token did not return a token (is the fixture seeded? run pnpm --filter token-svc seed)"
fi

# ─── Step 3: exchange token via BFF ────────────────────────────────────────────
step "Step 3 — exchange token via BFF /r/:token"
EXCHANGE_RESP=$(internal_wget "$BFF/r/$TOKEN" 2>&1) || true
if echo "$EXCHANGE_RESP" | grep -q "jwt\|JWT\|token"; then
  JWT=$(echo "$EXCHANGE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jwt',''))" 2>/dev/null || echo "")
  if [[ -n "$JWT" ]]; then
    pass "JWT received: ${JWT:0:30}…"
  else
    warn "exchange response: $EXCHANGE_RESP"
    fail "BFF /r/:token did not return JWT"
  fi
else
  warn "exchange response: $EXCHANGE_RESP"
  fail "BFF /r/:token returned non-JWT"
fi

# ─── Step 4: GET /v1/discover with JWT ─────────────────────────────────────────
step "Step 4 — GET /v1/discover?action=eat (catalog-only path)"
# Omitting `loc` keeps the request on the catalog-only path; the geo+vector
# path requires search-svc to have embeddings populated (OPENAI_API_KEY).
DISCOVER_RESP=$(internal_wget --header="Authorization: Bearer $JWT" "$BFF/v1/discover?action=eat" 2>&1) || true
COUNT=$(echo "$DISCOVER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null || echo 0)
if [[ "$COUNT" -gt 0 ]]; then
  pass "/v1/discover returned $COUNT places"
else
  warn "discover response: $DISCOVER_RESP"
  fail "/v1/discover returned 0 places"
fi

# ─── Step 5: GET /v1/places/:id ────────────────────────────────────────────────
step "Step 5 — GET /v1/places/:id (place detail)"
PLACE_ID=$(echo "$DISCOVER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['groups'][0]['places'][0]['id'])" 2>/dev/null || echo "")
if [[ -z "$PLACE_ID" ]]; then
  warn "could not extract a place_id from discover"
  fail "missing place_id"
fi

PLACE_RESP=$(internal_wget --header="Authorization: Bearer $JWT" "$BFF/v1/places/$PLACE_ID" 2>&1) || true
if echo "$PLACE_RESP" | grep -q "name\|actions\|media"; then
  pass "/v1/places/$PLACE_ID returned"
else
  warn "place response: $PLACE_RESP"
  fail "place payload missing expected fields"
fi

# ─── DONE ──────────────────────────────────────────────────────────────────────
echo ""
echo "${GREEN}━━━ Smoke test PASSED ━━━${RESET}"
echo ""
info "Guest journey works end-to-end:"
info "  • token-svc minted opaque token"
info "  • BFF exchanged for JWT"
info "  • Discover returned places"
info "  • Place detail returned"
echo ""
info "Visit http://localhost:5173 with the PWA dev server to use it interactively."
