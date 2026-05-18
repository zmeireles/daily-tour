# Threat Model — Daily Tour (2026-05-18)

**Methodology**: STRIDE  
**Scope**: Auth surfaces (guest token flow + owner Authentik) + media pipeline + chat surfaces + planner + public BFF  
**Author**: Plan-003 T-3.B.0  
**Status**: Initial — review before Phase 2.A production deploy  

---

## How to read this document

Each component section lists threats grouped by STRIDE category. For each threat:

- **Threat** — what an attacker does
- **Mitigations (current)** — controls already in the codebase or infra
- **Residual risk** — Low / Medium / High after mitigations
- **Recommended actions** — what to do next (RA-xxx identifiers for tracking)

Risk ratings assume the VPS deployment described in Plan-002. A multi-region or cloud-WAF deployment changes several ratings downward.

---

## System boundaries in scope

```
Internet
  └─ Traefik (TLS termination)
       └─ BFF/Fastify (public ingress, auth enforcement)
             ├─ token-svc (guest JWT issuance)
             ├─ Authentik (owner OIDC, internal-only)
             ├─ media-svc (pre-signed uploads, dt_internal only)
             ├─ chat-hub (WS bridge + Telegram/WhatsApp webhooks)
             └─ planner-svc (RAG + LLM)
                   └─ search-svc (vector retrieval)
```

All internal services communicate on the `dt_internal` Docker bridge network. External ingress is Traefik only. MinIO, Redis, RabbitMQ, Postgres, Authentik, and n8n are **not** exposed to the public internet — all ports bound to `127.0.0.1` in Compose.

---

## 1. Guest Token Flow (token-svc + BFF `/r/:token`)

**Component**: Opaque URL token (`/r/{token}`) exchanged at first load for a HS256 JWT. Token-svc signs; BFF verifies only. JTI = `sha256(opaque)` stored in Redis for revocation. Refresh cookie (`dt_refresh`) is HttpOnly, Secure, SameSite=Lax.

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S1 | Attacker brute-forces opaque token space to hijack a guest session | 30 req/min rate limit on `/r/:token`; token is opaque lookup key (not a guessable ID); JTI bound to specific reservation | Medium | **RA-1**: Audit opaque token entropy — must be ≥128 bits (16 random bytes). **RA-2**: Add progressive backoff + IP block after 5 consecutive 401s on this endpoint |
| S2 | Captured JWT replayed from screenshot / referer header | JWT in memory + HttpOnly cookie only (not in URL after exchange); opaque token redacted in BFF logs (`/r/[redacted]`); HTTPS-only; 1h JWT expiry | Low (HTTPS enforced) | **RA-3**: Set `Referrer-Policy: no-referrer` in BFF helmet config to prevent token leakage via HTTP referer |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T1 | JWT claims tampered (e.g. `gh=` swapped to access a different guesthouse) | HS256 HMAC — any byte change invalidates signature; BFF verifies before use | Low | **RA-4**: Document `JWT_SIGNING_KEY` rotation procedure — rotation forces all active sessions to re-exchange at next JWT expiry |
| T2 | Refresh cookie (`dt_refresh`) modified to extend session lifetime | HttpOnly prevents JS access; cookie value is the opaque token — server validates against DB on refresh | Low | No action required |

### R — Repudiation

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| R1 | Guest denies performing an action (tour plan, chat message) | JWT `jti` ties every request to a token grant row; reservation_id in JWT binds to guest identity | Low | **RA-5**: Verify `jti` is included in structured log output on plan-create and chat-send endpoints |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I1 | Opaque token leaked via browser history, shared link, or `Referer` header | Token URL redacted in BFF logs; share-itinerary flow strips token (D15); HTTPS-only; `dt_refresh` is HttpOnly | Medium | **RA-3** (see S2). **RA-6**: Remind guests on share flows that the token URL must not be shared — add tooltip in UI |
| I2 | JWT payload decoded (not forged) to reveal `guest_id`, `reservation_id`, `guesthouse_id` | JWT body is base64-encoded (not encrypted); claims are opaque UUIDs — no PII in current claim set | Low | **RA-7**: Add formal policy: never add PII (name, email, phone) to JWT claims; use DB lookup from `sub`/`rid` when PII is needed |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D1 | Token-exchange endpoint flooded to exhaust token-svc / BFF resources | 30 req/min per IP on `/r/:token`; BFF global cap 200 req/min | Medium | **RA-8**: Add Traefik fail2ban middleware to block IPs that exceed 429 thresholds; consider Cloudflare fronting for volumetric DDoS |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E1 | Revoked token continues to authenticate when Redis is unavailable | JTI revocation check via Redis; `cacheJtiActive` failure is fire-and-forget (does not block auth) | Low–Medium | **RA-9**: On Redis unavailability during a **revocation check** (not initial cache write), fail-closed with 503 — losing Redis after revoke should block access, not allow it. Document this distinction in the Redis failure runbook |
| E2 | Token from QA environment replayed in production (same signing key) | No `iss` (issuer) claim currently in JWT | Medium | **RA-10**: Add `iss` claim (`"daily-tour-prod"` / `"daily-tour-qa"`) to JWT and verify in BFF auth plugin |

