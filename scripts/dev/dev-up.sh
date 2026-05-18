#!/usr/bin/env bash
# Daily Tour dev bring-up — idempotent smoke script.
# Re-run after each fix; earlier stages are no-ops once they pass.
#
# Usage:
#   bash scripts/dev/dev-up.sh                # full bring-up
#   bash scripts/dev/dev-up.sh --skip-pwa     # backend only
#   bash scripts/dev/dev-up.sh --skip-optional # skip search/planner/chat/notif
#   bash scripts/dev/dev-up.sh --from <stage>  # resume from stage N (1-8)

set -u
set -o pipefail

# ─── colors + helpers ──────────────────────────────────────────────────────────
RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
pass()  { echo "${GREEN}✓${RESET} $*"; }
fail()  { echo "${RED}✗ FAIL${RESET}: $*"; }
warn()  { echo "${YELLOW}⚠${RESET}  $*"; }
info()  { echo "${BLUE}ℹ${RESET}  $*"; }
stage() { echo ""; echo "${BLUE}━━━ Stage $1: $2 ━━━${RESET}"; }

# ─── args ──────────────────────────────────────────────────────────────────────
SKIP_PWA=0
SKIP_OPTIONAL=0
START_STAGE=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-pwa) SKIP_PWA=1; shift ;;
    --skip-optional) SKIP_OPTIONAL=1; shift ;;
    --from) START_STAGE=$2; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) fail "unknown arg: $1"; exit 1 ;;
  esac
done

# ─── repo root ─────────────────────────────────────────────────────────────────
cd "$(dirname "$0")/../.." || { fail "cannot cd to repo root"; exit 1; }
REPO_ROOT=$(pwd)
info "repo root: $REPO_ROOT"

# Activate Node 22 from .nvmrc — runs for every invocation (including --from N)
# so subsequent stages (pnpm, tsx) don't trip the engines.node guard.
if [[ -s ~/.nvm/nvm.sh ]]; then
  # shellcheck disable=SC1090
  source ~/.nvm/nvm.sh
  nvm use --silent 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 1 — PREFLIGHT
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 1 ]]; then
  stage 1 "PREFLIGHT — node, pnpm, docker, .env"

  NODE_VER=$(node -v 2>/dev/null || echo "missing")
  if [[ ! "$NODE_VER" =~ ^v22\. ]]; then
    fail "Node 22 required (got: $NODE_VER). Run: nvm install 22 && nvm use"
    exit 1
  fi
  pass "Node $NODE_VER"

  # pnpm
  PNPM_VER=$(pnpm -v 2>/dev/null || echo "missing")
  if [[ ! "$PNPM_VER" =~ ^9\. ]]; then
    fail "pnpm 9 required (got: $PNPM_VER). Run: npm i -g pnpm@9"
    exit 1
  fi
  pass "pnpm $PNPM_VER"

  # docker
  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon not running. Start Docker Desktop or systemctl start docker"
    exit 1
  fi
  pass "Docker daemon up"

  # .env
  if [[ ! -f .env ]]; then
    warn ".env missing — copying from .env.example"
    cp .env.example .env
    warn "  → Edit .env if you need real ANTHROPIC_API_KEY/OPENAI_API_KEY"
    warn "  → JWT_SIGNING_KEY default is ≥32 chars; safe for dev"
  fi
  pass ".env exists"

  # JWT signing key length
  JWT_LEN=$(grep '^JWT_SIGNING_KEY=' .env | cut -d= -f2- | wc -c)
  if [[ $JWT_LEN -lt 33 ]]; then  # 32 + newline
    fail "JWT_SIGNING_KEY must be ≥32 chars (got: $((JWT_LEN-1))). Fix .env"
    exit 1
  fi
  pass "JWT_SIGNING_KEY ≥32 chars"
fi

# Load .env into the shell so subsequent stages can use $REDIS_PASSWORD,
# $POSTGRES_PASSWORD, etc. for direct-CLI auth (compose itself uses --env-file).
set -a
# shellcheck disable=SC1091
source .env
set +a

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 2 — INSTALL deps
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 2 ]]; then
  stage 2 "INSTALL — pnpm + uv"

  # idempotency: skip if node_modules/.pnpm newer than lockfile
  if [[ -d node_modules/.pnpm && node_modules/.pnpm -nt pnpm-lock.yaml ]]; then
    pass "pnpm install (cached; node_modules/.pnpm newer than lock)"
  else
    info "running pnpm install --frozen-lockfile…"
    if pnpm install --frozen-lockfile 2>&1 | tail -5; then
      pass "pnpm install"
    else
      fail "pnpm install failed. Try without --frozen-lockfile if lockfile drift"
      info "  fix: pnpm install (no --frozen-lockfile), then commit lockfile"
      exit 1
    fi
  fi

  # uv for Python services
  if command -v uv >/dev/null 2>&1; then
    pass "uv installed"
  else
    warn "uv missing — Python services will be skipped"
    warn "  install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 3 — INFRA (postgres + redis + rabbitmq + minio)
