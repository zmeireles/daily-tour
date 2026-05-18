# PII Inventory & GDPR Data-Subject-Request Playbook

**Created:** 2026-05-18  
**Task:** T-3.B.3  
**Owner:** Security / Engineering  
**Review cadence:** Quarterly, or on any schema change touching a PII field

---

## 1. PII Inventory

All tables in the `dailytour` Postgres cluster that hold personal data, pseudonymous identifiers, or data that enables re-identification.

### Legend

| Symbol | Meaning |
|---|---|
| ⚠ | Gap vs. stated policy — requires remediation |
| ✓ | Compliant as-implemented |

---

### 1.1 `auth_tokens.guest`

Subject category: **guest**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `id` | `uuid` PK | Pseudonym (key) | Indefinite — no purge ⚠ | 30 days after last checkout | Hard-delete after cascade (see §3.2) |
| `display_name` | `varchar(200)` | Direct PII — name | Indefinite ⚠ | Same as `id` | Deleted with row |
| `locale` | `text` | Non-identifying | Same as `id` | Same as `id` | Deleted with row |
| `opt_in_flags` | `jsonb` | Consent record | Should survive deletion for audit | Anonymised copy in audit log ⚠ | Strip PII link before archiving |
| `created_at` | `timestamptz` | Metadata | Same as `id` | Same as `id` | Deleted with row |

**Gap ⚠ G-1:** `ON DELETE RESTRICT` FK on `reservation.guest_id` prevents deleting a guest row while reservations exist. Erasure of a guest row requires deleting (or anonymising) reservations first.

---

### 1.2 `auth_tokens.reservation`

Subject category: **guest**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `id` | `uuid` PK | Pseudonym | Indefinite ⚠ | 30 days post-checkout | Hard-delete (unblocks guest delete) |
| `guest_id` | `uuid` FK | Pseudonym | Same as row | Same as row | Deleted with row |
| `guesthouse_id` | `uuid` | Operational ref | Same as row | Same as row | Deleted with row |
| `checkin` / `checkout` | `date` | Stay dates (linkable to guest) | Indefinite ⚠ | 30 days post-checkout | Deleted with row |
| `party_size` | `integer` | Non-identifying alone | Same as row | Same as row | Deleted with row |
| `locale` | `text` | Non-identifying | Same as row | Same as row | Deleted with row |
| `status` | `text` | Operational | Same as row | Same as row | Deleted with row |

---

### 1.3 `auth_tokens.token_grant`

Subject category: **guest**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `jti` | `varchar(64)` PK | Pseudonym | Indefinite ⚠ | Delete when reservation deleted | Cascades on `reservation` delete |
| `reservation_id` | `uuid` FK | Pseudonym | Same as row | Same as row | Cascades automatically ✓ |
| `issued_at` / `expires_at` / `revoked_at` | `timestamptz` | Operational | Same as row | Purge expired rows after 30 days ⚠ | Deleted with row |

**Gap ⚠ G-2:** No automated job purges expired / revoked token grants. These accumulate indefinitely.

---

### 1.4 `catalog.owner_profile`

Subject category: **owner**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `owner_id` | `uuid` PK | Pseudonym (Authentik subject) | Indefinite | Deleted when owner account deactivated in Authentik | Hard-delete row ✓ |
| `bio` | `jsonb` | Potentially PII (owner-authored text) | Indefinite | Account deactivation | Deleted with row ✓ |
| `photo` | `uuid` (media.asset ref) | Likeness — PII | Indefinite | Account deactivation | Delete `media.asset` row + MinIO object ⚠ |
| `phone` | `varchar(32)` | Direct PII — plaintext | Indefinite | Account deactivation | Deleted with row ✓ |
| `email` | `text` | Direct PII — plaintext | Indefinite | Account deactivation | Deleted with row ✓ |
| `call_enabled` / `dm_channels` | `boolean` / `jsonb` | Preference | Indefinite | Account deactivation | Deleted with row ✓ |

**Gap ⚠ G-3:** `phone` and `email` stored plaintext. No application-layer encryption. Consider encrypting at rest (pgcrypto or Vault Transit) before production.