---

## 2. BFF Auth Middleware (JWT verification layer)

**Component**: BFF Fastify auth plugin. Secure-by-default: every route gets `fastify.authenticate` unless explicitly opting out via `config: { auth: 'public' | 'owner' }`. HS256 guest path via `@fastify/jwt`; RS256 owner path via `jose` + remote JWKS.

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S3 | Forged HS256 JWT using weak `JWT_SIGNING_KEY` | Config validates min 32 chars; token-svc and BFF share this secret only | Low | **RA-11**: Enforce 256-bit (32 random bytes, base64-encoded) in deployment docs; add entropy check at startup (`/health` should fail if key is dictionary word) |
| S4 | Route registered before `authPlugin` bypasses authentication hook | WebSocket plugin intentionally registered before auth; all routes registered after pick up `onRoute` hook | Low | **RA-12**: Add CI integration test that calls every route without a JWT and asserts 401/403 response |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T3 | Request body modified in transit (BFF → downstream services) | HTTPS/TLS for external ingress; `dt_internal` Docker bridge for internal calls | Low | No action required (Docker bridge is local network) |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I3 | Internal service error details leaked in BFF 5xx responses | Standard Fastify error formatting; token-exchange downgrades to redirect | Low–Medium | **RA-13**: Add global error handler that returns `{"error": "internal_error"}` for all unhandled 5xx in production; never expose stack traces |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D2 | WebSocket connection storm exhausting BFF in-memory fanout | No documented WS connection limit; architecture targets "hundreds of concurrent guests" | Medium | **RA-14**: Implement max WS connections per JWT `jti`; close oldest connection on duplicate `jti` connection |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E3 | Guest HS256 JWT accepted on owner RS256 routes (algorithm confusion) | Guest and owner verifiers are separate code paths (`@fastify/jwt` vs `jose`); wrong algorithm causes verification failure | Low | **RA-15**: Add explicit `algorithms: ['RS256']` check in `authenticateOwner` to reject any non-RS256 token explicitly |

---

## 3. Owner Auth (Authentik OIDC + BFF JWKS verify)

**Component**: Owner authenticates via Authentik OIDC/PKCE. BFF fetches Authentik JWKS via `createRemoteJWKSet`, verifies RS256 token, checks `aud` or `groups` claim for `staff` membership. Authentik is on `dt_internal` only — never exposed to the public internet.

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S5 | JWT signed by attacker-controlled JWKS (key confusion attack) | BFF fetches JWKS from `AUTHENTIK_JWKS_URL` (internal only); `jose` enforces algorithm; HTTPS for JWKS fetch | Low | **RA-16**: Validate `AUTHENTIK_JWKS_URL` points to `dt_internal` host at startup — reject if it resolves to public IP |
| S6 | Owner credential phishing or brute-force attack on Authentik login | Authentik handles authn; PKCE prevents auth code interception | Low–Medium | **RA-17**: Enforce TOTP/MFA in Authentik for owner account; configure brute-force lockout policy; document in `infra/authentik/blueprints/` |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T4 | Authentik blueprint misconfiguration: `groups` claim absent causes silent access grant | BFF accepts EITHER `aud: staff` OR `groups: [...staff...]` — dual-claim check is defensive | Low | **RA-18**: Add integration test: token without `aud` and without `groups` returns 403; token with only `aud` works; token with only `groups` works |

