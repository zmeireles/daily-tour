# syntax=docker/dockerfile:1.7
#
# planner-svc — FastAPI + Anthropic SDK + asyncpg + aio-pika.
# Build context MUST be the repo root (so the workspace sibling
# `packages/python-common` is reachable for the editable dep).
#
#   docker build -f services/planner-svc/Dockerfile -t daily-tour/planner-svc:dev .

ARG PYTHON_VERSION=3.12-slim-bookworm

# ─── builder: resolve deps into a project-local .venv ────────────────────
FROM python:${PYTHON_VERSION} AS builder
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PYTHONDONTWRITEBYTECODE=1
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app

# Copy the workspace sibling first so the path source in pyproject.toml resolves.
COPY packages/python-common/ /workspace/packages/python-common/
COPY services/planner-svc/pyproject.toml services/planner-svc/uv.lock* /app/
RUN uv sync --frozen --no-install-project --no-dev || \
    uv sync --no-install-project --no-dev

COPY services/planner-svc/src/ /app/src/
RUN uv sync --frozen --no-dev || uv sync --no-dev

# ─── runtime: non-root, minimal layer ────────────────────────────────────
FROM python:${PYTHON_VERSION} AS runtime
RUN addgroup --system app && adduser --system --ingroup app app \
 && apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --from=builder --chown=app:app /app/src /app/src
COPY --from=builder --chown=app:app /workspace/packages/python-common /workspace/packages/python-common
ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONPATH="/app/src" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
USER app
EXPOSE 8083
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-m", "planner_svc"]
