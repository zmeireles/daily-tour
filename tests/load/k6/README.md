# k6 Load Tests

Four scenarios covering critical guest journeys. Each can run standalone or
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

| Scenario | File | VUs | Duration | p95 target | Error cap |
|---|---|---|---|---|---|
| Token exchange | `scenarios/token-exchange.js` | 50 | 1 min | 300 ms | 0.1% |
| Discover | `scenarios/discover.js` | 100 | 2 min | 500 ms | 0.5% |
| Place detail | `scenarios/place-detail.js` | 100 | 2 min | 200 ms | 0.1% |
| Tour plan | `scenarios/tour-plan.js` | 5 | 5 min | 30 s | 5% |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:8080` | BFF base URL |
| `TOKEN_SVC_URL` | `http://localhost:8088` | token-svc URL (internal; for local minting) |
| `K6_OPAQUE_TOKENS` | _(none)_ | Comma-separated pre-minted opaque tokens |
| `K6_PLACE_IDS` | dev-seed pool | Comma-separated place UUIDs |
| `K6_RESERVATION_IDS` | dev-seed pool | Comma-separated reservation UUIDs (for auto-mint) |
| `K6_LOC` | `37.7412,-25.6756` | `lat,lng` for discover requests |

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

Add a step in `.github/workflows/` once the QA VPS exists (T-0.4.4):

```yaml
- name: k6 load test
  run: |
    k6 run tests/load/k6/scenarios/discover.js \
      --env BASE_URL=${{ secrets.QA_API_URL }} \
      --env K6_OPAQUE_TOKENS=${{ secrets.QA_OPAQUE_TOKENS }}
```

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