### R — Repudiation

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| R2 | Owner denies performing a backoffice mutation (place edit, reservation creation) | `req.user.sub` and `req.user.email` available from verified payload | Low | **RA-19**: Log `sub` and `email` from owner JWT on all mutating backoffice endpoints (POST/PUT/DELETE) |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I4 | Authentik admin UI publicly accessible | Authentik on `dt_internal`; Traefik forward-auth blocks public access | Low | **RA-20**: Add to production deploy checklist: verify Traefik rule blocks `/_/` Authentik admin path on public interface |
| I5 | Owner JWT stored in `localStorage` (XSS-exploitable) | Storage location is PWA-controlled; common anti-pattern | Medium | **RA-21**: Store owner JWT in memory (`sessionStorage` at worst, never `localStorage`); document in `apps/pwa/src/lib/auth/owner-oidc.ts` |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D3 | Authentik instance unavailable → all owner routes fail with 401 | JWKS is fetched on each request via `createRemoteJWKSet` (jose caches internally with TTL) | Medium | **RA-22**: Verify jose JWKS cache TTL; configure explicit `cacheMaxAge` on `createRemoteJWKSet`; document Authentik restart procedure |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E4 | Multi-tenant isolation failure: owner A reads/modifies owner B's places | Per REQUIREMENTS R11: catalog queries must include `owner_id` scope check | Medium | **RA-23**: Enforce multi-tenant isolation tests in CI for every catalog-svc endpoint; add owner_id assertion middleware |
| E5 | Expired owner token silently re-used (token refresh without re-validation) | `jose.jwtVerify` checks `exp` claim; no server-side session storage for owner tokens | Low | No action required |

---

## 4. Media Pipeline (media-svc + MinIO)

**Component**: Owner uploads media via BFF → media-svc issues a 15-minute pre-signed MinIO PUT URL → client uploads directly → BFF calls `/v1/uploads/complete` → transcode worker runs. GET access via BFF 302 redirect; MinIO is not publicly reachable. Media-svc protected by `X-Internal-Token` header (`MEDIA_SVC_INTERNAL_TOKEN`) — a static shared secret between BFF and media-svc, scoped to `dt_internal`.

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S7 | Attacker calls `/v1/uploads/sign` directly to generate pre-signed URLs without BFF authorization | `verifyInternal` checks `X-Internal-Token`; media-svc on `dt_internal` only | Low–Medium | **RA-24**: Replace static `MEDIA_SVC_INTERNAL_TOKEN` with Authentik audience check (`aud: media-svc`) per T-1.6.x plan — static shared secret is a footgun on key rotation |
| S8 | Pre-signed PUT URL transferred to a third party who then uploads arbitrary content | URL is valid for 15 minutes; MIME type is baked into the pre-signed URL signature | Low | **RA-25**: Verify 15-min TTL is configured in `getPresignedPutUrl`; log PUT URL generation with `ownerId` and `assetId` |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T5 | Malicious file uploaded (polyglot image/malware) via valid pre-signed URL | MIME type validated against allowlist (jpeg, webp, mp4); 50 MB size cap | Medium | **RA-26**: Add magic-byte validation (not just Content-Type header) in transcode worker before processing; consider ClamAV scan step in transcode pipeline |
| T6 | Attacker uploads SVG with embedded JavaScript (stored XSS via place gallery) | SVG is not in `ALLOWED_MIMES` set | Low | No action required (SVG correctly excluded) |

