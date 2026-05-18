# Hot-Fix + Rollback Playbook — Beta Period

> **T-3.C.4** — Decision tree, step-by-step rollback and hot-fix procedures, auto-merge override, and communication templates for the closed beta (10-guest cohort).

**Owner**: `@zmeireles`  
**Last updated**: 2026-05-18  
**Status**: Active — applies from beta launch through Plan-002 GA.

---

## 1. Decision tree — rollback vs forward-fix

```
┌──────────────────────────────────────────────────────────┐
│  Incident detected                                       │
└──────────────────────┬───────────────────────────────────┘
                       │
           ┌───────────▼───────────┐
           │  Data corruption?     │
           └───────────┬───────────┘
              YES      │     NO
          ┌────────────┘     └──────────────────────────────┐
          ▼                                                  │
  ROLLBACK + RESTORE                               ┌─────────▼─────────┐
  (§ 2.5 schema +                                  │  Security          │
   § backup runbook)                               │  incident?         │
                                                   └─────────┬─────────┘
                                                    YES      │     NO
                                                ┌────────────┘     └──────────────┐
                                                ▼                                  │
                                        ROLLBACK +                      ┌──────────▼──────────┐
                                        INCIDENT RESPONSE               │  User-facing bug     │
                                        (§ 4 + /incident skill)         │  that blocks beta    │
                                                                        │  journey?            │
                                                                        └──────────┬──────────┘
                                                                         YES       │    NO
                                                                     ┌────────────┘    └─────────────┐
                                                                     ▼                               ▼
                                                             ROLLBACK                         FORWARD-FIX
                                                             (~5–10 min target)               (backoffice-only,
                                                             (§ 2.x per service)              cosmetic, non-blocking)
                                                                                              (§ 3)
```

### Triage cheat-sheet

| Symptom | Action |
|---------|--------|
| Guest cannot scan token / reach app | Rollback PWA or BFF — § 2.1 / § 2.2 |
| Guest planner broken or missing | Rollback planner-svc — § 2.2 |
| Guest cannot view media / photos | Rollback media-svc — § 2.2 |
| Guest chat unresponsive | Rollback chat-hub — § 2.2 |
| Backoffice dashboard wrong, guest flow unaffected | Forward-fix — § 3 |
| DB rows missing or corrupted | Rollback + restore — § 2.5 + backup runbook |
| Credential leak / auth bypass | Rollback + incident — § 2.6 + `/incident` |
| Translation text garbled | Forward-fix (no guest-journey block) — § 3 |

---

## 2. Rollback procedures

All rollbacks start with identifying the bad merge commit on `main`.

```bash
# Find the merge commit to revert
git log --oneline main | head -20
# Note the SHA of the merge commit (e.g. abc1234 "feat(bff): ...")
```

### 2.1 PWA (static assets) — target ≤ 5 min

```bash
# 1. Create revert PR
git checkout main && git pull --ff-only
git checkout -b revert/pwa-<YYYYMMDD>
git revert --no-edit <merge-commit-sha>
git push origin revert/pwa-<YYYYMMDD>
gh pr create \
  --title "revert(pwa): rollback <description>" \
  --body "Rollback: <reason>. Refs T-3.C.4."

# 2. Human approves + merges (reverts are always-escalate per doctrine)

# 3. CI triggers redeploy — Traefik serves new static bundle automatically
# 4. Verify: open the PWA URL in an incognito tab and confirm the bad version is gone
```

**Estimated wall-clock**: ~5 min (revert PR + CI build + Traefik hot-swap).

### 2.2 BFF / catalog / token / media / search / planner / chat-hub — target ≤ 10 min per service

```bash
# 1. Identify the affected service
SERVICE=bff   # one of: bff | catalog-svc | token-svc | media-svc | search-svc | planner-svc | chat-hub

# 2. Create revert PR (same pattern as PWA)
git checkout -b revert/${SERVICE}-<YYYYMMDD>
git revert --no-edit <merge-commit-sha>
git push origin revert/${SERVICE}-<YYYYMMDD>
gh pr create \
  --title "revert(${SERVICE}): rollback <description>" \
  --body "Rollback: <reason>. Refs T-3.C.4."

# 3. Human approves + merges

# 4. On the VPS: rolling restart of the single container
ssh deploy@<VPS_IP> "docker compose -f /opt/daily-tour/compose/prod.yml up -d --no-deps --build ${SERVICE}"

# 5. Smoke-test the service health endpoint
curl -sf https://<domain>/api/<service>/health | jq .
```

**Estimated wall-clock**: ~10 min (revert PR + CI + container rebuild + deploy).

If multiple services are affected by the same commit, revert once and redeploy all affected containers in step 4.

### 2.3 Authentik realm config — target ≤ 10 min

