# Backup + Recovery Runbook

> **T-3.B.4** — Authoritative backup schedule, RPO/RTO targets, step-by-step restore procedures, and drill cadence for all stateful components in the Daily Tour stack.

## Quick-reference table

| Component              | Volume / path                 | RPO             | RTO    | Strategy                                                                                        |
| ---------------------- | ----------------------------- | --------------- | ------ | ----------------------------------------------------------------------------------------------- |
| PostgreSQL (main)      | `dt_postgres_data`            | 15 min          | 30 min | Nightly logical `pg_dump` → MinIO (automated, T-3.B.0); WAL+base PITR deferred (Plan-004/3.B.1) |
| PostgreSQL (Authentik) | `dt_authentik_postgres_data`  | 24 h            | 45 min | Nightly logical `pg_dump` → MinIO (automated, T-3.B.0)                                          |
| MinIO (media)          | `dt_minio_data`               | 24 h            | 60 min | Nightly `mc mirror` to B2                                                                       |
| n8n workflows          | `dt_n8n_data`                 | 24 h            | 30 min | Nightly pg_dump (Phase 5) / volume snapshot (Phase 0–4)                                         |
| Authentik blueprints   | `infra/authentik/blueprints/` | N/A             | 10 min | In git — restore from branch                                                                    |
| Redis                  | `dt_redis_data`               | N/A (ephemeral) | 0 min  | No backup; reconstructed from upstream on restart                                               |
| RabbitMQ               | `dt_rabbitmq_data`            | N/A (ephemeral) | 5 min  | Definitions file in git; in-flight messages accepted as lost                                    |

---

## Off-site storage

**Recommended provider**: [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html)

| Tier | Retention | Storage class                | Estimated cost (1 GB base)            |
| ---- | --------- | ---------------------------- | ------------------------------------- |
| Hot  | 30 days   | B2 Standard                  | ~$0.006/GB/month                      |
| Cold | 1 year    | B2 Standard (lifecycle rule) | same; no retrieval cost for small ops |

**Why B2 over S3 Glacier**: For a single-VPS operator, Glacier Deep Archive retrieval latency (12 h) is impractical during an incident. B2 gives immediate retrieval at competitive price. If regulatory retention >1 year is ever required, add a second lifecycle rule to copy 30 d+ objects to a Glacier-equivalent policy.

**Bucket layout**:

```
b2://daily-tour-backups/
  postgres/main/          # WAL archives + base backups
  postgres/authentik/     # pg_dump .sql.gz files
  minio-mirror/           # mc mirror output (all buckets)
  n8n/                    # volume snapshots or pg_dump
```

**Credentials**: Store `B2_KEY_ID` and `B2_APP_KEY` in `.env` under the `B2_*` prefix. Never commit.

---

## 1. PostgreSQL (main cluster — `dt_postgres`)

**Database**: `dailytour` on Postgres 17 + pgvector  
**Schemas**: `public` (core app), `n8n` (Phase 5 only), all created by `infra/postgres/init/`

### Backup schedule

| Job           | Frequency                    | Method                                              | Retention                       |
| ------------- | ---------------------------- | --------------------------------------------------- | ------------------------------- |
| Base backup   | Nightly 02:00 UTC            | `pg_basebackup`                                     | 7 days local, 30 days B2        |
| WAL archiving | Continuous (15-min segments) | `archive_command` → rclone                          | 48 h local, 30 days B2          |
| Logical dump  | Nightly                      | `pg_dump -Fc -Z 9` → MinIO **(automated, T-3.B.0)** | 7 days, `BACKUP_RETENTION_DAYS` |