### R — Repudiation

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| R3 | Owner denies uploading a specific asset | `assetTable` stores `ownerId`, `bucketKey`, `mimeType`, `sizeBytes`; bucket key = `{ownerId}/{assetId}.{ext}` | Low | **RA-27**: Log asset creation event (ownerId, assetId, IP, timestamp) via structured log and/or RabbitMQ audit event |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I6 | Direct MinIO URL accessible to guests/public (bypassing BFF 302 auth check) | MinIO ports bound to `127.0.0.1` only; not in Traefik public routes | Low | **RA-28**: Confirm no Traefik rule exposes MinIO API or console publicly; add to deploy checklist |
| I7 | Pre-signed PUT URL exposes MinIO bucket name and path structure | URL reveals bucket name and `{ownerId}/{assetId}` path; sent to authenticated owner browser only | Low | Accepted risk — URL is scoped to owner session |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D4 | Owner floods upload endpoint to exhaust MinIO storage | 50 MB per-upload cap; no per-owner upload rate limit documented | Medium | **RA-29**: Add per-owner upload rate limit (e.g., 20 uploads/hour) at BFF layer; set MinIO storage capacity alert at 80% |
| D5 | Transcode worker queue backed up by large video uploads | 50 MB cap; transcode runs async after `uploadComplete` | Low–Medium | **RA-30**: Configure RabbitMQ DLX for `media.uploaded` queue; alert on DLX depth |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E6 | Guest-authenticated request triggers upload signing (guest impersonates owner) | `/v1/uploads/sign` protected by `verifyInternal` — guests have no path to call this directly; only owner routes in BFF call media-svc | Low | **RA-12** (CI auth test covers this) |

---

## 5. Chat Surfaces (WebSocket, Telegram webhook, WhatsApp webhook)

**Component**: BFF proxies WebSocket chat to chat-hub. chat-hub normalizes messages from/to Telegram (via `aiogram`, `X-Telegram-Bot-Api-Secret-Token` header validation) and WhatsApp (driver TBD). Messages persist to `message` table; RabbitMQ distributes channel events.

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S9 | Fake Telegram webhook payload impersonating an owner reply | `X-Telegram-Bot-Api-Secret-Token` header validated; mismatch → 403; Telegram sets this header on POST to the registered webhook URL | Low (if secret set) | **RA-31**: Make `TELEGRAM_WEBHOOK_SECRET` **required** in production config (not optional); add startup assertion |
| S10 | WebSocket impersonation: attacker connects with a stolen guest JWT | WS route auth-guarded via BFF auth plugin (same HS256 + JTI revocation as REST) | Low | **RA-14** (WS per-jti limit applies here too) |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T7 | Message body from Telegram contains HTML/JS injected into owner backoffice chat view | `msg.text` extracted as plain string; downstream rendering determines injection risk | Medium | **RA-32**: Enforce HTML entity escaping on all `message.body` fields before rendering in backoffice chat UI; never use `dangerouslySetInnerHTML` with message bodies |

### R — Repudiation

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| R4 | Guest or owner denies sending a specific message | `message` table stores `direction`, `channel`, `ext_ref`, `body`, `ts`; external message ID from Telegram preserved | Low | **RA-33**: Enforce append-only insert pattern for `message` rows — no UPDATE or DELETE on message content |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I8 | Guest A reads Guest B's chat thread | Thread scoped by `reservation_id` from verified JWT; BFF must filter by thread ownership | Low | **RA-34**: Add integration test: guest A's JWT cannot read or send to a thread belonging to guest B's reservation |
| I9 | WhatsApp webhook body (phone number, profile name) logged as PII | WhatsApp driver not yet implemented | Medium (future) | **RA-35**: Before shipping WhatsApp driver: add PII field redaction in log serializers; list fields to mask: `phone`, `profile_name`, `wa_id` |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D6 | Telegram bot spam flood: each inbound message triggers DB write + MQ publish | No per-sender rate limit on `/v1/webhook/telegram` | Medium | **RA-36**: Add rate limit on `/v1/webhook/telegram` (e.g., 10 req/min per chat_id); implement per-sender cooldown in TelegramDriver |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E7 | Telegram message body used as LLM context without sanitization (prompt injection) | Per D14: guest free-text in planner is wrapped in delimited block; chat messages fed to reservation drafter | Medium | **RA-37**: Any user-controlled text entering a prompt (chat messages, guest notes) must be wrapped in `<user_input>` delimiters and never concatenated into system instructions; audit `reservation_drafter.py` and `prompt_template.py` |

---

## 6. Planner-svc (RAG + Anthropic LLM + provenance validation)

