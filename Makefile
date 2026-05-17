# Daily Tour — developer shortcuts
#
# Requires: k6 (https://k6.io/docs/get-started/installation/)

SCENARIO   ?= discover
BASE_URL   ?= http://localhost:8080
TOKEN_SVC_URL ?= http://localhost:8088
K6_OPTS    ?=

K6_DIR := tests/load/k6

.PHONY: load-test load-test-all

## Run a single k6 scenario.
## Usage: make load-test SCENARIO=discover BASE_URL=http://api.dt.localhost
load-test:
	BASE_URL=$(BASE_URL) TOKEN_SVC_URL=$(TOKEN_SVC_URL) \
	  k6 run $(K6_OPTS) $(K6_DIR)/scenarios/$(SCENARIO).js

## Run all four scenarios sequentially.
load-test-all:
	$(MAKE) load-test SCENARIO=token-exchange
	$(MAKE) load-test SCENARIO=discover
	$(MAKE) load-test SCENARIO=place-detail
	$(MAKE) load-test SCENARIO=tour-plan
