# Daily Tour — developer shortcuts
#
# Two areas:
#   1. Compose lifecycle (env-aware) — make up / down / build / recreate / logs …
#   2. k6 load tests                 — make load-test SCENARIO=…
#
# Requires: docker compose v2, k6 (https://k6.io/docs/get-started/installation/)

# ─── Environment selection ──────────────────────────────────────────────────
# ENV picks which deployment environment every compose command targets, so the
# distinction is first-class from the start rather than retrofitted later.
#
# Each env carries its own env-file and its own compose project (isolated
# networks/volumes). `dev` keeps the legacy `.env` filename for back-compat;
# every other env follows the `.env.<env>` convention — create the file before
# using that env (copy from .env.example).
#
#   make up                 # dev (default) → .env, project dt-dev
#   make up ENV=qual        # → .env.qual,  project dt-qual
#   make logs ENV=prod SVC=bff
#
# NOTE: service container_name values are currently hard-coded (dt_*), so two
# envs cannot run on the same host simultaneously even with distinct projects.
# Per-env COMPOSE projects still isolate networks/volumes and make intent
# explicit; lifting the single-host limit is tracked separately.
#
# `dev` defaults to the existing `dailytour-base` project so these targets
# attach to the stack that's already running locally (not a fresh parallel
# one). Other envs get an isolated `dt-<env>` project.
ENV       ?= dev
ENV_FILE  ?= $(if $(filter dev,$(ENV)),.env,.env.$(ENV))
PROJECT   ?= $(if $(filter dev,$(ENV)),dailytour-base,dt-$(ENV))

# ─── Compose file stack ─────────────────────────────────────────────────────
# Core stack = base (datastores) + app (services). Opt into extra stacks or
# overlays by setting OVERLAYS, e.g.:
#   make up OVERLAYS="-f infra/compose/overlay.observability.yml"
#   make up OVERLAYS="-f infra/compose/overlay.osrm.yml"
COMPOSE_DIR   := infra/compose
CORE_FILES    := -f $(COMPOSE_DIR)/docker-compose.base.yml -f $(COMPOSE_DIR)/docker-compose.app.yml
OVERLAYS      ?=
COMPOSE_FILES := $(CORE_FILES) $(OVERLAYS)

# SVC optionally scopes a target to a single service, e.g. `make build SVC=bff`.
SVC ?=

# Every compose target funnels through this one assembled command.
COMPOSE = docker compose -p $(PROJECT) --env-file $(ENV_FILE) $(COMPOSE_FILES)

.DEFAULT_GOAL := help

# ─── Guard ──────────────────────────────────────────────────────────────────
# Fail early with a clear message when the selected env-file is missing,
# rather than letting docker compose emit a cryptic warning + empty vars.
.PHONY: _require-env-file
_require-env-file:
	@test -f "$(ENV_FILE)" || { \
	  echo "✗ env-file '$(ENV_FILE)' not found (ENV=$(ENV))."; \
	  echo "  dev uses .env; create .env.$(ENV) for other envs (see .env.example)."; \
	  exit 1; }

# ─── Compose lifecycle ──────────────────────────────────────────────────────
.PHONY: env up start recreate down nuke stop restart build rebuild pull ps status logs config sh vps

## Print the resolved environment + compose invocation (no side effects).
env:
	@echo "ENV           = $(ENV)"
	@echo "ENV_FILE      = $(ENV_FILE)"
	@echo "PROJECT       = $(PROJECT)"
	@echo "COMPOSE_FILES = $(COMPOSE_FILES)"
	@echo "SVC           = $(or $(SVC),<all>)"

## Create + start the stack, detached (builds missing images). SVC to scope.
up: _require-env-file
	$(COMPOSE) up -d $(SVC)

## Alias for `up`.
start: up

## (Re)create containers, forcing replacement even if config is unchanged.
recreate: _require-env-file
	$(COMPOSE) up -d --force-recreate $(SVC)

## Stop + remove containers and networks (named volumes are kept).
down:
	$(COMPOSE) down --remove-orphans

