#!/usr/bin/env bash
# Daily Tour dev teardown — clean reset.
# Drops Docker volumes (postgres data, redis cache, minio media gone).
# Leaves git working tree alone.
#
# Usage:
#   bash scripts/dev/dev-down.sh           # stop containers, keep volumes
#   bash scripts/dev/dev-down.sh --clean   # stop + drop volumes (full reset)
#   bash scripts/dev/dev-down.sh --hard    # stop + drop volumes + node_modules

set -u
set -o pipefail

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
pass()  { echo "${GREEN}✓${RESET} $*"; }
warn()  { echo "${YELLOW}⚠${RESET}  $*"; }
info()  { echo "${BLUE}ℹ${RESET}  $*"; }

CLEAN=0
HARD=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) CLEAN=1; shift ;;
    --hard) CLEAN=1; HARD=1; shift ;;
    *) shift ;;
  esac
done

cd "$(dirname "$0")/../.." || exit 1

COMPOSE_BASE="-f infra/compose/docker-compose.base.yml"
COMPOSE_APP="-f infra/compose/docker-compose.app.yml"

info "stopping containers…"
if [[ $CLEAN -eq 1 ]]; then
  warn "dropping volumes — postgres + minio + rabbitmq state will be LOST"
  docker compose $COMPOSE_BASE $COMPOSE_APP down -v 2>&1 | tail -5
  pass "containers + volumes removed"
else
  docker compose $COMPOSE_BASE $COMPOSE_APP down 2>&1 | tail -5
  pass "containers stopped (volumes retained)"
fi

# kill background PWA dev server if any
if pgrep -f "vite.*--port 5173" >/dev/null 2>&1; then
  info "killing vite dev server…"
  pkill -f "vite.*--port 5173" || true
  pass "vite killed"
fi

if [[ $HARD -eq 1 ]]; then
  warn "hard reset — removing node_modules + dist directories…"
  find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null
  find . -name "dist" -type d -prune -exec rm -rf {} + 2>/dev/null
  find . -name ".turbo" -type d -prune -exec rm -rf {} + 2>/dev/null
  pass "node_modules, dist, .turbo removed"
fi

echo ""
pass "dev-down complete"
info "Re-bring-up: bash scripts/dev/dev-up.sh"