Authentik configuration is stored as blueprints in `infra/authentik/blueprints/` (in git).

```bash
# 1. Find the previous good blueprint version
git log --oneline infra/authentik/blueprints/

# 2. Restore on the VPS
ssh deploy@<VPS_IP>
cd /opt/daily-tour

# Option A: re-import a specific git version of the blueprint
git show <good-sha>:infra/authentik/blueprints/realm.yaml > /tmp/realm-restore.yaml
docker compose exec authentik ak run_blueprint /tmp/realm-restore.yaml

# Option B: if the container itself is broken, roll back the compose image tag
# Edit infra/compose/prod.yml to pin the previous Authentik image version
# then: docker compose up -d --no-deps authentik

# 3. Verify: attempt login in an incognito tab
```

### 2.4 n8n workflow — target ≤ 5 min

n8n workflow versions are exported as JSON snapshots before any change.

```bash
# 1. Locate the last known-good workflow export
ls infra/n8n/workflows/

# 2. Import the previous version via n8n API
curl -X POST https://<domain>/n8n/api/v1/workflows/import \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n/workflows/<workflow>-<prev-version>.json

# 3. Verify: trigger the workflow manually and confirm expected output
```

**Convention**: always export a workflow snapshot to `infra/n8n/workflows/<name>-<YYYYMMDD>.json` before editing, and commit it so rollback is a one-liner.

### 2.5 Schema migration rollback

Schema changes are the highest-risk rollback. They are **always-escalate** per the auto-merge doctrine.

```bash
# 1. Identify the migration to reverse
ls services/<svc>/src/db/migrations/   # Drizzle — numbered files
# OR
ls services/<svc>/alembic/versions/    # Python services — Alembic

# --- Drizzle (TypeScript services) ---
# 2. Run the .down() reverse in the migration file
#    If no .down() exists, write one manually:
#    - DROP added columns / indexes (safe)
#    - RECREATE dropped columns from the backup (use backup-recovery-runbook.md)
pnpm --filter <svc> db:migrate:down --to <previous-version>

# 3. Verify schema matches the previous version
pnpm --filter <svc> db:introspect | diff - <expected-schema-snapshot>

# --- Alembic (Python services) ---
alembic -c services/<svc>/alembic.ini downgrade <previous-revision>

# 4. Restart the service container
ssh deploy@<VPS_IP> "docker compose restart <svc>"
```

**Before any schema migration rollback**: confirm the backup from `docs/security/backup-recovery-runbook.md` is current (WAL checkpoint < 15 min ago for the main cluster). If data was written to new columns since the migration ran, restore from backup first, then roll back the schema.

### 2.6 Security incident rollback

```
1. Rollback the affected service (§ 2.2 above) to stop the bleeding.
2. Revoke the exposed credential immediately (see secrets-rotation-playbook.md).
3. Open an incident channel: run `/incident` skill in Claude Code.
4. Notify beta cohort only if their data was accessed (see § 5, template C).
5. Do NOT merge any further code until the incident is closed.
```

---

## 3. Hot-fix procedures

Use forward-fix when:
- The bug is backoffice-only (no guest journey impact).
- The bug is cosmetic / translation text (non-blocking).
- A patch is faster and safer than a revert (e.g., a one-line config change).

```bash
# 1. Branch from main (always from latest main, never from a feature branch)
git checkout main && git pull --ff-only
git checkout -b hotfix/<slug>-<YYYYMMDD>

# 2. If a known-good commit exists elsewhere, cherry-pick it
git cherry-pick <known-good-sha>

# 3. Otherwise, apply the fix directly — keep it surgical (Karpathy principle)

# 4. Push + open PR
git push origin hotfix/<slug>-<YYYYMMDD>
gh pr create \
  --title "fix(<scope>): <description> [hotfix]" \
  --body "$(cat <<'EOF'
## Hot-fix

**Symptom**: <what guests / backoffice see>
**Root cause**: <one sentence>
**Fix**: <what changed>
**Tested**: <how you verified it>
**Guest action required**: yes / no — <detail if yes>

Refs T-3.C.4.
EOF
)"

# 5. CI must be green before merge — no --no-verify shortcuts
# 6. Merge: auto-merge if category is safe; otherwise human approves
```

### Skipping the auto-merge budget cap during a hot-fix

The 3-consecutive-PR auto-merge cap (auto-merge doctrine § Budget cap) may be bypassed when:

1. The user has explicitly typed `/goal hotfix` in this session, AND
2. The PR is a `fix(*)` or `revert(*)` commit type, AND
3. All 6 CI checks are green.

The orchestrator MUST log the bypass in `EXECUTION.md`:

```
Wave N (hotfix bypass): merged <PR#> under /goal hotfix authorisation. Cap reset after.
```

