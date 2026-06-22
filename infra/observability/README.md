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

| UI         | URL                                                  | Default credentials |
| ---------- | ---------------------------------------------------- | ------------------- |
| Prometheus | `http://127.0.0.1:${DT_HOST_PORT_PROMETHEUS:-27990}` | none                |
| Grafana    | `http://127.0.0.1:${DT_HOST_PORT_GRAFANA:-27300}`    | admin / admin       |

Override `GF_SECURITY_ADMIN_PASSWORD` in `dev-environment` to change the Grafana password.

## Metrics path (OTLP → collector → Prometheus)

The 8 application services do **not** expose a `/metrics` endpoint. They push
OTLP metrics (and traces) to the `otel-collector` (`dt_otel_collector`, defined
in `docker-compose.app.yml`) when `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` is set.
The collector re-exposes those metrics in Prometheus exposition format on its
internal `:8889` (never published to the host). Prometheus then scrapes that
single endpoint over `dt_internal`:

| Job            | Target                  | Port |
| -------------- | ----------------------- | ---- |
| otel-collector | dt_otel_collector       | 8889 |
| prometheus     | localhost (self-scrape) | 9090 |

Per-service identity is preserved by the `service` label: the collector's
`resource_to_telemetry_conversion` promotes the OTLP `service.name` resource
attribute to a Prometheus label. If the collector is down, the
`otel-collector` target shows `DOWN` and app series go stale.

## Dashboards

Four dashboards are provisioned automatically from `grafana/dashboards/`:

| Dashboard      | UID                 | Description                                       |
| -------------- | ------------------- | ------------------------------------------------- |
| BFF Latency    | `dt-bff-latency`    | p50/p95/p99 HTTP latency by route + request rate  |
| Service Health | `dt-service-health` | UP/DOWN status, RSS memory, CPU usage per service |
| MQ Depth       | `dt-mq-depth`       | RabbitMQ queue depth, publish rate, consume rate  |
| Error Rate     | `dt-error-rate`     | 5xx/4xx rate and error ratio by service and route |

## Metric naming

The dashboards (Phase 2 work — not yet reconciled to the OTLP series) assume these metric names:

- `http_request_duration_seconds_bucket` — HTTP latency histogram (labels: `route`, `method`, `status_code`)
- `http_requests_total` — HTTP request counter (labels: `route`, `method`, `status_code`)
- `process_resident_memory_bytes` — RSS memory (standard prom-client)
- `process_cpu_seconds_total` — CPU time (standard prom-client)
- `rabbitmq_queue_messages` — queue depth (RabbitMQ Prometheus plugin or exporter)
- `rabbitmq_queue_messages_published_total` — publish counter
- `rabbitmq_queue_messages_delivered_total` — delivery counter

Services that have not yet wired up `/metrics` will show no data for their panels — the dashboards remain functional (empty series) and the UP/DOWN stat uses the built-in Prometheus `up` metric which is always present.

## Volumes

| Volume               | Purpose                 |
| -------------------- | ----------------------- |
| `dt_prometheus_data` | TSDB (7-day retention)  |
| `dt_grafana_data`    | Grafana DB + user state |

## Troubleshooting

| Symptom                             | Fix                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `otel-collector` target shows DOWN  | The collector is not running or `:8889` is unreachable on `dt_internal`. Check `docker compose ps` and the collector logs.                                |
| Grafana shows "No data" for a panel | Either the service isn't setting `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, or the dashboard's metric names predate the OTLP series (Phase 2 reconciliation). |
| Port conflict on 27990 or 27300     | Override via `DT_HOST_PORT_PROMETHEUS` / `DT_HOST_PORT_GRAFANA` in `dev-environment`.                                                                     |
| Grafana login fails                 | Default credentials are `admin` / `admin`. Override with `GF_SECURITY_ADMIN_PASSWORD`.                                                                    |