> The logical dump is **automated** via `scripts/ops/backup-postgres.sh` (uploads `postgres/main/` to the private `backups` bucket on the in-cluster MinIO; pruned by `BACKUP_RETENTION_DAYS`). Restorability is proven by `scripts/ops/restore-drill-postgres.sh`.
> **Deferred (Plan-004 / T-3.B.1):** WAL+base PITR (15-min RPO) and Backblaze-B2 off-site replication are not yet wired — the MinIO logical dump is the current automated path.
>
> **⚠️ Signed DR disposition (F&F beta, 2026-06-22):** the nightly dump lands in the **same-box** MinIO, on the same disk as the live data. This protects against logical corruption / bad migrations / accidental deletes, but **NOT box loss / disk failure / VPS termination**. On-box-only is **explicitly accepted for the friends-and-family beta** (tiny DBs, no real prod users yet); the off-site (Backblaze-B2) leg that closes the disk-loss-DR gap is deferred to T-3.B.1 / Plan-004. — accepted by the project owner.

#### Scheduling (systemd timer)

The nightly run is driven by a **systemd timer** on the qual box (chosen over a GitHub-scheduled workflow for reboot-survivable, GitHub-independent reliability). Units are committed at `infra/systemd/dt-backup.{service,timer}` (01:00 UTC, `Persistent=true`). One-time install as root:

```bash
cp /opt/daily-tour/infra/systemd/dt-backup.{service,timer} /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now dt-backup.timer
systemctl start dt-backup.service   # manual/on-demand run; logs in journalctl -u dt-backup.service
```

#### Nightly base backup script (`/opt/dt-backup/postgres-base.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=/var/backups/dt/postgres/base
DATE=$(date -u +%Y%m%dT%H%M%SZ)
DEST="${BACKUP_DIR}/${DATE}"

mkdir -p "${DEST}"

docker exec dt_postgres pg_basebackup \
  -U "${POSTGRES_USER:-postgres}" \
  -D /tmp/pgbase \
  --wal-method=stream \
  --format=tar \
  --compress=9 \
  --checkpoint=fast \
  --progress

docker cp dt_postgres:/tmp/pgbase/. "${DEST}/"
docker exec dt_postgres rm -rf /tmp/pgbase

# Prune local copies older than 7 days
find "${BACKUP_DIR}" -maxdepth 1 -mindepth 1 -type d -mtime +7 -exec rm -rf {} +

# Upload to B2
rclone copy "${DEST}" "b2:daily-tour-backups/postgres/main/${DATE}/" --transfers 4

echo "Base backup complete: ${DEST}"
```

#### WAL archiving (`postgresql.conf` additions)

```conf
wal_level = replica
archive_mode = on
archive_command = 'rclone copy %p b2:daily-tour-backups/postgres/main/wal/%f --config /etc/rclone/rclone.conf && cp %p /var/backups/dt/postgres/wal/%f'
archive_timeout = 900   # 15-minute WAL segments even on idle DB
```

Apply via `infra/postgres/Dockerfile` `COPY` or a mounted config overlay — do not edit the container's live `postgresql.conf` directly.

#### Nightly logical dump (`/opt/dt-backup/postgres-dump.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/var/backups/dt/postgres/dumps/${DATE}.dump

mkdir -p "$(dirname "${OUT}")"

docker exec dt_postgres pg_dump \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-dailytour}" \
  -Fc -Z 9 \
  -f /tmp/latest.dump

docker cp dt_postgres:/tmp/latest.dump "${OUT}"
docker exec dt_postgres rm -f /tmp/latest.dump

find /var/backups/dt/postgres/dumps -name "*.dump" -mtime +7 -delete

rclone copy "${OUT}" "b2:daily-tour-backups/postgres/main/dumps/"
echo "Logical dump complete: ${OUT}"
```

### Recovery procedure

**RPO**: 15 min (WAL) | **RTO**: 30 min

#### Option A — Full cluster restore from WAL + base backup

```bash
# 1. Stop the app stack (keep Postgres up for controlled shutdown)
docker compose -f infra/compose/docker-compose.app.yml down

# 2. Stop Postgres
docker compose -f infra/compose/docker-compose.base.yml stop postgres