The cap resets to 0 after the hotfix is merged. Normal doctrine resumes.

---

## 4. Telegram nudge — guest action required

When a hot-fix or rollback changes something guests must act on (clear cache, re-scan token, etc.), send a Telegram nudge to the beta cohort via the paired bot before the fix is deployed.

```bash
# Send via the Telegram reply tool (Claude Code session)
# Target: the beta-cohort group chat or individual DMs (use the chat_id on file)
```

**Triggers for a guest nudge**:
- PWA service worker updated → ask guests to close + reopen the app (hard refresh)
- Token URL format changed → ask guests to re-scan their QR code
- Auth session invalidated by Authentik rollback → ask guests to log out and log back in
- Planner data reset (data corruption recovery) → inform guests their saved plan was restored to an earlier version

---

## 5. Communication templates

### Template A — Brief outage notification (≤ 5 min) — EN + pt-PT

**English**

> Hi [Name]! We're doing a quick technical update to the Daily Tour app right now — it'll be back in about 5 minutes. Sorry for the interruption! No action needed from you. 🙏

**pt-PT**

> Olá [Nome]! Estamos a fazer uma atualização técnica rápida na app Daily Tour agora mesmo — estará de volta em cerca de 5 minutos. Pedimos desculpa pela interrupção! Não precisas de fazer nada. 🙏

---

### Template B — Feature regression notification — EN + pt-PT

**English**

> Hi [Name]! We've noticed a temporary issue with [feature] in the Daily Tour app. Our team is on it and we expect to have it fixed within [timeframe]. In the meantime, [workaround if any / "please bear with us"]. We'll message you once it's resolved. Thank you for your patience! 🙏

**pt-PT**

> Olá [Nome]! Identificámos um problema temporário com [funcionalidade] na app Daily Tour. A nossa equipa está já a tratar disso e esperamos ter uma solução em [prazo]. Entretanto, [alternativa se existir / "agradecemos a tua paciência"]. Avisamo-te assim que estiver resolvido. Obrigado pela compreensão! 🙏

---

### Template C — Data or privacy incident notification — EN + pt-PT

> ⚠️ Use this template only if the incident confirmation requires notification under GDPR Article 33/34. Consult `docs/security/pii-inventory-gdpr.md` before sending.

**English**

> Hi [Name], we want to be transparent with you. We identified a technical issue on [date] that may have affected [describe scope — e.g., "your saved day-plan data"]. We've resolved it and restored your data from backup. [If applicable: no personal data was accessed by third parties.] If you have any questions, please reply to this message. We're sorry for the disruption.

**pt-PT**

> Olá [Nome], queremos ser transparentes contigo. Identificámos um problema técnico no dia [data] que pode ter afetado [descrever âmbito — ex: "os dados do teu plano diário guardado"]. Já resolvemos o problema e restaurámos os teus dados a partir de cópia de segurança. [Se aplicável: nenhum dado pessoal foi acedido por terceiros.] Se tiveres questões, responde a esta mensagem. Pedimos desculpa pela perturbação.

---

### Template D — Post-mortem summary (5-line) — EN

Append to the beta-cohort update message or post in the ops channel.

```
Incident: <one-line description>
When: <date/time UTC>
Impact: <who was affected + duration>
Root cause: <one sentence>
Fix: <one sentence> — full report: <link to /incident doc or GitHub issue>
```

---

## 6. Runbook index

| Document | When to reach for it |
|----------|----------------------|
| `docs/security/backup-recovery-runbook.md` | Data corruption rollback — restore steps for Postgres, MinIO, n8n |
| `docs/security/secrets-rotation-playbook.md` | Credential revocation after a security rollback |
| `docs/security/pii-inventory-gdpr.md` | GDPR notification decision + DSR playbook |
| `docs/security/threat-model-2026-05-18.md` | STRIDE threat context to scope the incident blast radius |
| `docs/operations/auto-merge-doctrine.md` | Auto-merge budget cap + always-escalate list |
| `/incident` skill | Structured incident response and post-mortem template |

---

## 7. Drill schedule

Run a rollback drill once per beta cohort intake (before each new group of guests starts):

1. Pick one service (rotate through the stack).
2. Simulate a bad merge: revert the last commit on a test branch.
3. Execute the rollback procedure end-to-end.
4. Record wall-clock time vs. the target.
5. Log gaps in `EXECUTION.md` under "Drill <date>".

**Target SLAs** (beta period, single VPS):

| Scope | Target |
|-------|--------|
| PWA static rollback | ≤ 5 min |
| Single backend service rollback | ≤ 10 min |
| Authentik config rollback | ≤ 10 min |
| n8n workflow rollback | ≤ 5 min |
| Data restore from last backup | ≤ 30 min (Postgres WAL) / ≤ 60 min (MinIO) |
