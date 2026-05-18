#!/usr/bin/env bash
# Daily Tour dev smoke — exercises a guest journey end-to-end.
# Run after `scripts/dev/dev-up.sh` returns 0.

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

# Resolve ports
BFF_PORT=$(docker compose $COMPOSE_ALL port bff 2>/dev/null | head -1 | sed 's/.*:\([0-9]*\)/\1/')
TOKEN_PORT=$(docker compose $COMPOSE_ALL port token-svc 2>/dev/null | head -1 | sed 's/.*:\([0-9]*\)/\1/')
CATALOG_PORT=$(docker compose $COMPOSE_ALL port catalog-svc 2>/dev/null | head -1 | sed 's/.*:\([0-9]*\)/\1/')

[[ -z "$BFF_PORT" ]] && fail "bff port not published — is it running?"
[[ -z "$TOKEN_PORT" ]] && fail "token-svc port not published"

info "bff:$BFF_PORT  token-svc:$TOKEN_PORT  catalog-svc:$CATALOG_PORT"

# ─── Step 1: catalog-svc has 28 places ─────────────────────────────────────────
step "Step 1 — catalog-svc has 28 seeded places"
PLACE_COUNT=$(docker compose $COMPOSE_BASE exec -T postgres psql -U postgres -d dailytour -t -c "SELECT count(*) FROM catalog.place;" 2>/dev/null | tr -d ' \n')
if [[ "$PLACE_COUNT" == "28" ]]; then
  pass "28 places in catalog"
else
  fail "expected 28 places, got: '$PLACE_COUNT'"
fi

# ─── Step 2: mint a test token ─────────────────────────────────────────────────
step "Step 2 — mint test token via token-svc"
GUEST_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
GUESTHOUSE_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")

MINT_RESP=$(curl -sf -X POST "http://localhost:$TOKEN_PORT/v1/tokens/issue" \
  -H "Content-Type: application/json" \
  -d "{\"reservation_id\":\"$GUEST_ID\",\"guest_id\":\"$GUEST_ID\",\"guesthouse_id\":\"$GUESTHOUSE_ID\",\"locale\":\"en\"}" 2>&1)
TOKEN=$(echo "$MINT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [[ -n "$TOKEN" ]]; then
  pass "token minted: ${TOKEN:0:20}…"
else
  warn "mint response: $MINT_RESP"
  fail "token-svc /v1/tokens/issue did not return a token (endpoint may differ; check token-svc routes)"
fi

# ─── Step 3: exchange token via BFF ────────────────────────────────────────────
step "Step 3 — exchange token via BFF /r/:token"
EXCHANGE_RESP=$(curl -sf "http://localhost:$BFF_PORT/r/$TOKEN" 2>&1)
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
step "Step 4 — GET /v1/discover?action=eat"
DISCOVER_RESP=$(curl -sf "http://localhost:$BFF_PORT/v1/discover?action=eat&loc=37.74,-25.67&km=10" \
  -H "Authorization: Bearer $JWT" 2>&1)
COUNT=$(echo "$DISCOVER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null || echo 0)
if [[ "$COUNT" -gt 0 ]]; then
  pass "/v1/discover returned $COUNT places"
else
  warn "discover response: $DISCOVER_RESP"
  fail "/v1/discover returned 0 places"
fi

# ─── Step 5: GET /v1/places/:id/hydrated ───────────────────────────────────────
step "Step 5 — GET /v1/places/:id/hydrated"
PLACE_ID=$(echo "$DISCOVER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['groups'][0]['places'][0]['id'])" 2>/dev/null || echo "")
if [[ -z "$PLACE_ID" ]]; then
  warn "could not extract a place_id from discover"
  fail "missing place_id"
fi

HYDRATED=$(curl -sf "http://localhost:$BFF_PORT/v1/places/$PLACE_ID/hydrated" \
  -H "Authorization: Bearer $JWT" 2>&1)
if echo "$HYDRATED" | grep -q "name\|actions\|media"; then
  pass "/v1/places/$PLACE_ID/hydrated returned"
else
  warn "hydrated response: $HYDRATED"
  fail "hydrated payload missing expected fields"
fi

# ─── DONE ──────────────────────────────────────────────────────────────────────
echo ""
echo "${GREEN}━━━ Smoke test PASSED ━━━${RESET}"
echo ""
info "Guest journey works end-to-end:"
info "  • token-svc minted opaque token"
info "  • BFF exchanged for JWT"
info "  • Discover returned places"
info "  • Place detail hydrated"
echo ""
info "Visit http://localhost:5173 with the PWA dev server to use it interactively."
