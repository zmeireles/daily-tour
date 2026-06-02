#!/usr/bin/env bash
# Daily Tour — dev env readiness check.
#
# Runs BEFORE any UAT execution. Snapshots repo state, container health,
# BFF endpoints, PWA dev server, and a minimal smoke. Produces a
# paste-ready fingerprint for the UAT task's `## Setup` section.
#
# Exit codes:
#   0 → env is ready; tester may run the UAT
#   1 → at least one check failed; engineer must fix env before UAT runs
#
# Usage:
#   bash scripts/dev/dev-env-check.sh                  # short fingerprint
#   bash scripts/dev/dev-env-check.sh --skip-smoke     # skip the smoke pass
#   bash scripts/dev/dev-env-check.sh --markdown       # markdown-formatted

set -u
set -o pipefail

cd "$(dirname "$0")/../.." || exit 1

# ─── flags ─────────────────────────────────────────────────────────────────
SKIP_SMOKE=0
MARKDOWN=0
for arg in "$@"; do
  case "$arg" in
    --skip-smoke) SKIP_SMOKE=1 ;;
    --markdown)   MARKDOWN=1 ;;
    -h|--help)    sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ─── colors ────────────────────────────────────────────────────────────────
if [[ -t 1 && $MARKDOWN -eq 0 ]]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; DIM=""; RESET=""
fi
OK="${GREEN}✓${RESET}"
NO="${RED}✗${RESET}"
WARN="${YELLOW}⚠${RESET}"

FAILURES=0
fail() { FAILURES=$((FAILURES + 1)); }

section() {
  if [[ $MARKDOWN -eq 1 ]]; then
    echo ""
    echo "**$1**"
  else
    echo ""
    echo "${DIM}── $1 ──${RESET}"
  fi
}

row() {
  # row <name> <value> [extra]
  local name=$1 value=$2 extra=${3:-}
  if [[ $MARKDOWN -eq 1 ]]; then
    if [[ -n "$extra" ]]; then
      printf '| %-20s | %s — %s |\n' "$name" "$value" "$extra"
    else
      printf '| %-20s | %s |\n' "$name" "$value"
    fi
  else
    if [[ -n "$extra" ]]; then
      printf "  %-22s %s ${DIM}— %s${RESET}\n" "$name" "$value" "$extra"
    else
      printf "  %-22s %s\n" "$name" "$value"
    fi
  fi
}

# ─── header ────────────────────────────────────────────────────────────────
if [[ $MARKDOWN -eq 1 ]]; then
  echo "### Daily Tour env readiness — $(date -Is)"
  echo ""
  echo "| Field | Value |"
  echo "| --- | --- |"
else
  echo "${DIM}Daily Tour env readiness — $(date -Is)${RESET}"
fi

# ─── REPO ──────────────────────────────────────────────────────────────────
section "REPO"
HEAD_SHA=$(git rev-parse --short HEAD)
HEAD_SUBJ=$(git log -1 --format='%s' | cut -c1-72)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo "(none)")
TREE_STATUS=$(git status --porcelain | wc -l)

row "git HEAD" "$HEAD_SHA" "$HEAD_SUBJ"
row "branch" "$BRANCH" "upstream: $UPSTREAM"

if [[ "$TREE_STATUS" -eq 0 ]]; then
  row "working tree" "$OK clean"
else
  row "working tree" "$WARN dirty" "$TREE_STATUS uncommitted entries (acceptable for dev iteration)"
fi

# Check tracking-vs-upstream: are we ahead/behind origin?
if [[ "$UPSTREAM" != "(none)" ]]; then
  AHEAD=$(git rev-list --count "$UPSTREAM..HEAD" 2>/dev/null || echo 0)
  BEHIND=$(git rev-list --count "HEAD..$UPSTREAM" 2>/dev/null || echo 0)
  if [[ "$AHEAD" -eq 0 && "$BEHIND" -eq 0 ]]; then
    row "vs upstream" "$OK in sync"
  else
    row "vs upstream" "$WARN diverged" "ahead=$AHEAD behind=$BEHIND"
  fi
