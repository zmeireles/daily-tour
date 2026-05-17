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