# 3. Download the most recent base backup from B2
rclone ls b2:daily-tour-backups/postgres/main/ | grep -v 'wal/' | sort | tail -5
BASE_TS=<chosen-timestamp>
mkdir -p /var/restore/pgbase
rclone copy "b2:daily-tour-backups/postgres/main/${BASE_TS}/" /var/restore/pgbase/

# 4. Wipe and restore data volume
docker volume rm dt_postgres_data
docker volume create dt_postgres_data
docker run --rm \
  -v dt_postgres_data:/var/lib/postgresql/data \
  -v /var/restore/pgbase:/pgbase:ro \
  postgres:17 \
  bash -c "tar xf /pgbase/base.tar.gz -C /var/lib/postgresql/data"

# 5. Place recovery.conf (Postgres 17: recovery.signal + postgresql.conf params)
docker run --rm \
  -v dt_postgres_data:/var/lib/postgresql/data \
  postgres:17 \
  bash -c "
    touch /var/lib/postgresql/data/recovery.signal
    cat >> /var/lib/postgresql/data/postgresql.conf <<EOF
restore_command = 'rclone copy b2:daily-tour-backups/postgres/main/wal/%f %p --config /etc/rclone/rclone.conf'
recovery_target_time = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
recovery_target_action = 'promote'
EOF
  "

# 6. Start Postgres — it will replay WAL to the target time
docker compose -f infra/compose/docker-compose.base.yml up -d postgres

# 7. Tail logs and wait for "database system is ready"
docker logs -f dt_postgres 2>&1 | grep -m 1 "database system is ready"

# 8. Restart app stack
docker compose -f infra/compose/docker-compose.app.yml up -d
```

#### Option B — Single-table or schema restore from logical dump

```bash
# Download latest dump
rclone copy "b2:daily-tour-backups/postgres/main/dumps/" /var/restore/dumps/ \
  --include "*.dump" --max-age 24h