**Gap ⚠ G-4:** Deleting `owner_profile` does not automatically delete the linked `media.asset` row or the MinIO object (the `photo` UUID is a soft reference, no FK). Must be handled in the erasure procedure (§3.3).

---

### 1.5 `catalog.guesthouse`

Subject category: **owner** (indirectly — owner-supplied content)

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `owner_id` | `uuid` | Pseudonym | Indefinite | Owner erasure | Hard-delete all guesthouses for owner |
| `address` | `text` | Location data (owner-supplied) | Indefinite | Owner erasure | Deleted with row |
| `geom_lat` / `geom_lng` | `double precision` | Location data | Indefinite | Owner erasure | Deleted with row |
| `name` / `slug` / `media` | `jsonb` / `text` | Business content | Indefinite | Owner erasure | Deleted with row |

Guest PII is **not** stored in this table. `guesthouse` data is business/operational content.

---

### 1.6 `media.asset`

Subject category: **owner**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `id` | `uuid` PK | Pseudonym | Indefinite | Owner erasure | Hard-delete row + MinIO object |
| `owner_id` | `uuid` | Pseudonym | Indefinite | Owner erasure | Deleted with row |
| `bucket_key` | `text` | `{owner_id}/{asset_id}.{ext}` | Indefinite | Owner erasure | Delete MinIO object at this key |
| `mime_type` / `size_bytes` / `variants` | various | Metadata | Same as row | Same as row | Deleted with row |

**Gap ⚠ G-5:** No FK from `media.asset` to `catalog.owner_profile`. Erasure must explicitly enumerate and delete assets by `owner_id`.

---

### 1.7 `analytics.tour_event`

Subject category: **guest**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `id` | `uuid` PK | — | Indefinite ⚠ | 30 days post-checkout | Hard-delete or anonymise |
| `guest_id` | `uuid` nullable | Pseudonym — links telemetry to identity | Indefinite ⚠ | Anonymise (NULL) on guest erasure | Set `guest_id = NULL` ✓ (nullable column) |
| `plan_id` | `uuid` nullable | Pseudonym | Indefinite ⚠ | Anonymise on plan erasure | Set `plan_id = NULL` |
| `event_type` | `text` | Non-identifying alone | Same as row | Same as row | Deleted with row (or kept anonymised) |
| `payload` | `jsonb` nullable | May contain free-text ⚠ | Same as row | Scrub on erasure | Null payload on anonymisation |

**Gap ⚠ G-6:** No FK on `guest_id`; deleting a guest row does **not** cascade to `tour_event`. Anonymisation must be explicit.

---

### 1.8 `planner.tour_plan`

Subject category: **guest**

| Field | Type | PII class | Retention rule (current) | Retention rule (recommended) | Erasure handling |
|---|---|---|---|---|---|
| `id` | `uuid` PK | — | Indefinite ⚠ | 30 days post-checkout | Hard-delete |
| `guest_id` | `uuid` | Pseudonym | Indefinite ⚠ | 30 days post-checkout | Deleted with row |
| `request_payload` | `jsonb` | Free-text guest input (action wishes) — PII-adjacent ⚠ | Same as row | Same as row | Deleted with row |
| `plan_payload` | `jsonb` nullable | LLM-generated plan; may reference stops by name | Same as row | Same as row | Deleted with row |
| `status` | `text` | Operational | Same as row | Same as row | Deleted with row |

**Gap ⚠ G-7:** No FK on `guest_id`. Deleting a guest row does not cascade to `tour_plan`.

---

### 1.9 Chat threads (`chat` schema)

Subject category: **guest** + **owner**

**Current state:** Schema placeholder created in `infra/postgres/init/01-schemas.sql`. No tables migrated. The `chat-hub` service operates fully in-memory. Persistence deferred to task T-4.1.x.

When T-4.1.x is implemented, document the following fields in this table:

| Anticipated field | PII class | Required retention rule | Required erasure handling |
|---|---|---|---|
| `guest_id` | Pseudonym | 30 days post-checkout | Hard-delete or anonymise |
| `message_body` | Direct PII — guest free-text | 30 days post-checkout | Hard-delete |
| `channel_binding` (Telegram chat_id, WhatsApp wa_id) | Direct PII — phone/handle | 30 days post-checkout | Hard-delete |

