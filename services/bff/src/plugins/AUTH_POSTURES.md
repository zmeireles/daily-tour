# BFF auth postures

The BFF dispatches every route through one of three auth postures. Every
route registered after [`auth.ts`](./auth.ts) defaults to `required` (the
guest path); opt out per route via `config: { auth: 'public' | 'owner' }`.

| Posture                | Issuer    | Algorithm    | Required claim                                                        | Used by                                       | Plugin                             |
| ---------------------- | --------- | ------------ | --------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| `required` _(default)_ | token-svc | HS256        | (none — JTI revocation cache enforced via Redis `jti:revoked:<jti>`)  | reservation routes, future guest-visible APIs | [`auth.ts`](./auth.ts)             |
| `owner`                | Authentik | RS256 (JWKS) | `aud: <AUTHENTIK_OWNER_AUDIENCE>` OR `groups: [..., <expected>, ...]` | backoffice routes (T-1.6.x slice)             | [`owner-auth.ts`](./owner-auth.ts) |
| `public`               | —         | —            | —                                                                     | `/health`, `/r/:token`, public landing data   | (no preHandler)                    |

## Status-code semantics

| Posture    | Missing/malformed header | Bad signature / expired | Wrong audience       | Revoked JTI (guest)  |
| ---------- | ------------------------ | ----------------------- | -------------------- | -------------------- |
| `required` | 401 `unauthorized`       | 401 `unauthorized`      | n/a                  | 401 `revoked`        |
| `owner`    | 401 `unauthorized`       | 401 `unauthorized`      | 403 `wrong_audience` | n/a (stateless JWKS) |

### Where the `required` posture's revocation actually comes from

The Redis key is the whole enforcement, so it is worth naming both ends:
**token-svc's revoke routes WRITE `jti:revoked:<jti>`; this plugin READS it.**
The key shape and its TTL live in `@daily-tour/shared-types` (`jtiRevokedKey`,
`GUEST_JWT_MAX_TTL_SECONDS`) precisely because writer and reader are different
services — and a reader with no writer looks exactly like a working control.

Postgres's `token_grant.revoked_at` is the record, not the enforcement: it stops
a revoked grant being exchanged for a **new** JWT, and does nothing about the one
already in the guest's browser.

Owner-path 401 vs 403 matters for the PWA `/admin/callback` flow:

- 401 → trigger refresh / re-login.
- 403 → surface "not a staff member" to the user, do NOT retry.

## Adding a new owner-route

```ts
fastify.get("/v1/owner/places", { config: { auth: "owner" } }, async (req, _reply) => {
  // req.user holds the verified Authentik JWT payload (sub, email,
  // name, groups, aud, exp, iat). Use req.user.sub to attribute writes.
  return listPlacesForOwner(req.user as { sub: string });
});
```

## Posture matrix vs route categories

The mapping below is _intended_ state; not every route is implemented yet.

- `/health`, `/r/:token`, `/public/*` → `public`.
- `/v1/discover/*`, `/v1/places/:id`, `/v1/reservations/*` → `required` (guest JWT).
- `/v1/owner/*`, `/v1/admin/*`, `/v1/backoffice/*` → `owner` (Authentik JWT).
- `/v1/internal/*` → never reach the BFF (catalog-svc / media-svc use a separate `X-Internal-Token`).

> ⚠️ **`X-Internal-Token` is a shared secret on `dt_internal`, not a proof the caller is the BFF.**
> It became load-bearing the day another product's containers (qr-bell) joined
> `dt_internal` to reuse Traefik — network membership stopped implying "the BFF".
> Both catalog-svc (`plugins/internal-auth.ts`, added dt-tests #36) and media-svc
> now reject any non-health request without it. `/health` and `/ready` stay open
> because Docker's healthcheck sends no headers.
>
> ⟲ **Falsifier:** from a container on `dt_internal` that is NOT the BFF, `curl`
> `http://dt_catalog_svc:8081/v1/places` with no header. A 200 with data means the
> gate regressed or was never wired; a 401 means it holds. (Measured 401 after
> #36; measured 200 — full data — before it.)
