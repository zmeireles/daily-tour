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
# Deploy knobs — default to dev so an unset env is byte-for-byte the old script.
# The qual deploy sets ENV_FILE=.env.qual + PROJECT=dt-qual so the exec calls
# below address the dt-qual compose project instead of the default name.
ENV_FILE="${ENV_FILE:-.env}"
PROJECT="${PROJECT:-}"
COMPOSE_BASE="--env-file $ENV_FILE ${PROJECT:+-p $PROJECT} -f infra/compose/docker-compose.base.yml"
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

# ─── Step 1: catalog-svc is seeded (≥28 baseline staples) ──────────────────────
# Count-robust: the seed grows over time (28 day-1 staples → 43 with Miguel's
# guesthouses + POIs → more). Assert the baseline is present, not an exact count,
# so the smoke doesn't false-fail every time the catalog grows.
step "Step 1 — catalog-svc seeded (≥28 places)"
PLACE_COUNT=$(docker compose $COMPOSE_BASE exec -T postgres psql -U postgres -d dailytour -t -c "SELECT count(*) FROM catalog.place;" 2>/dev/null | tr -d ' \n')
if [[ "$PLACE_COUNT" =~ ^[0-9]+$ ]] && ((PLACE_COUNT >= 28)); then
  pass "$PLACE_COUNT places in catalog (≥28 baseline)"
else
  fail "expected ≥28 places, got: '$PLACE_COUNT'"
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
# The BFF redeem endpoint is /v1/r/:token (the SPA owns the browser route
# /r/:token on a same-origin apex deploy; the exchange XHR targets /v1/r/).
step "Step 3 — exchange token via BFF /v1/r/:token"
EXCHANGE_RESP=$(internal_wget "$BFF/v1/r/$TOKEN" 2>&1) || true
if echo "$EXCHANGE_RESP" | grep -q "jwt\|JWT\|token"; then
  JWT=$(echo "$EXCHANGE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jwt',''))" 2>/dev/null || echo "")
  if [[ -n "$JWT" ]]; then
    pass "JWT received: ${JWT:0:30}…"
  else
    warn "exchange response: $EXCHANGE_RESP"
    fail "BFF /v1/r/:token did not return JWT"
  fi
else
  warn "exchange response: $EXCHANGE_RESP"
  fail "BFF /v1/r/:token returned non-JWT"
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

# The next three steps cover the cross-service journeys that the Plan-001
# accounting retro found CI never exercised — each one shipped "done" in
# TODO.md while the journey was silently broken (retro items 1-4, P2). Assert
# them here so a regression fails the smoke gate, not a mid-browser UAT.

# ─── Step 6: planner journey (T-3.0.3) ─────────────────────────────────────────
step "Step 6 — planner: POST /v1/tour-plans transitions out of queued (T-3.0.3)"
# The retro bug was 'queued forever' (no async consumer). Reaching ANY terminal
# state (ready|rejected) proves the worker is alive; staying queued = regression.
PLAN_RESP=$(internal_wget --post-data='{"wishes":["eat","see"],"duration_hours":3,"vehicle":"car"}' \
  --header="Authorization: Bearer $JWT" --header="Content-Type: application/json" \
  "$BFF/v1/tour-plans" 2>&1) || true
PLAN_ID=$(echo "$PLAN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
[[ -n "$PLAN_ID" ]] || { warn "create response: $PLAN_RESP"; fail "POST /v1/tour-plans did not return a plan id"; }
pass "plan created: $PLAN_ID (queued)"

PLAN_STATUS=""
PSTATUS_RESP=""
for _ in $(seq 1 30); do
  PSTATUS_RESP=$(internal_wget --header="Authorization: Bearer $JWT" "$BFF/v1/tour-plans/$PLAN_ID" 2>&1) || true
  PLAN_STATUS=$(echo "$PSTATUS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  [[ "$PLAN_STATUS" == "ready" || "$PLAN_STATUS" == "rejected" ]] && break
  sleep 1
done
case "$PLAN_STATUS" in
  ready)
    STEPS=$(echo "$PSTATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len((d.get('plan_payload') or {}).get('steps',[])))" 2>/dev/null || echo 0)
    [[ "$STEPS" -gt 0 ]] && pass "plan ready with $STEPS steps (full LLM+RAG pipeline)" || fail "plan 'ready' but 0 steps"
    ;;
  rejected)
    REASON=$(echo "$PSTATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('plan_payload') or {}).get('error',''))" 2>/dev/null || echo "")
    warn "plan rejected: $REASON (consumer alive; likely no ANTHROPIC_API_KEY in dev — not a transport regression)"
    pass "planner consumer transitioned out of queued"
    ;;
  *)
    fail "plan stuck at '${PLAN_STATUS:-queued}' after 30s — planner consumer not wired (T-3.0.3 regression)"
    ;;
