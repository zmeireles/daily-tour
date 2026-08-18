# k6 Load Tests

Five scenarios covering critical guest journeys. Each can run standalone or
via `make load-test`.

## Prerequisites

```bash
# Install k6 (Linux)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# macOS
brew install k6
```

## Scenarios

| Scenario                   | File                            | VUs      | Duration | p95 target | Error cap |
| -------------------------- | ------------------------------- | -------- | -------- | ---------- | --------- |
| Token exchange             | `scenarios/token-exchange.js`   | 50       | 1 min    | 300 ms     | 0.1%      |
| Discover                   | `scenarios/discover.js`         | 100      | 2 min    | 500 ms     | 0.5%      |
| Place detail (flood)       | `scenarios/place-detail.js`     | 100      | 2 min    | med 2.5 s  | 0.1%      |
| Place detail (latency SLO) | `scenarios/place-detail-slo.js` | 3/s open | 2 min    | p95 200 ms | 0.1%      |
| Tour plan                  | `scenarios/tour-plan.js`        | 5        | 5 min    | 30 s       | 5%        |

### ⚠️ Two place-detail scenarios, and the order matters

They answer different questions and neither replaces the other:

- **`place-detail.js` (flood)** offers ~500 req/s from a single IP against the
  BFF's 200/min global per-IP cap, so **>99% of it is rejected by design**. It
  asks _does the service survive a flood and keep rejecting cheaply?_ Its
  admitted-latency figure is **not** a UX signal: measured on 2026-08-18
  (#328), a 2-minute run admits exactly 400 requests and every one of them
  lands inside **2–11 seconds of the 120** — a thundering herd at the fixed
  limiter window's opening. That is why its tail swings ±40% between identical
  runs, and why its CI threshold is a loose median tripwire rather than a p95.
- **`place-detail-slo.js`** uses an **open** model (constant arrival rate, not
  VUs-with-sleep, so latency cannot throttle offered load) at 3 req/s — under
  the cap — and asks _how fast is a request that is simply served?_ At the
  shipped `cpus: "0.5"` limits this measures **p95 ≈ 69 ms**, well inside the
  200 ms UX SLO.

🔴 **Run the SLO scenario before any flooding scenario, never after.** All
scenarios share one per-IP limiter window, and `place-detail-slo.js` asserts
that ~nothing was rejected (`place_detail_slo_throttled < 1%`) so it can tell
"I measured served latency" from "I measured who won a race". Start it while a
flood has the window consumed and it fails as **invalid**, which is the correct
behaviour and an unhelpful thing to debug at 2 a.m. `make load-test-all` and
the CI workflow both already order it first.

## Environment variables

| Variable             | Default                 | Description                                       |
| -------------------- | ----------------------- | ------------------------------------------------- |
| `BASE_URL`           | `http://localhost:8080` | BFF base URL                                      |
| `TOKEN_SVC_URL`      | `http://localhost:8088` | token-svc URL (internal; for local minting)       |
| `K6_OPAQUE_TOKENS`   | _(none)_                | Comma-separated pre-minted opaque tokens          |
| `K6_PLACE_IDS`       | dev-seed pool           | Comma-separated place UUIDs                       |
| `K6_RESERVATION_IDS` | dev-seed pool           | Comma-separated reservation UUIDs (for auto-mint) |
| `K6_LOC`             | `37.7412,-25.6756`      | `lat,lng` for discover requests                   |

## Running locally

The stack must be up (`pnpm dev` or `docker compose up`).

```bash
# Single scenario
k6 run tests/load/k6/scenarios/discover.js

# Override target URL
BASE_URL=http://api.dt.localhost k6 run tests/load/k6/scenarios/discover.js

# Provide pre-minted tokens (skip internal token-svc call)
K6_OPAQUE_TOKENS=abc123,def456 k6 run tests/load/k6/scenarios/token-exchange.js

# Via Makefile
make load-test SCENARIO=discover
make load-test SCENARIO=place-detail BASE_URL=http://api.dt.localhost
```

## Running against QA VPS

Once the QA VPS is provisioned (Plan-002 Slice 2.A), point `BASE_URL` at the
public API endpoint. `TOKEN_SVC_URL` stays internal — pre-mint tokens out-of-band
and pass them via `K6_OPAQUE_TOKENS`.

```bash
K6_OPAQUE_TOKENS=$(./scripts/mint-load-test-tokens.sh) \
  BASE_URL=https://api.qa.yourdomain.com \
  k6 run tests/load/k6/scenarios/token-exchange.js
```

## CI integration

`.github/workflows/load-test.yml` runs three scenarios (token-exchange, discover,
place-detail) against a Docker Compose stack on every PR that carries the
`load-test` label, and nightly at 02:00 UTC.

`tour-plan.js` is excluded from the CI run — it requires `planner-svc` and an
`ANTHROPIC_API_KEY`, neither of which is in the minimum CI stack.

### Triggering on a PR

Add the **`load-test`** label to a pull request. The workflow starts automatically
and uploads results as a `k6-results-<run-id>` artifact (retained 14 days).

```
gh pr edit <number> --add-label load-test
```

### How the CI stack works

1. Base infrastructure starts first (postgres, redis, rabbitmq, minio).
2. App services start next — only `bff`, `token-svc`, `media-svc`, `catalog-svc`.
3. Seeds populate reservations (token-svc) and places (catalog-svc).
4. k6 runs inside the `dt_internal` Docker network, reaching services by their
   container names (`dt_bff:8080`, `dt_token_svc:8088`).
5. Any threshold breach causes the job to fail with exit code 99.

### Nightly run

The scheduled run at `cron: '0 2 * * *'` exercises the same scenarios without
needing a label. Check the **Actions → Load Tests** tab for results.

## Rate limit note (token-exchange)

`/r/:token` has a 30 req/min cap per source IP on the BFF. Running 50 VUs
from a single host will trigger 429s. The test accounts for this:

- 429s are not counted as errors (threshold covers 5xx only).
- `exchangeDuration` only records 200 and 5xx response times.
- A 500 ms sleep between iterations reduces the per-IP hit rate.

In production, guests arrive from distinct IPs so the per-IP cap is not a
real-world ceiling. A cloud-based k6 run (e.g. k6 Cloud) with distributed
IPs gives a truer picture.

## Fixture place IDs

Dev-seed IDs match `services/catalog-svc/seeds/places-sao-miguel.sql`
(`c0000001-0000-4000-a000-000000000001` → `…000000000015`). Re-running the
seed is idempotent (`ON CONFLICT DO NOTHING`).
