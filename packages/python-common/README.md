# `daily_tour_common` — Python shared package

The Python equivalent of `@daily-tour/shared-types` + `@daily-tour/shared-otel`. Every FastAPI service in the Daily Tour monorepo (`search-svc`, `planner-svc`, `ingest-svc`) imports from here so they share one source of truth for domain models, OpenTelemetry bootstrap, structured logging, and the `/health` contract.

This is a Python-only package; pnpm and Turborepo ignore it (no `package.json`).

## Install

```bash
cd packages/python-common
uv sync --all-extras
uv run pytest
```

If `uv` isn't on PATH, install it via `curl -LsSf https://astral.sh/uv/install.sh | sh`, then `export PATH="$HOME/.local/bin:$PATH"`.

A `pip`-based flow also works for environments where `uv` isn't available:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Usage

A typical Python service bootstraps like this:

```python
# services/search-svc/src/main.py
from daily_tour_common import init_otel, create_app

# Must be called before any FastAPI/HTTPX/asyncpg/aio-pika import is instrumented.
init_otel("search-svc")

app = create_app("search-svc")

@app.get("/v1/places")
async def discover(...):
    ...
```

`create_app(service_name)` returns a `FastAPI` instance pre-configured with:

- `GET /health` → `{"status": "ok", "service": <name>, "version": <__version__>}`
- CORS middleware (origins read from `CORS_ALLOW_ORIGINS` env var; default `[]`)
- OTel instrumentation (when `init_otel` ran first)
- JSON-line structured logging (uvicorn loggers piped through structlog)

## Models — mirrors of `@daily-tour/shared-types`

Pydantic v2 with `ConfigDict(extra="forbid")` so undeclared fields raise — matches the zod `.strict()` semantics on the Node side. Field names are intentionally identical so JSON crosses the wire without translation.

| Python class | Zod schema (Node) | Module |
| --- | --- | --- |
| `Place` | `PlaceSchema` | `models/place.py` |
| `PlaceCandidate` | `PlaceCandidateSchema` | `models/place.py` |
| `Action` | `ActionSchema` | `models/action.py` |
| `Wish` | `WishSchema` | `models/action.py` |
| `TourStep` | `TourStepSchema` | `models/tour.py` |
| `TourPlan` | `TourPlanSchema` | `models/tour.py` |
| `Geom` | `GeomSchema` | `models/common.py` |
| `I18nText` (type alias) | `I18nTextSchema` | `models/common.py` |
| `Locale`, `PlaceStatus`, `TourPlanStatus`, `TourSlot`, `OwnerScope`, `MediaKind` | matching enums | `models/enums.py` |

Models the Node BFF owns (`Reservation`, `OwnerProfile`, `ChatThread`, `Message`, …) are **not** mirrored here. Add them only when a Python service legitimately needs them.

## OpenTelemetry contract

The Python helper honours the same env vars as `@daily-tour/shared-otel`:

| Variable | Default | Behaviour |
| --- | --- | --- |
| `OTEL_SERVICE_NAME` | (required) | Passed via `init_otel(service_name=...)` or env. |
| `OTEL_SERVICE_VERSION` | `"0.0.0"` | Resource attr. |
| `OTEL_DEPLOYMENT_ENVIRONMENT` | `"development"` | Resource attr. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (unset) | If set, OTLP HTTP trace exporter is wired. Skipped when `PYTHON_ENV=test`. |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | (unset) | Metric reader only registered when this is set. |
| `OTEL_LOG_LEVEL` | `"INFO"` | Used by both OTel diag and structlog. |
| `CORS_ALLOW_ORIGINS` | `[]` | Comma-separated list parsed into `cors_allow_origins`. |

Auto-instrumented (each guarded with try/except `ImportError` so missing optional deps don't crash imports): `FastAPI`, `ASGI`, `HTTPX`, `AsyncPG` (Postgres + pgvector), `aio-pika` (RabbitMQ).

## Testing

```bash
uv run pytest          # 26 tests
uv run ruff check .    # lint
uv run ruff format --check .
uv run mypy src        # strict mode, pydantic.mypy plugin
```

Tests mock the OTel SDK and instrumentors — no network calls, no live OTLP collector required.

## CI integration

Not yet — this package is invisible to the existing Node CI workflows. Python lint/typecheck/test/audit will land in **T-2.0.0** alongside the first Python service (`search-svc`). The TODO comments in `.github/workflows/security.yml` (CodeQL `python` language) and `lefthook.yml` (ruff/mypy hooks) reference that task.

## Versioning

`__version__` lives in `daily_tour_common/version.py`. Bump rules mirror `@daily-tour/shared-types/VERSION`: minor for additive changes, major for breaking renames or removed fields. Field-name parity with the zod schemas is load-bearing — keep both in sync when evolving the contract.
