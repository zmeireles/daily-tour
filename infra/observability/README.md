# `infra/observability/` — Prometheus + Grafana (T-5.4.0)

Metrics collection and dashboards for the Daily Tour platform.

## Bring up

Add `overlay.observability.yml` to your Compose chain:

```bash
docker compose \
  --env-file dev-environment \
  -f infra/compose/docker-compose.base.yml \
  -f infra/compose/docker-compose.traefik.yml \
  -f infra/compose/docker-compose.app.yml \
  -f infra/compose/overlay.observability.yml \
  up -d --build
```

## Access

| UI          | URL                                                         | Default credentials |
| ----------- | ----------------------------------------------------------- | ------------------- |
| Prometheus  | `http://127.0.0.1:${DT_HOST_PORT_PROMETHEUS:-27990}`        | none                |
| Grafana     | `http://127.0.0.1:${DT_HOST_PORT_GRAFANA:-27300}`           | admin / admin       |

Override `GF_SECURITY_ADMIN_PASSWORD` in `dev-environment` to change the Grafana password.

## Scraped services

Prometheus scrapes `/metrics` from all seven application services on `dt_internal`:

| Job         | Target              | Port |
| ----------- | ------------------- | ---- |
| bff         | dt_bff              | 8080 |
| catalog-svc | dt_catalog_svc      | 8081 |
| search-svc  | dt_search_svc       | 8082 |
| planner-svc | dt_planner_svc      | 8083 |
| chat-hub    | dt_chat_hub         | 8084 |
| media-svc   | dt_media_svc        | 8087 |
| token-svc   | dt_token_svc        | 8088 |

Services that are not running (e.g. `chat-hub` or `search-svc` in a partial stack) appear as `DOWN` in Prometheus — scraping continues for the remaining targets.

## Dashboards

Four dashboards are provisioned automatically from `grafana/dashboards/`:

| Dashboard      | UID                 | Description                                             |
| -------------- | ------------------- | ------------------------------------------------------- |
| BFF Latency    | `dt-bff-latency`    | p50/p95/p99 HTTP latency by route + request rate        |
| Service Health | `dt-service-health` | UP/DOWN status, RSS memory, CPU usage per service       |
| MQ Depth       | `dt-mq-depth`       | RabbitMQ queue depth, publish rate, consume rate        |
| Error Rate     | `dt-error-rate`     | 5xx/4xx rate and error ratio by service and route       |

## Metric naming

The dashboards assume these metric names (emitted by `prom-client` on Node.js services and `prometheus-fastapi-instrumentator` on Python services):

- `http_request_duration_seconds_bucket` — HTTP latency histogram (labels: `route`, `method`, `status_code`)
- `http_requests_total` — HTTP request counter (labels: `route`, `method`, `status_code`)
- `process_resident_memory_bytes` — RSS memory (standard prom-client)
- `process_cpu_seconds_total` — CPU time (standard prom-client)
- `rabbitmq_queue_messages` — queue depth (RabbitMQ Prometheus plugin or exporter)
- `rabbitmq_queue_messages_published_total` — publish counter
- `rabbitmq_queue_messages_delivered_total` — delivery counter

Services that have not yet wired up `/metrics` will show no data for their panels — the dashboards remain functional (empty series) and the UP/DOWN stat uses the built-in Prometheus `up` metric which is always present.

## Volumes

| Volume               | Purpose                      |
| -------------------- | ---------------------------- |
| `dt_prometheus_data` | TSDB (15-day retention)      |
| `dt_grafana_data`    | Grafana DB + user state      |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Target shows DOWN in Prometheus | The service is not running or not exposing `/metrics`. Check `docker compose ps`. |
| Grafana shows "No data" for a panel | The service has not yet instrumented `/metrics` — expected until each service adds `prom-client`. |
| Port conflict on 27990 or 27300 | Override via `DT_HOST_PORT_PROMETHEUS` / `DT_HOST_PORT_GRAFANA` in `dev-environment`. |
| Grafana login fails | Default credentials are `admin` / `admin`. Override with `GF_SECURITY_ADMIN_PASSWORD`. |