**Component**: Python/FastAPI service. Retrieves candidate places from search-svc (`/v1/query`), assembles prompt with delimited guest free-text, calls Anthropic Messages API, validates every `place_id` in output against retrieval set, persists `tour_plan`. API key loaded from `settings.anthropic_api_key` (Pydantic Settings).

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S11 | Attacker on `dt_internal` serves fake search-svc responses with poisoned place data | planner→search-svc calls use plain HTTP on `dt_internal`; no mutual auth between internal services | Medium | **RA-38**: Add `SEARCH_SVC_INTERNAL_TOKEN` header on planner→search-svc calls (same pattern as BFF→media-svc); search-svc validates the header |
| S12 | MITM between planner-svc and Anthropic API (forged LLM response) | Direct Anthropic SDK over HTTPS; Python `httpx` validates certificate chain | Low | No action required |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T8 | LLM hallucinates `place_id` values not in retrieval set | Server-side provenance validation rejects unknown IDs (D14, FR-TUR-07); test coverage in `test_provenance.py` | Low | **RA-39**: Verify validation runs **before** `tour_plan` is persisted to DB; add monitoring metric for provenance rejection rate |
| T9 | Prompt injection via guest free-text influencing system instructions | Guest free-text wrapped in delimited block (D14); not concatenated to system instructions | Low–Medium | **RA-40**: Add adversarial prompt injection test in `test_assembler.py`; verify delimiter cannot be escaped with `]]>` or equivalent |

### R — Repudiation

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| R5 | Planner claims a tour plan was not generated by the LLM | `tour_plan` persisted with `reservation_id`, `params`, `status` | Low | **RA-41**: Log a hash of the raw LLM response alongside `plan_id` for audit |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I10 | `anthropic_api_key` printed in logs or exception traceback | Settings loaded via Pydantic; key value exposed in `repr(Settings())` by default | Medium | **RA-42**: Declare `anthropic_api_key: SecretStr` in Pydantic Settings; verify key never appears in log output or error messages |
| I11 | Retrieval returns draft/unpublished places to a guest tour | search-svc query result filtered to `published` status (expected) | Medium | **RA-43**: Add integration test: search-svc `/v1/query` returns no `draft` or `owner_approved` places; verify filter is in search-svc, not just planner |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D7 | LLM API cost spike via tour plan flooding | Per-reservation rate limit documented in D14; concrete value and implementation TBD | Medium | **RA-44**: Set concrete rate limit (3 plans/hour/reservation); implement cost tracking per `plan_id` in DB; set Anthropic account spend cap |
| D8 | Anthropic API timeout causes plan worker to hang indefinitely | `anthropic_request_timeout_seconds` in Settings; default value TBD | Low–Medium | **RA-45**: Set `anthropic_request_timeout_seconds = 30`; configure RabbitMQ DLX for `tour.requested` queue; cap retries at 3 with exponential backoff |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E8 | LLM generates output with unexpected fields (e.g., system commands, URLs) | Structured JSON output with fixed schema; `place_id` provenance check | Low | **RA-46**: Validate LLM output against Pydantic model before DB insert — reject any extra fields with `model_config = ConfigDict(extra='forbid')` |

---

## 7. Public BFF (rate limits + CORS + helmet headers)

**Component**: Fastify BFF as the sole public ingress. Global rate limit 200 req/min. `@fastify/helmet` registered (CSP currently disabled). CORS `origin: true` (echo request origin — dev posture). Health endpoint rate limit disabled.

### S — Spoofing

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| S13 | Cross-origin request from malicious site exploiting CORS wildcard | `origin: true` echoes any origin — effectively wildcard in current config | **High** | **RA-47**: Set `origin: [process.env.ALLOWED_ORIGIN]` before production deploy; fail startup if `ALLOWED_ORIGIN` is unset or `*`; add to Phase 2.A deploy checklist |

### T — Tampering

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| T10 | XSS payload injected via place description, chat message, or tour plan — no CSP to block exfiltration | `contentSecurityPolicy: false` in helmet config | **High** | **RA-48**: Implement CSP before Phase 2.A production deploy; baseline: `default-src 'self'; img-src 'self' data: blob:; connect-src 'self' <BFF_URL> <TILE_URL>; script-src 'self'; style-src 'self' 'unsafe-inline'` — iterate from there |

### R — Repudiation

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| R6 | Forensics fail because access logs lack correlation IDs | pino logs `method`, `url` (redacted), `remoteAddress`; no request correlation ID | Low–Medium | **RA-49**: Add `X-Request-ID` header (generate if absent); log `requestId` on every request for Loki query correlation |