DUMP=$(ls -t /var/restore/dumps/*.dump | head -1)

# Restore specific table (e.g. tours.places)
docker exec -i dt_postgres pg_restore \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-dailytour}" \
  --table=places \
  --data-only \
  < "${DUMP}"
```

#### Verification steps

```bash
# Row counts sanity check
docker exec dt_postgres psql -U postgres -d dailytour -c \
  "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;"

# pgvector extension present
docker exec dt_postgres psql -U postgres -d dailytour -c "\dx" | grep vector

# Latest WAL applied
docker exec dt_postgres psql -U postgres -c "SELECT pg_last_wal_replay_lsn(), now();"
```

---

## 2. PostgreSQL (Authentik — `dt_authentik_postgres`)

**Database**: `authentik` on Postgres 16  
**Note**: This is a separate cluster dedicated to Authentik. Schema is managed entirely by Authentik's Django migrations — never edit it directly.

### Backup schedule

| Job          | Frequency | Method                                              | Retention                       |
| ------------ | --------- | --------------------------------------------------- | ------------------------------- |
| Logical dump | Nightly   | `pg_dump -Fc -Z 9` → MinIO **(automated, T-3.B.0)** | 7 days, `BACKUP_RETENTION_DAYS` |

> The Authentik dump is **automated** via `scripts/ops/backup-postgres.sh` (same run as the main cluster; uploads `postgres/authentik/` to the private `backups` bucket). Backblaze-B2 off-site replication remains **deferred** (Plan-004 / T-3.B.1).

WAL archiving is not configured for Authentik's Postgres. A 24-hour RPO is acceptable because Authentik state (users, OAuth apps, tokens) changes infrequently. If MFA tokens or active sessions are lost, users re-authenticate — acceptable UX.

#### Script (`/opt/dt-backup/authentik-postgres-dump.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/var/backups/dt/postgres/authentik/${DATE}.dump

mkdir -p "$(dirname "${OUT}")"

docker exec dt_authentik_postgres pg_dump \
  -U authentik -d authentik -Fc -Z 9 -f /tmp/authentik.dump

docker cp dt_authentik_postgres:/tmp/authentik.dump "${OUT}"
docker exec dt_authentik_postgres rm -f /tmp/authentik.dump

find /var/backups/dt/postgres/authentik -name "*.dump" -mtime +7 -delete

rclone copy "${OUT}" "b2:daily-tour-backups/postgres/authentik/"
echo "Authentik PG dump complete: ${OUT}"
```

### Recovery procedure

**RPO**: 24 h | **RTO**: 45 min

```bash
# 1. Stop Authentik
docker compose -f infra/compose/docker-compose.authentik.yml down

# 2. Wipe and recreate Authentik Postgres volume
docker volume rm dt_authentik_postgres_data
docker volume create dt_authentik_postgres_data

# 3. Start a bare Postgres 16 to init the cluster
docker compose -f infra/compose/docker-compose.authentik.yml up -d authentik-postgres
docker compose -f infra/compose/docker-compose.authentik.yml \
  exec authentik-postgres pg_isready -U authentik -d authentik

# 4. Download latest dump
rclone ls "b2:daily-tour-backups/postgres/authentik/" | sort | tail -3
DUMP_FILE=<chosen>.dump
rclone copy "b2:daily-tour-backups/postgres/authentik/${DUMP_FILE}" /var/restore/

# 5. Drop + recreate the database, then restore
docker exec dt_authentik_postgres psql -U authentik -c "DROP DATABASE IF EXISTS authentik;"
docker exec dt_authentik_postgres psql -U authentik -c "CREATE DATABASE authentik;"
docker cp "/var/restore/${DUMP_FILE}" dt_authentik_postgres:/tmp/restore.dump
docker exec dt_authentik_postgres pg_restore \
  -U authentik -d authentik --no-owner --role=authentik /tmp/restore.dump
docker exec dt_authentik_postgres rm /tmp/restore.dump

# 6. Start full Authentik stack
docker compose -f infra/compose/docker-compose.authentik.yml up -d
docker logs -f dt_authentik_server 2>&1 | grep -m 1 "Starting server"
```

#### Verification steps

```bash
# Authentik health
curl -fsS http://localhost:9000/-/health/live/

# Check users table populated
docker exec dt_authentik_postgres psql -U authentik -d authentik -c \
  "SELECT COUNT(*) FROM authentik_core_user;"

# Login to admin UI and verify owner-app provider still present
# http://auth.dt.localhost/if/admin/
```

#### Blueprint fallback

If the dump is unavailable or corrupt, Authentik can be rebuilt from blueprints:

```bash
# Blueprints are in git — never lost
ls infra/authentik/blueprints/

# Start Authentik fresh; worker applies blueprints on first boot
docker compose -f infra/compose/docker-compose.authentik.yml up -d

# Re-enroll the owner account via /if/admin/
```

The OIDC client secret (`AUTHENTIK_OWNER_APP_CLIENT_SECRET`) is in `.env` and the secrets-rotation-playbook — re-issue only if both the dump and the `.env` backup are lost simultaneously.

---

## 3. MinIO (media assets — `dt_minio`)

**Volume**: `dt_minio_data`  
**Buckets**: managed by `infra/minio/init.sh` — all under `/data` in the container.

### Backup schedule

| Job          | Frequency         | Method                           | Retention                          |
| ------------ | ----------------- | -------------------------------- | ---------------------------------- |
| Mirror to B2 | Nightly 03:00 UTC | `mc mirror --overwrite --remove` | 30 days B2 (B2 file versioning on) |

Turn on B2 file versioning for the `minio-mirror/` prefix so accidental deletes survive.

#### Script (`/opt/dt-backup/minio-mirror.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

# mc alias must be configured: mc alias set local http://localhost:27900 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
# mc alias set b2backup https://s3.us-west-004.backblazeb2.com $B2_KEY_ID $B2_APP_KEY

mc mirror \
  --overwrite \
  --remove \
  --preserve \
  local/ \
  b2backup/daily-tour-backups/minio-mirror/

echo "MinIO mirror complete: $(date -u)"
```

### Recovery procedure

**RPO**: 24 h | **RTO**: 60 min

```bash
# 1. Start MinIO (fresh volume is fine — mc mirror restores all objects)
docker volume rm dt_minio_data
docker volume create dt_minio_data
docker compose -f infra/compose/docker-compose.base.yml up -d minio minio-init

# 2. Wait for MinIO healthy
docker compose -f infra/compose/docker-compose.base.yml \
  exec minio mc ready local

# 3. Configure mc alias against the new instance
docker exec dt_minio_init mc alias set local \
  http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

# 4. Mirror from B2 back to local
docker exec dt_minio_init mc mirror \
  --overwrite \
  b2backup/daily-tour-backups/minio-mirror/ \
  local/

echo "MinIO restore complete"
```

#### Point-in-time object recovery (B2 versioning)

```bash
# List versions of a specific object
mc ls --versions b2backup/daily-tour-backups/minio-mirror/media/tours/<place-id>/hero.jpg

# Restore a specific version
mc cp --version-id <version-id> \
  b2backup/daily-tour-backups/minio-mirror/media/tours/<place-id>/hero.jpg \
  local/media/tours/<place-id>/hero.jpg
```

#### Verification steps

```bash
# Object count before and after
mc ls --recursive local/ | wc -l

# Spot-check a known asset is accessible
curl -fsI "http://localhost:27900/media/tours/<known-id>/hero.jpg"

# Confirm public/ prefix policy
mc policy get local/media
```

---

## 4. n8n workflows (`dt_n8n`)

**Phase 0–4**: SQLite at `/home/node/.n8n/database.sqlite` inside volume `dt_n8n_data`.  
**Phase 5**: Migrates to dedicated `n8n` Postgres role (already provisioned in `infra/postgres/init/02-roles.sql`). Update this section at migration time.

### Backup schedule (Phase 0–4 — SQLite)

| Job             | Frequency         | Method               | Retention                |
| --------------- | ----------------- | -------------------- | ------------------------ |
| Volume snapshot | Nightly 01:45 UTC | Stop + tar + restart | 7 days local, 30 days B2 |

n8n must be stopped during the SQLite backup to avoid a mid-write snapshot.

#### Script (`/opt/dt-backup/n8n-sqlite.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/var/backups/dt/n8n/${DATE}.tar.gz

mkdir -p "$(dirname "${OUT}")"

# Stop n8n gracefully
docker compose -f infra/compose/docker-compose.n8n.yml stop n8n

# Snapshot the volume
docker run --rm \
  -v dt_n8n_data:/src:ro \
  -v "$(dirname "${OUT}"):/dest" \
  alpine tar czf "/dest/${DATE}.tar.gz" -C /src .

# Restart n8n
docker compose -f infra/compose/docker-compose.n8n.yml start n8n

find /var/backups/dt/n8n -name "*.tar.gz" -mtime +7 -delete
rclone copy "${OUT}" "b2:daily-tour-backups/n8n/"
echo "n8n backup complete: ${OUT}"
```

### Backup schedule (Phase 5 — Postgres role)

Add n8n's role to the nightly logical dump once the Postgres migration is complete:

```bash
# Additional pg_dump targeting just the n8n schema
docker exec dt_postgres pg_dump \
  -U postgres -d dailytour \
  --schema=n8n -Fc -Z 9 \
  -f /tmp/n8n.dump
```

### Recovery procedure

**RPO**: 24 h | **RTO**: 30 min

```bash
# 1. Stop n8n
docker compose -f infra/compose/docker-compose.n8n.yml stop n8n

# 2. Download latest snapshot
rclone ls "b2:daily-tour-backups/n8n/" | sort | tail -3
rclone copy "b2:daily-tour-backups/n8n/<chosen>.tar.gz" /var/restore/

# 3. Restore volume
docker volume rm dt_n8n_data
docker volume create dt_n8n_data

docker run --rm \
  -v dt_n8n_data:/dest \
  -v /var/restore:/src:ro \
  alpine tar xzf /src/<chosen>.tar.gz -C /dest

# 4. Start n8n and verify
docker compose -f infra/compose/docker-compose.n8n.yml start n8n
curl -fsS "http://n8n.dt.localhost/healthz"
```

#### Verification steps

```bash
# n8n health endpoint
curl -fsS "http://n8n.dt.localhost/healthz"

# Log in to the n8n UI and confirm workflows are present
# http://n8n.dt.localhost/

# Check workflow count via API (requires n8n session token)
curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "http://n8n.dt.localhost/api/v1/workflows" | jq '.count'
```

---

## 5. Redis (`dt_redis`) — ephemeral

**Purpose**: Session tokens, WebSocket fanout helper, rate-limit buckets.  
**Backup**: None. Redis contents reconstruct automatically:

- Session tokens: guests re-authenticate (JWT TTL is 24 h; guest sessions are short-lived).
- Rate-limit buckets: reset to zero on restart — conservative-side failure, acceptable.
- WS fanout state: clients reconnect within 5 s via the existing WS retry logic.

**Acceptable data loss**: 100% of in-memory state on unplanned restart.

**RTO**: 0 min (container restarts itself via `restart: unless-stopped`).

> If session persistence ever becomes a requirement (e.g. long-lived guest carts), add Redis persistence (`appendonly yes` / RDB snapshots) and update this section.

---

## 6. RabbitMQ (`dt_rabbitmq`) — ephemeral queues

**Purpose**: Async job dispatch (ingest scoring, notification fan-out, export jobs).

**What survives a restart**:

- Exchange and queue _topology_ — restored from `infra/rabbitmq/definitions.json` (in git, applied on boot via the `RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS` definitions import).
- Durable queues configured in `definitions.json`.

**What is lost on an unplanned restart**:

- In-flight messages that were not yet acknowledged.
- Transient queues.

**Accepted risk**: In-flight message loss is accepted for the current workload (ingest scoring is idempotent; notification fan-out is best-effort). If an in-flight export job is lost, the owner can re-trigger from the backoffice UI.

**RPO**: N/A | **RTO**: 5 min

#### Recovery procedure

```bash
# Restart the broker — definitions are applied automatically from the bind-mount
docker compose -f infra/compose/docker-compose.base.yml restart rabbitmq

# Confirm topology restored
curl -s -u "${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}" \
  "http://localhost:27673/api/queues" | jq '.[].name'
```

If the definitions file itself needs updating (e.g. a new queue was added), edit `infra/rabbitmq/definitions.json`, commit, and restart the broker. The file is the single source of truth for topology — never configure topology via the management UI without also updating the file.

---

## 7. Cron setup

Add the following crontab on the production VPS (`crontab -e` as the ops user):

```cron
# Daily Tour backup jobs — all times UTC
#
# PostgreSQL main — logical dump at 01:00
0 1 * * * /opt/dt-backup/postgres-dump.sh >> /var/log/dt-backup/postgres-dump.log 2>&1

# Authentik Postgres — logical dump at 01:30
30 1 * * * /opt/dt-backup/authentik-postgres-dump.sh >> /var/log/dt-backup/authentik-postgres-dump.log 2>&1

# n8n SQLite snapshot at 01:45
45 1 * * * /opt/dt-backup/n8n-sqlite.sh >> /var/log/dt-backup/n8n.log 2>&1

# PostgreSQL main — base backup at 02:00
0 2 * * * /opt/dt-backup/postgres-base.sh >> /var/log/dt-backup/postgres-base.log 2>&1

# MinIO mirror at 03:00 (after DB jobs complete to avoid CPU contention)
0 3 * * * /opt/dt-backup/minio-mirror.sh >> /var/log/dt-backup/minio-mirror.log 2>&1
```

Create log dirs: `mkdir -p /var/log/dt-backup && chmod 750 /var/log/dt-backup`

Alert on backup failure: pipe each script's exit code into a health-check ping service (e.g. healthchecks.io) or post to the Telegram bot on non-zero exit.

---

## 8. Quarterly restore drill

**Schedule**: First Saturday of each quarter (Q1 Jan, Q2 Apr, Q3 Jul, Q4 Oct) — add to the ops calendar.

**Objective**: Prove that a complete stack restore works end-to-end against an actual B2 snapshot, not just locally.

### Drill procedure

```
1. Provision a parallel VPS (same spec as production — same OS, Docker, compose files).
   Use a throwaway Hetzner CX22 (~€3.50 for 4 hours; terminate after drill).

2. Copy infra/ and .env.example to the drill VPS.
   Never copy the production .env — use a drill-specific .env with test secrets.

3. Run the full restore sequence for each component:
   - PostgreSQL main (Option A WAL restore to yesterday's checkpoint)
   - Authentik Postgres (latest dump)
   - MinIO (full mirror restore)
   - n8n (latest snapshot)

4. Smoke-test against the drill VPS:
   a. GET /api/health on all BFF services → 200
   b. Guest JWT flow: /api/auth/guest → valid JWT with exp
   c. Tour listing: /api/tours?lat=38.7&lng=-9.1 → >0 results
   d. Media asset: GET a known MinIO URL → 200
   e. n8n UI accessible and workflows count matches production snapshot

5. Document results in docs/operations/drill-log-<YYYY-QN>.md:
   - Date + VPS spec
   - Restore times per component (compare to RTO targets)
   - Any deviations or failures
   - Actions required before next drill

6. Terminate the drill VPS.
```

**Pass criteria**: All 4 components restore within their RTO targets; all 5 smoke tests pass.  
**Fail criteria**: Any smoke test fails or a component exceeds 2× its RTO → open a P1 backlog item before the next drill.

---

## 9. Backup monitoring checklist

Run this after each backup cycle (or automate via cron + alerting):

```bash
# Were all B2 uploads recent?
mc ls b2backup/daily-tour-backups/postgres/main/dumps/ | tail -1   # < 25h ago
mc ls b2backup/daily-tour-backups/postgres/authentik/ | tail -1    # < 25h ago
mc ls b2backup/daily-tour-backups/n8n/ | tail -1                   # < 25h ago
mc ls b2backup/daily-tour-backups/minio-mirror/ | tail -5          # < 25h ago

# Postgres WAL gap check
docker exec dt_postgres psql -U postgres -c \
  "SELECT last_archived_wal, last_archived_time FROM pg_stat_archiver;"
# last_archived_time should be < 15 min ago during active hours

# Dump sizes not shrinking unexpectedly
ls -lh /var/backups/dt/postgres/dumps/ | tail -5
```

---

## 10. Related documents

| Document                               | Location                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Secrets rotation (MINIO, PG passwords) | [`secrets-rotation-playbook.md`](./secrets-rotation-playbook.md)                 |
| PII erasure / GDPR DSR                 | [`pii-inventory-gdpr.md`](./pii-inventory-gdpr.md)                               |
| Threat model                           | [`threat-model-2026-05-18.md`](./threat-model-2026-05-18.md)                     |
| Infra operator runbook                 | [`infra/README.md`](../../infra/README.md)                                       |
| Auto-merge doctrine                    | [`docs/operations/auto-merge-doctrine.md`](../operations/auto-merge-doctrine.md) |