fi

# ─── CONTAINERS ────────────────────────────────────────────────────────────
section "CONTAINERS"

EXPECTED=(dt_postgres dt_redis dt_rabbitmq dt_minio dt_token_svc dt_catalog_svc dt_media_svc dt_bff dt_search_svc dt_planner_svc dt_chat_hub dt_notif_svc)

TOTAL=${#EXPECTED[@]}
HEALTHY=0
for c in "${EXPECTED[@]}"; do
  STATUS=$(docker ps --filter "name=^${c}$" --format '{{.Status}}' 2>/dev/null)
  if [[ "$STATUS" == *"(healthy)"* ]]; then
    HEALTHY=$((HEALTHY + 1))
  else
    row "$c" "$NO" "${STATUS:-not running}"
    fail
  fi
done

if [[ "$HEALTHY" -eq "$TOTAL" ]]; then
  row "all $TOTAL services" "$OK healthy"
fi

# ─── BFF ENDPOINTS ─────────────────────────────────────────────────────────
section "BFF ENDPOINTS"

BFF_PORT="${DT_HOST_PORT_BFF:-28080}"
BFF_BASE="http://127.0.0.1:${BFF_PORT}"

# /health → 200
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' "$BFF_BASE/health" 2>/dev/null || echo "000")
if [[ "$HEALTH" == "200" ]]; then
  row "GET /health" "$OK 200"
else
  row "GET /health" "$NO got $HEALTH (want 200)"
  fail
fi

# /r/:token with an obviously-invalid token → 302 (graceful-degrade redirect)
EXCHANGE=$(curl -s -o /dev/null -w '%{http_code}' "$BFF_BASE/r/__envcheck_invalid_token__" 2>/dev/null || echo "000")
if [[ "$EXCHANGE" == "302" || "$EXCHANGE" == "401" || "$EXCHANGE" == "404" ]]; then
  row "GET /r/:token" "$OK route registered" "responded $EXCHANGE for invalid token"
else
  row "GET /r/:token" "$NO got $EXCHANGE (want 302/401/404 for invalid)"
  fail
fi

# /v1/auth/refresh without cookie → 401 no_refresh_cookie
REFRESH_RESP=$(curl -s -w '\n%{http_code}' "$BFF_BASE/v1/auth/refresh" 2>/dev/null || echo $'\n000')
REFRESH_CODE=$(echo "$REFRESH_RESP" | tail -1)
REFRESH_BODY=$(echo "$REFRESH_RESP" | head -n -1)
if [[ "$REFRESH_CODE" == "401" ]] && echo "$REFRESH_BODY" | grep -q "no_refresh_cookie"; then
  row "GET /v1/auth/refresh" "$OK route live" "401 no_refresh_cookie (correct for missing cookie)"
elif [[ "$REFRESH_CODE" == "404" ]]; then
  row "GET /v1/auth/refresh" "$NO 404 — endpoint NOT live" "BFF needs rebuild: docker compose ... up -d --build bff"
  fail
else
  row "GET /v1/auth/refresh" "$NO unexpected $REFRESH_CODE" "body: $(echo "$REFRESH_BODY" | head -c 80)"
  fail
fi

# ─── PWA ───────────────────────────────────────────────────────────────────
section "PWA"

if ss -tlnp 2>/dev/null | grep -q ':5173 '; then
  row "vite dev :5173" "$OK listening"
else
  row "vite dev :5173" "$NO not bound" "start with: pnpm --filter @daily-tour/pwa dev"
  fail
fi

# Code-presence assertions for the most recent fixes — these catch
# "stale local checkout" mistakes that no health probe would detect.
PWA_FILES=(
  "apps/pwa/src/components/session-bootstrap.tsx"
  "apps/pwa/src/lib/auth/refresh.ts"
)
for f in "${PWA_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    row "$f" "$OK present"
  else
    row "$f" "$NO missing" "local code is stale; git fetch && git reset --hard origin/main"
    fail
  fi
done

# ─── SMOKE ─────────────────────────────────────────────────────────────────
if [[ $SKIP_SMOKE -eq 0 ]]; then
  section "SMOKE (internal network — fast)"
  PLACES=$(docker compose --env-file .env -f infra/compose/docker-compose.base.yml exec -T postgres psql -U postgres -d dailytour -t -c "SELECT count(*) FROM catalog.place;" 2>/dev/null | tr -d ' \n')
  if [[ "$PLACES" == "28" ]]; then
    row "catalog seeded" "$OK 28 places"
  else
    row "catalog seeded" "$NO got '$PLACES' (want 28)" "rerun seed: pnpm --filter @daily-tour/catalog-svc run seed"
    fail
  fi

  # Schema-table existence (P4 — Plan-001 accounting retro). Migrations applied
  # by a different role / a stale dev-up run silently leave a schema empty; the
  # gap only surfaces mid-UAT as `relation "x" does not exist` (planner.tour_plan,
  # chat.* — see retro items 2 & 4). Assert the migration-created core tables up
  # front. `to_regclass` returns NULL for a missing relation without erroring,
  # so one round-trip reports every gap at once.
  EXPECTED_TABLES="catalog.place,auth_tokens.reservation,auth_tokens.token_grant,auth_tokens.guest,media.asset,search.place_embedding,planner.tour_plan,chat.chat_thread,chat.message,chat.channel_binding,analytics.tour_event"
  TABLE_COUNT=$(($(echo "$EXPECTED_TABLES" | tr -cd ',' | wc -c) + 1))
  MISSING_TABLES=$(docker compose --env-file .env -f infra/compose/docker-compose.base.yml exec -T postgres \
    psql -U postgres -d dailytour -t -A -c \
    "SELECT string_agg(t, ', ' ORDER BY t) FROM unnest(string_to_array('$EXPECTED_TABLES', ',')) AS t WHERE to_regclass(t) IS NULL;" 2>/dev/null | tr -d '\r\n')
  if [[ -z "$MISSING_TABLES" ]]; then
    row "schema tables" "$OK all present" "$TABLE_COUNT migration-created relations resolve"
  else
    row "schema tables" "$NO missing: $MISSING_TABLES" "apply migrations: bash scripts/dev/dev-up.sh --from 4"
    fail
  fi

  # Role-grant existence (P4 — #146). The GRANTs in 02-roles.sql run only on
  # first DB init, so a live DB created before a grant was added never receives
  # it. The bff→analytics USAGE grant was the exact drift that surfaced UAT-G07
  # telemetry as a 500 (`permission denied for schema analytics`, PG 42501) —
  # source was correct, the 12-day-old live DB stale. Assert the critical bff
  # privileges directly so drift fails here, loudly, not mid-UAT.
  BFF_GRANTS=$(docker compose --env-file .env -f infra/compose/docker-compose.base.yml exec -T postgres \
    psql -U postgres -d dailytour -t -A -c \
    "SELECT has_schema_privilege('bff', 'analytics', 'USAGE')::text || ',' || has_table_privilege('bff', 'analytics.tour_event', 'INSERT')::text;" 2>/dev/null | tr -d '\r\n')
  if [[ "$BFF_GRANTS" == "true,true" ]]; then
    row "bff analytics grants" "$OK usage+insert"
  else
    row "bff analytics grants" "$NO got '$BFF_GRANTS' (want true,true)" "reconcile: docker exec dt_postgres psql -U postgres -d dailytour -c 'GRANT USAGE ON SCHEMA analytics TO bff; GRANT INSERT ON ALL TABLES IN SCHEMA analytics TO bff;'"
    fail
  fi
else
  section "SMOKE"
  row "(skipped)" "$WARN --skip-smoke flag set"
fi

# ─── VERDICT ───────────────────────────────────────────────────────────────
section "VERDICT"
if [[ "$FAILURES" -eq 0 ]]; then
  echo "${GREEN}✅ ENV READY${RESET} — tester may run the UAT."
  exit 0
else
  echo "${RED}❌ ENV NOT READY${RESET} — $FAILURES check(s) failed. Fix before UAT runs."
  exit 1
fi