esac

# ─── Step 7: chat journey (T-4.0.1) ────────────────────────────────────────────
step "Step 7 — chat: WS message persists + reads back via history (T-4.0.1)"
# The retro bug was 'message dropped, lost on reload' (no persistence). Send a
# WS frame (busybox wget can't do WS, so use the websockets client inside the
# chat-hub container), then read it back through the BFF history route.
GUEST_ID=$(echo "$JWT" | python3 -c "import sys,base64,json; p=sys.stdin.read().strip().split('.')[1]; p+='='*(-len(p)%4); print(json.loads(base64.urlsafe_b64decode(p)).get('sub',''))" 2>/dev/null || echo "")
[[ -n "$GUEST_ID" ]] || fail "could not derive guest_id (sub) from JWT"
SMOKE_MSG="smoke-$(date +%s)"
WS_OK=$(docker compose $COMPOSE_ALL exec -T -e GID="$GUEST_ID" -e MSG="$SMOKE_MSG" chat-hub python -c '
import asyncio, os, websockets
async def main():
    uri = "ws://localhost:8084/ws/" + os.environ["GID"]
    async with websockets.connect(uri) as ws:
        await ws.send(os.environ["MSG"])
        await asyncio.wait_for(ws.recv(), timeout=5)  # the ack frame
    print("ok")
asyncio.run(main())
' 2>/dev/null || echo "")
[[ "$WS_OK" == "ok" ]] || fail "chat-hub WS send/ack failed (transport regression)"
pass "WS message sent + acked"

HIST_RESP=$(internal_wget --header="Authorization: Bearer $JWT" "$BFF/v1/chat/history" 2>&1) || true
if echo "$HIST_RESP" | MSG="$SMOKE_MSG" python3 -c "import sys,os,json; ms=json.load(sys.stdin).get('messages',[]); sys.exit(0 if any(m.get('body')==os.environ['MSG'] for m in ms) else 1)" 2>/dev/null; then
  pass "message persisted + retrievable via GET /v1/chat/history (survives reload)"
else
  warn "history response: $HIST_RESP"
  fail "sent message NOT found in history — persistence regression (T-4.0.1)"
fi

# ─── Step 8: telemetry journey (analytics GRANT, #166) ─────────────────────────
step "Step 8 — telemetry: POST /v1/telemetry/tour accepted (analytics GRANT)"
# The retro bug was a 500 'permission denied for schema analytics' (BFF lacked
# INSERT on the pre-existing table). A 2xx (204) means the GRANT holds; busybox
# wget exits non-zero on 4xx/5xx, so success here == the insert worked.
if internal_wget --post-data='{"event_type":"tour.started"}' \
     --header="Authorization: Bearer $JWT" --header="Content-Type: application/json" \
     "$BFF/v1/telemetry/tour" >/dev/null 2>&1; then
  pass "telemetry accepted (204) — BFF can INSERT into analytics.tour_event"
else
  fail "POST /v1/telemetry/tour failed (non-2xx) — likely analytics GRANT regression (#166)"
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
info "  • Planner: tour-plan reached a terminal state (not stuck queued)"
info "  • Chat: WS message persisted + read back via history"
info "  • Telemetry: tour event accepted (analytics INSERT)"
echo ""
info "Visit http://localhost:5173 with the PWA dev server to use it interactively."