## Stop + remove containers AND named volumes — destroys local data. Use with care.
nuke:
	$(COMPOSE) down --remove-orphans --volumes

## Stop containers without removing them. SVC to scope.
stop:
	$(COMPOSE) stop $(SVC)

## Restart running containers. SVC to scope.
restart:
	$(COMPOSE) restart $(SVC)

## Build (or rebuild) images. SVC to scope.
build: _require-env-file
	$(COMPOSE) build $(SVC)

## Build + recreate in one step — the "ship a code change" flow. e.g. make rebuild SVC=bff
rebuild: _require-env-file
	$(COMPOSE) up -d --build $(if $(SVC),--no-deps $(SVC))

## Pull newer images for the stack. SVC to scope.
pull:
	$(COMPOSE) pull $(SVC)

## List containers and their health/status.
ps:
	$(COMPOSE) ps

## Alias for `ps`.
status: ps

## Tail logs (follow, last 100 lines). SVC to scope; Ctrl-C to exit.
logs:
	$(COMPOSE) logs -f --tail=100 $(SVC)

## Render the fully-merged compose config (debugging the file stack).
config:
	$(COMPOSE) config

## Open a shell inside a service container. e.g. make sh SVC=bff
sh:
	$(COMPOSE) exec $(SVC) sh

# ─── VPS (Plan-007 qual deploy host: srv911943) ─────────────────────────────
VPS_USER ?= root
VPS_HOST ?= 77.37.86.126

## SSH into the qual VPS. CMD='…' runs a remote command instead of an interactive shell. e.g. make vps CMD='cd /opt/daily-tour && docker compose ps'
vps:
	@ssh -o ConnectTimeout=12 $(VPS_USER)@$(VPS_HOST) $(CMD)

## Mint a guest redeem link for qual — prints the full https://…/r/<token> URL. e.g. make qual-token
qual-token:
	@ssh -o ConnectTimeout=12 $(VPS_USER)@$(VPS_HOST) 'bash -s' < scripts/qual/mint-guest-token.sh

## Export beta post-stay survey responses (all languages) to CSV on stdout. e.g. make survey-export > out.csv
survey-export:
	@node scripts/beta/export-survey-responses.mjs

## List available targets.
help:
	@echo "Daily Tour — make targets (ENV=$(ENV), env-file=$(ENV_FILE))"
	@echo ""
	@awk ' \
	  /^## / { sub(/^## /, ""); desc = $$0; next } \
	  /^[a-zA-Z][a-zA-Z0-9_-]*:/ && desc != "" { \
	    name = $$0; sub(/:.*/, "", name); \
	    printf "  %-13s %s\n", name, desc; desc = ""; next \
	  } \
	  { desc = "" } \
	' $(MAKEFILE_LIST)
	@echo ""
	@echo "Lifecycle targets: up start recreate down nuke stop restart build rebuild pull ps logs config sh env"
	@echo "Vars: ENV=dev|qual|staging|prod  SVC=<service>  OVERLAYS='-f …'"

# ─── k6 load tests ──────────────────────────────────────────────────────────
SCENARIO   ?= discover
BASE_URL   ?= http://localhost:8080
TOKEN_SVC_URL ?= http://localhost:8088
K6_OPTS    ?=

K6_DIR := tests/load/k6

.PHONY: load-test load-test-all

## Run a single k6 scenario. Usage: make load-test SCENARIO=discover BASE_URL=…
load-test:
	BASE_URL=$(BASE_URL) TOKEN_SVC_URL=$(TOKEN_SVC_URL) \
	  k6 run $(K6_OPTS) $(K6_DIR)/scenarios/$(SCENARIO).js

## Run all four k6 scenarios sequentially.
load-test-all:
	$(MAKE) load-test SCENARIO=token-exchange
	$(MAKE) load-test SCENARIO=discover
	$(MAKE) load-test SCENARIO=place-detail
	$(MAKE) load-test SCENARIO=tour-plan