# ═══════════════════════════════════════════════════════════════════════════════
COMPOSE_BASE="--env-file .env -f infra/compose/docker-compose.base.yml"
COMPOSE_APP="-f infra/compose/docker-compose.app.yml"
COMPOSE_ALL="$COMPOSE_BASE $COMPOSE_APP"

if [[ $START_STAGE -le 3 ]]; then
  stage 3 "INFRA — postgres + redis + rabbitmq + minio"

  info "bringing up infra deps via Compose…"
  if docker compose $COMPOSE_BASE up -d 2>&1 | tail -10; then
    pass "compose up base"
  else
    fail "compose up base failed"
    exit 1
  fi

  # Wait for postgres
  info "waiting for postgres (timeout 60s)…"
  for i in {1..60}; do
    if docker compose $COMPOSE_BASE exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
      pass "postgres ready"
      break
    fi
    [[ $i -eq 60 ]] && { fail "postgres did not become ready"; docker compose $COMPOSE_BASE logs postgres | tail -20; exit 1; }
    sleep 1
  done

  # Wait for redis
  info "waiting for redis (timeout 30s)…"
  for i in {1..30}; do
    if docker compose $COMPOSE_BASE exec -T redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning PING 2>/dev/null | grep -q PONG; then
      pass "redis ready"
      break
    fi
    [[ $i -eq 30 ]] && { fail "redis did not respond to PING"; exit 1; }
    sleep 1
  done

  # Wait for rabbitmq
  info "waiting for rabbitmq (timeout 60s)…"
  for i in {1..60}; do
    if docker compose $COMPOSE_BASE exec -T rabbitmq rabbitmq-diagnostics -q ping >/dev/null 2>&1; then
      pass "rabbitmq ready"
      break
    fi
    [[ $i -eq 60 ]] && { warn "rabbitmq not pinging — may still be booting; continuing"; }
    sleep 1
  done

  # Minio just needs to be up; init container handles bucket
  info "minio container check…"
  if docker compose $COMPOSE_BASE ps minio | grep -q Up; then
    pass "minio up (bucket init handled by minio-init container)"
  else
    fail "minio not up"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 4 — MIGRATIONS
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 4 ]]; then
  stage 4 "MIGRATIONS — catalog + token + media schemas"

  # Build host-side per-service DATABASE_URLs from SERVICE_DB_PASSWORD_*
  # (sourced from .env). Containers get these from docker-compose.app.yml,
  # but host-run migrate.ts has nothing else to read from.
  PG_HOST_PORT="${DT_HOST_PORT_POSTGRES:-27432}"
  export CATALOG_SVC_DATABASE_URL="postgres://catalog_svc:${SERVICE_DB_PASSWORD_CATALOG}@localhost:${PG_HOST_PORT}/dailytour"
  export TOKEN_SVC_DATABASE_URL="postgres://token_svc:${SERVICE_DB_PASSWORD_TOKEN}@localhost:${PG_HOST_PORT}/dailytour"
  export MEDIA_SVC_DATABASE_URL="postgres://media_svc:${SERVICE_DB_PASSWORD_MEDIA}@localhost:${PG_HOST_PORT}/dailytour"

  for svc in catalog-svc token-svc media-svc; do
    info "migrating $svc…"
    if pnpm --filter "@daily-tour/$svc" run db:migrate 2>&1 | tail -10; then
      pass "migrated $svc"
    else
      fail "$svc migrate failed"
      info "  diagnose: pnpm --filter @daily-tour/$svc run db:migrate"
      info "  reset: bash scripts/dev/dev-down.sh && bash scripts/dev/dev-up.sh"
      exit 1
    fi
  done
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 5 — SEED catalog
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 5 ]]; then
  stage 5 "SEED — actions + wishes taxonomy + 28 São Miguel places"
  # Taxonomy first (6 actions + 36 wishes); place_action_wish FKs depend on it.
  if pnpm --filter @daily-tour/catalog-svc run seed 2>&1 | tail -5; then
    pass "catalog taxonomy seeded (actions + wishes)"
  else
    fail "taxonomy seed failed"
    info "  diagnose: pnpm --filter @daily-tour/catalog-svc run seed"
    exit 1
  fi
  if pnpm --filter @daily-tour/catalog-svc run seed:places 2>&1 | tail -5; then
    pass "catalog places seeded (28 São Miguel places, idempotent)"
  else
    fail "places seed failed"
    info "  diagnose: pnpm --filter @daily-tour/catalog-svc run seed:places"
    exit 1
  fi
  # token-svc seed creates 2 fixture reservations (UUIDs ccc00001-...-1/2),
  # required for any smoke that mints + exchanges a guest token.
  if pnpm --filter @daily-tour/token-svc run seed 2>&1 | tail -5; then
    pass "token-svc fixtures seeded (2 guests + 2 reservations)"
  else
    fail "token-svc seed failed"
    info "  diagnose: pnpm --filter @daily-tour/token-svc run seed"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 6 — REQUIRED SERVICES (bff + token-svc + catalog-svc + media-svc)
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 6 ]]; then
  stage 6 "SERVICES — bff + token-svc + catalog-svc + media-svc"

  info "building + starting required services…"
  if docker compose $COMPOSE_ALL up -d --build bff token-svc catalog-svc media-svc 2>&1 | tail -15; then
    pass "compose up required services"
  else
    fail "compose up required services failed"
    info "  diagnose: docker compose $COMPOSE_ALL logs bff | tail -30"
    exit 1
  fi

  # Health probes (services should expose /health)
  # Each service listens on its own container port (not host-published for the
  # app tier). When the host has no published mapping, exec wget inside the
  # container against the right localhost:<port>.
  for svc in token-svc catalog-svc media-svc bff; do
    info "waiting for $svc /health (timeout 60s)…"
    case "$svc" in
      bff)         INTERNAL_PORT=8080 ;;
      catalog-svc) INTERNAL_PORT=8081 ;;
      media-svc)   INTERNAL_PORT=8087 ;;
      token-svc)   INTERNAL_PORT=8088 ;;
      *)           INTERNAL_PORT=8080 ;;
    esac
    PORT=$(docker compose $COMPOSE_ALL port "$svc" 2>/dev/null | head -1 | sed 's/.*:\([0-9]*\)/\1/')
    if [[ -z "$PORT" ]]; then
      PORT_OK=0
      for i in {1..60}; do
        if docker compose $COMPOSE_ALL exec -T "$svc" wget -q -O- "http://localhost:${INTERNAL_PORT}/health" >/dev/null 2>&1; then
          PORT_OK=1
          break
        fi
        sleep 1
      done
      [[ $PORT_OK -eq 1 ]] && pass "$svc /health OK (internal :${INTERNAL_PORT})" || { warn "$svc /health unreachable — check logs"; }
    else
      for i in {1..60}; do
        if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
          pass "$svc /health OK (port $PORT)"
          break
        fi
        [[ $i -eq 60 ]] && warn "$svc /health timeout — check docker compose logs $svc"
        sleep 1
      done
    fi
  done
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 7 — OPTIONAL SERVICES (search + planner + chat-hub + notif)
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 7 && $SKIP_OPTIONAL -eq 0 ]]; then
  stage 7 "OPTIONAL — search-svc + planner-svc + chat-hub + notif-svc"

  # Check API keys
  ANTHROPIC_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2-)
  OPENAI_KEY=$(grep '^OPENAI_API_KEY=' .env 2>/dev/null | cut -d= -f2-)

  if [[ -z "$ANTHROPIC_KEY" ]]; then
    warn "ANTHROPIC_API_KEY empty — planner-svc + chat-hub will start but error on real requests"
  fi
  if [[ -z "$OPENAI_KEY" ]]; then
    warn "OPENAI_API_KEY empty — search-svc embedding worker will skip new embeddings"
  fi

  info "building + starting optional services…"
  if docker compose $COMPOSE_ALL up -d --build search-svc planner-svc chat-hub notif-svc 2>&1 | tail -15; then
    pass "compose up optional services"
  else
    warn "some optional services failed to start — see logs"
    info "  diagnose: docker compose $COMPOSE_ALL logs search-svc planner-svc chat-hub notif-svc"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 8 — PWA (dev server)
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $START_STAGE -le 8 && $SKIP_PWA -eq 0 ]]; then
  stage 8 "PWA — vite dev server"
  warn "PWA dev server runs in foreground. To start it manually:"
  echo ""
  echo "    pnpm --filter @daily-tour/pwa dev"
  echo ""
  info "Or run in background: nohup pnpm --filter @daily-tour/pwa dev > /tmp/pwa.log 2>&1 &"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "${GREEN}━━━ dev-up complete ━━━${RESET}"
echo ""
info "Next: bash scripts/dev/dev-smoke.sh   # exercise a guest journey"
info "Or:   pnpm --filter @daily-tour/pwa dev   # → http://localhost:5173"