### I — Information Disclosure

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| I12 | Missing `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` | helmet defaults should set these; CSP is the only explicitly disabled one | Low | **RA-50**: Run `curl -I https://<prod-url>` post-deploy and audit header list; ensure `noSniff`, `frameguard`, `hsts` are active |
| I13 | `/health` endpoint leaks service liveness without authentication at zero cost | `rateLimit: false` on `/health` — completely unthrottled | Low–Medium | **RA-51**: Move detailed health check to `/internal/health` (IP-allowlisted to monitoring network); `/health` returns 200 `{"ok": true}` only |

### D — Denial of Service

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| D9 | IP rotation bypasses per-IP rate limit on global endpoints | 200 req/min per IP; no ASN-level or behavior-based blocking | Medium | **RA-8** (same recommendation as token-exchange: Traefik fail2ban + Cloudflare) |
| D10 | Rate limit header reveals internal limit values to attacker | Standard 429 response from `@fastify/rate-limit` | Low | **RA-52**: Customize 429 body to omit limit values; set `Retry-After` header only |

### E — Elevation of Privilege

| # | Threat | Mitigations (current) | Residual | Recommended actions |
|---|--------|----------------------|----------|---------------------|
| E9 | Admin route accidentally marked `auth: 'public'` | Secure-by-default: every route gets `authenticate` unless explicitly opting out | Low | **RA-12** (CI integration test covers this) |

---

## Risk Summary

| Rating | Count | Recommended actions |
|--------|-------|---------------------|
| **High** | 2 | RA-47 (CORS wildcard), RA-48 (missing CSP) |
| **Medium** | 14 | RA-1, RA-9, RA-10, RA-17, RA-23, RA-24, RA-26, RA-29, RA-36, RA-37, RA-38, RA-42, RA-44, RA-47 |
| **Low** | remainder | Tracked below |

### Pre-production gates (must fix before Phase 2.A deploy)

These address the two High residual risks and the highest-impact Mediums:

| Priority | Action | Component |
|----------|--------|-----------|
| P0 | **RA-47** — restrict CORS to production origin | Public BFF |
| P0 | **RA-48** — implement CSP baseline | Public BFF |
| P1 | **RA-17** — enforce MFA in Authentik for owner | Owner auth |
| P1 | **RA-23** — multi-tenant isolation CI tests | Owner auth / Catalog |
| P1 | **RA-10** — add `iss` claim to JWT | Guest token |
| P1 | **RA-31** — require `TELEGRAM_WEBHOOK_SECRET` | Chat surfaces |
| P1 | **RA-42** — `SecretStr` for Anthropic API key | Planner |
| P1 | **RA-44** — concrete LLM rate limit + spend cap | Planner |

### Post-launch (Phase 3.x hardening)

| Action | Component |
|--------|-----------|
| RA-24 — replace static `X-Internal-Token` with Authentik audience | Media / BFF |
| RA-38 — planner→search-svc internal auth | Planner / Search |
| RA-26 — magic-byte validation in transcode worker | Media |
| RA-8 — Traefik fail2ban / Cloudflare fronting | Infrastructure |
| RA-37 — prompt injection audit (chat → LLM path) | Chat / Planner |

---

## Appendix A — STRIDE reference

| Letter | Threat type | Violates |
|--------|-------------|----------|
| S | Spoofing | Authentication |
| T | Tampering | Integrity |
| R | Repudiation | Non-repudiation |
| I | Information Disclosure | Confidentiality |
| D | Denial of Service | Availability |
| E | Elevation of Privilege | Authorization |

## Appendix B — Out of scope (v1)

- **Supply-chain / dependency threats**: covered by `pnpm audit --prod`, `pip-audit`, `trivy`, `gitleaks`, and Renovate auto-patch — separate process, not modelled here.
- **n8n workflows**: n8n is on `dt_internal` + behind Authentik forward-auth; treat as trusted admin tooling for v1. Revisit if n8n gets a user-facing integration.
- **Postgres / Redis / RabbitMQ internal threats**: all bound to `127.0.0.1`; access requires VPS shell access — out of scope for application-layer threat model.
- **Physical / host security**: single VPS — operator responsibility, not modelled here.
- **WhatsApp Business API driver**: not yet implemented; RA-35 and RA-9 cover the pre-conditions for safe implementation.