**Action item (T-4.1.x):** This playbook must be updated before any chat persistence migration lands.

---

### 1.10 Authentik realm (owner accounts)

Subject category: **owner**

Authentik stores owner identity data outside the `dailytour` Postgres cluster (Authentik's own DB). Fields managed by Authentik:

| Field | PII class | Retention | Erasure |
|---|---|---|---|
| Username / email | Direct PII | Until deactivation | Admin API: deactivate user → anonymise |
| Password hash (argon2id) | Derived — non-reversible | Until deactivation | Deleted with user object |
| OIDC tokens (access + refresh) | Session PII | 1h / 14 days (configured) | Revoke via Authentik admin or token endpoint |
| Groups / sessions | Operational | Until expiry | Cleared on user delete |
| `sub` in JWT | Hashed user PK (`sub_mode: hashed_user_id`) | Token lifetime | Not reversible; no action needed |

Erasure requires an Authentik admin or API call — not handled by this codebase's own SQL.

---

### 1.11 n8n workflow data

Subject category: **guest**

The `post-stay-review.json` workflow (not yet active; requires T-5.5.1 token-svc endpoint) will pass the following PII fields through n8n's HTTP execution engine:

| Field | Source | PII class | Risk |
|---|---|---|---|
| `guest_email` | token-svc API response | Direct PII | Logged in n8n execution history |
| `guest_name` | token-svc API response | Direct PII | Logged in n8n execution history |
| `reservation_id` | token-svc API response | Pseudonym | Logged |

**Gap ⚠ G-8:** n8n execution history retains full HTTP payloads by default. Configure n8n `N8N_LOG_LEVEL` and execution history pruning before enabling this workflow. n8n has read-only access to the `audit` schema only; it calls token-svc via HTTP, not direct DB.

---

## 2. Retention Summary

| Location | Data category | Stated retention | Enforcement status |
|---|---|---|---|
| `auth_tokens.guest` | Guest identity | 30 days post-checkout | Not enforced ⚠ |
| `auth_tokens.reservation` | Stay data | 30 days post-checkout | Not enforced ⚠ |
| `auth_tokens.token_grant` | Auth tokens | Expires at `expires_at` | No purge job ⚠ |
| `analytics.tour_event` | Guest telemetry | 30 days post-checkout | Not enforced ⚠ |
| `planner.tour_plan` | Guest plans | 30 days post-checkout | Not enforced ⚠ |
| `catalog.owner_profile` | Owner identity | Account lifetime | Manual only ⚠ |
| `media.asset` | Owner media | Account lifetime | Manual only ⚠ |
| Authentik | Owner auth data | Account lifetime | Authentik admin |
| n8n execution history | Guest email/name | n8n default (indefinite) | Not configured ⚠ |

**Remediation required before production:** A scheduled job (n8n cron or pg_cron) must implement the 30-day post-checkout purge across guest, reservation, tour_event, and tour_plan tables.

---

## 3. Data-Subject-Request (DSR) Playbook

All DSRs must be responded to within **30 days** (GDPR Art. 12). Verified identity is required before executing any request.

### Identity verification

- **Guest DSR:** Verify by matching `display_name` + `reservation_id` (sent in original token URL). No email on file — operator must attest identity from check-in records.
- **Owner DSR:** Verify via Authentik login session or admin confirmation of account ownership.

---

### 3.1 Subject Access Request (SAR) — Art. 15

Returns all personal data held about the subject as JSON.

#### Guest SAR

```sql
-- Replace $1 with the guest's UUID (auth_tokens.guest.id)
SELECT json_build_object(
  'guest',        (SELECT row_to_json(g)
                   FROM auth_tokens.guest g
                   WHERE g.id = $1),
  'reservations', (SELECT json_agg(r)
                   FROM auth_tokens.reservation r
                   WHERE r.guest_id = $1),
  'token_grants', (SELECT json_agg(tg)
                   FROM auth_tokens.token_grant tg
                   JOIN auth_tokens.reservation r ON r.id = tg.reservation_id
                   WHERE r.guest_id = $1),
  'tour_plans',   (SELECT json_agg(tp)
                   FROM planner.tour_plan tp
                   WHERE tp.guest_id = $1),
  'tour_events',  (SELECT json_agg(te)
                   FROM analytics.tour_event te
                   WHERE te.guest_id = $1)
) AS subject_data;
```

Output as `sar_guest_{guest_id}_{date}.json` and deliver via secure channel.

#### Owner SAR

```sql
-- Replace $1 with the owner's UUID (catalog.owner_profile.owner_id / Authentik sub)
SELECT json_build_object(
  'owner_profile',  (SELECT row_to_json(op)
                     FROM catalog.owner_profile op
                     WHERE op.owner_id = $1),
  'guesthouses',    (SELECT json_agg(gh)
                     FROM catalog.guesthouse gh
                     WHERE gh.owner_id = $1),
  'media_assets',   (SELECT json_agg(ma)
                     FROM media.asset ma
                     WHERE ma.owner_id = $1)
) AS subject_data;
```

Note: Authentik profile data (email, password metadata, sessions) must be exported separately from the Authentik admin console → Users → Export.

---

### 3.2 Erasure Request — Art. 17

Ordered deletes to respect FK constraints. Execute **in this exact order**.

#### Guest erasure

```sql
BEGIN;

-- 1. Anonymise analytics (no FK — must be explicit)
UPDATE analytics.tour_event
SET    guest_id = NULL,
       plan_id  = NULL,
       payload  = NULL
WHERE  guest_id = $1;

-- 2. Delete tour plans (no FK — must be explicit)
DELETE FROM planner.tour_plan
WHERE  guest_id = $1;

-- 3. token_grants cascade automatically when reservations are deleted;
--    delete reservations (unblocks guest FK constraint)
DELETE FROM auth_tokens.reservation
WHERE  guest_id = $1;

-- 4. Delete guest row (FK now satisfied)
DELETE FROM auth_tokens.guest
WHERE  id = $1;

COMMIT;
```

After the transaction completes, verify no rows remain:

```sql
SELECT COUNT(*) FROM auth_tokens.guest      WHERE id       = $1;  -- expect 0
SELECT COUNT(*) FROM auth_tokens.reservation WHERE guest_id = $1;  -- expect 0
SELECT COUNT(*) FROM planner.tour_plan       WHERE guest_id = $1;  -- expect 0
SELECT COUNT(*) FROM analytics.tour_event    WHERE guest_id = $1;  -- expect 0 non-null
```

#### Owner erasure

```sql
BEGIN;

-- 1. Collect asset IDs + bucket_keys before deletion (needed for MinIO cleanup)
CREATE TEMP TABLE owner_assets AS
  SELECT id, bucket_key FROM media.asset WHERE owner_id = $1;

-- 2. Delete catalog content (places cascade from guesthouse via FK)
DELETE FROM catalog.guesthouse   WHERE owner_id = $1;

-- 3. Delete media DB rows
DELETE FROM media.asset WHERE owner_id = $1;

-- 4. Delete owner profile
DELETE FROM catalog.owner_profile WHERE owner_id = $1;

COMMIT;
```

After the transaction, delete MinIO objects:

```bash
# For each bucket_key in the temp table:
mc rm minio/dailytour-media/<bucket_key>
# Or bulk:
mc rm --recursive minio/dailytour-media/<owner_id>/
```

Finally, deactivate the owner account in Authentik:

```bash
# Authentik admin API
curl -X PATCH https://auth.dailytour.example/api/v3/core/users/<authentik_user_id>/ \
  -H "Authorization: Bearer $AUTHENTIK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

---

### 3.3 Rectification Request — Art. 16

Fields the **subject can update via the PWA** (self-service):

| Subject | Field | PWA action |
|---|---|---|
| Guest | `display_name` | Not currently exposed; operator must update |
| Guest | `locale` | Implicit on token re-issue; operator must update |
| Owner | `bio` | Owner settings page → Edit profile |
| Owner | `photo` | Owner settings page → Upload new photo |
| Owner | `phone` | Owner settings page → Edit contact |
| Owner | `email` | Owner settings page → Edit contact |
| Owner | `call_enabled` / `dm_channels` | Owner settings page → Channels |

Fields that **require operator action** (no PWA flow):

| Subject | Field | Reason |
|---|---|---|
| Guest | `display_name` | No authenticated guest session; token is one-time |
| Guest | `locale` | Tied to token issuance |
| Guest | `checkin` / `checkout` | Operational data; requires re-issuing reservation |
| Owner | Authentik username/email | Change via Authentik self-service portal or admin |

#### Operator rectification SQL (guest)

```sql
-- Correct a guest display_name
UPDATE auth_tokens.guest
SET    display_name = $2       -- $2 = corrected name (operator-verified)
WHERE  id = $1;                -- $1 = guest_id

-- Correct a reservation's check-in/check-out
UPDATE auth_tokens.reservation
SET    checkin  = $2,
       checkout = $3,
       updated_at = now()
WHERE  id = $4;                -- $4 = reservation_id (verify guest_id matches)
```

---

### 3.4 Portability Request — Art. 20

Same queries as SAR (§3.1) but the output is intended for re-import into another platform. Deliver as structured JSON with a schema version header.

```sql
-- Guest portability export
SELECT json_build_object(
  '_schema',      '1.0',
  '_exported_at', now(),
  '_subject',     'guest',
  'guest',        (SELECT row_to_json(g)
                   FROM auth_tokens.guest g WHERE g.id = $1),
  'reservations', (SELECT json_agg(r ORDER BY r.checkin)
                   FROM auth_tokens.reservation r WHERE r.guest_id = $1),
  'tour_plans',   (SELECT json_agg(json_build_object(
                     'id',              tp.id,
                     'created_at',      tp.created_at,
                     'request_payload', tp.request_payload,
                     'plan_payload',    tp.plan_payload
                   ) ORDER BY tp.created_at)
                   FROM planner.tour_plan tp WHERE tp.guest_id = $1)
) AS portability_export;
```

Output as `portability_guest_{guest_id}_{date}.json`.

---

## 4. Open Gaps — Remediation Backlog

| ID | Gap | Severity | Remediation | Target task |
|---|---|---|---|---|
| G-1 | No automated 30-day post-checkout purge (guest, reservation, tour_event, tour_plan) | High | pg_cron or n8n scheduled job | Pre-production |
| G-2 | Expired `token_grant` rows accumulate indefinitely | Medium | Add purge to retention job | Pre-production |
| G-3 | `owner_profile.phone` and `email` stored plaintext | Medium | pgcrypto or Vault Transit encryption | Phase 4 |
| G-4 | `media.asset` photo not auto-deleted on `owner_profile` delete | Medium | Add explicit step to erasure procedure (documented in §3.2) | Immediate (procedural) |
| G-5 | No FK `media.asset → owner_profile` to enforce cascade | Low | Accepted — cross-schema FK not supported by D4. Procedural control only. | — |
| G-6 | `analytics.tour_event.guest_id` no cascade on guest delete | High | Documented in §3.2 (anonymise step); add automated purge | Pre-production |
| G-7 | `planner.tour_plan.guest_id` no cascade on guest delete | High | Documented in §3.2 (delete step); add automated purge | Pre-production |
| G-8 | n8n execution history retains guest PII (email, name) by default | Medium | Set `EXECUTIONS_DATA_PRUNE_MAX_COUNT` + `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none` before enabling post-stay workflow | T-5.5.1 |
| G-9 | Chat-hub persistence not yet designed; PII fields TBD | High | Update this document before T-4.1.x migration lands | T-4.1.x |

---

## 5. Related Documents

- [`docs/security/threat-model-2026-05-18.md`](./threat-model-2026-05-18.md) — STRIDE model covering auth, media, chat, and planner surfaces
- [`docs/security/secrets-rotation-playbook.md`](./secrets-rotation-playbook.md) — Rotation procedures for all 16 secrets
- [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md) § 5.5 — Privacy/compliance requirements (D13, 30-day retention)
- [`docs/security/README.md`](./README.md) — Security index and open risk register
