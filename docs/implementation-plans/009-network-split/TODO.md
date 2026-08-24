# Plan-009 — Split the ingress network from the service mesh — TODO

Status: **READY** — design settled 2026-08-24 from a live read of the compose tree in both repos; no slice started. Closes option 2 of [`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36); option 1 (catalog-svc internal-token gate) already shipped in [`#459`](https://github.com/zmeireles/daily-tour/pull/459) and **stays**. Full design, ordering argument and verification table in [`README.md`](./README.md). Task IDs `T-9.<slice>.<task>`.

## Priority tier

**Security hardening, qual-only.** Not launch-blocking and not beta-blocking — the card grades the exposure **🟠 latent, not 🔴 live**: catalog-svc publishes no ports and carries no router labels, so nothing here is internet-reachable. It is reachable by 25 containers, one set of which is deployed by a pipeline outside this project's control, and `#459` already closed the credential half. This plan removes the reachability itself.

## Locked design

`dt_edge` = proxy fabric · `dt_internal` = service mesh, **keeps its name** so the 17 non-routed services need no edit · `traefik` moves to `dt_edge` only · the 4 routed services (`bff`, `pwa-static`, `authentik-server`, `n8n`) are dual-homed · qr-bell's `qrb-api`/`qrb-web` move to `dt_edge`.

## Gotchas

🔴 **`traefik.docker.network=dt_edge` must land in the SAME commit that dual-homes a service** — a container on two networks makes Traefik's IP choice non-deterministic. Daily Tour's services don't set this label today; qr-bell already does, copy that. · 🔴 **Slice order is load-bearing across two repos**: 2-before-1 ⇒ qr-bell won't start (`external` network missing); 3-before-2 ⇒ qr-bell 502s (cert intact, backend unreachable — looks like TLS, isn't). · **Start Slice 3 on Slice 2 being _deployed and verified_, never on it being merged** — nothing enforces the ordering mechanically. · **Every negative probe needs its positive control in the same shell** — after the split, a broken probe and a working boundary both say `connection refused`. · Direct container access on `dt_edge` **bypasses all Traefik middleware**, so middleware-protected services keep their exposure to co-tenants.

## Progress

| Slice | Title                                     | Repo        | Size | Status |
| ----- | ----------------------------------------- | ----------- | ---- | ------ |
| 1     | `dt_edge` exists + dual-homing (additive) | daily-tour  | M    | ☐      |
| 2     | qr-bell moves to `dt_edge`                | **qr-bell** | S    | ☐      |
| 3     | Remove overlap + self-checking boundary   | daily-tour  | M    | ☐      |

---

## Slice 1 — `dt_edge` exists and is dual-homed · daily-tour · deps: none

Purely additive. Nothing is removed, qr-bell is untouched, and Traefik stays on both networks for the whole slice — so this is safe to merge and deploy on its own and sit on indefinitely.

- **T-9.1.1** — Declare `dt_edge` in `infra/compose/docker-compose.base.yml` (alongside the existing `dt_internal` block) and as `external: true` in every overlay that will attach to it.
- **T-9.1.2** — Attach `traefik` to `dt_edge` **in addition to** `dt_internal` (`docker-compose.traefik.yml`, `overlay.qual.yml`).
- **T-9.1.3** — Dual-home the four routed services and add `traefik.docker.network=dt_edge` to each, in the same commit: `bff` + `pwa-static` (`docker-compose.app.yml`, `overlay.qual.yml`), `authentik-server` (`docker-compose.authentik.yml`, `overlay.qual-authentik.yml`), `n8n` (`docker-compose.n8n.yml`, `overlay.qual-n8n.yml`).
- **T-9.1.4** — Update `.github/workflows/deploy-qa.yml` and `load-test.yml` where they reference the network by name.

**Acceptance** — deploy to qual and confirm: all Daily Tour routes still serve over TLS (probe 5); qr-bell still serves over TLS **unchanged** (probe 4); `docker network inspect dt_edge` lists traefik + the four; the mesh still works from the BFF (probe 6). Rollback = drop the added network lines, redeploy.

## Slice 2 — qr-bell moves to `dt_edge` · **qr-bell repo** · deps: Slice 1 **deployed**

- **T-9.2.1** — `qr-bell/infra/compose/overlay.qrb-qual.yml`: switch `qrb-api` and `qrb-web` from `dt_internal` to `dt_edge` (both the `networks:` list and the top-level `networks:` block), and update both `traefik.docker.network` labels to `dt_edge`.
- **T-9.2.2** — `qr-bell/.github/workflows/deploy-qual.yml:45` — the preflight inspects `dt_internal` by name; point it at `dt_edge`. ⚠️ Left as-is it still **passes**, while asserting the wrong precondition.
- **T-9.2.3** — Update the overlay's header comment, which documents the `dt_internal` coupling in prose.

**Acceptance** — qr-bell serves over TLS end to end (probe 4), **and** probes 1–3 now hold from inside `qrb-api`: catalog-svc and the mesh unreachable, Traefik reachable. Do not accept 1–2 without 3.

## Slice 3 — Remove the overlap and make the boundary self-checking · daily-tour · deps: Slice 2 **deployed and verified**

The only subtractive slice.

- **T-9.3.1** — Remove `dt_internal` from the `traefik` service.
- **T-9.3.2** — Add the guard: fail when a container outside the `dailytour-*` compose project is attached to `dt_internal` (probe 7 as an assertion, not an observation). This is the deliverable that keeps the plan from rotting — the next repo to attach gets a red pipeline instead of silent reachability.
- **T-9.3.3** — Correct `services/media-svc/src/plugins/internal-auth.ts:8` ("the BFF is the sole trusted caller") and `services/bff/src/plugins/AUTH_POSTURES.md`, and give the claim a written falsifier — it asserts a property of a network another repo can change.
- **T-9.3.4** — Check whether `n8n` authenticates callers itself or relies on Traefik middleware. If the latter, **file `dt_ops` as a separate card** — do not widen this plan.

**Acceptance** — the full 7-probe table in [`README.md`](./README.md), all seven, positive controls included. Then close [`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36) with the evidence.
