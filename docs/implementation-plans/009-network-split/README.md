# Plan-009 — Split the ingress network from the service mesh

> **Lifecycle: READY — design settled from a live topology read 2026-08-24; awaiting execution kickoff.**
>
> Closes option 2 of [`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36) — _"catalog-svc answers ANY caller on `dt_internal` with no credential, and another product's containers are on that network"_. Option 1 of that card (a service-wide internal-token gate on catalog-svc) **already shipped** in PR [`#459`](https://github.com/zmeireles/daily-tour/pull/459); this plan is the architectural half, and the two are complementary, not alternatives.

## Premise

`dt_internal` is doing two unrelated jobs at once: it is the **reverse-proxy fabric** Traefik uses to reach the things it routes, and it is the **service mesh** the Daily Tour backend talks over. Because those two jobs share one network, a container that needs only the first gets the second for free.

That is not hypothetical. `qr-bell` — a different product, a different repo, a different CI runner — joins `dt_internal` **deliberately and reasonably**, to reuse Daily Tour's single Traefik instance for TLS and routing. Its own overlay says so in a comment. The side effect was never intended: joining for the proxy also granted reachability to Postgres, Redis, RabbitMQ, MinIO and every internal service.

The measurement on the card is the proof — from inside `qrb-api`, with no credential, `dt_catalog_svc:8081/v1/places` returned full place records including a personal contact email. And the premise this whole posture rested on is written down in `services/media-svc/src/plugins/internal-auth.ts:8`:

> The BFF is the **sole trusted caller** on `dt_internal`.

⚠️ **That line cannot be falsified from inside this repo.** Daily Tour's compose never mentions qr-bell; nothing here changes when another repo attaches to the network. A comment asserting a property of a shared network, maintained in only one of the repos that shape it, rots silently and by construction. **This plan's real deliverable is making that assertion mechanically checkable** — the network split is how, and the guard in Slice 3 is what keeps it true.

## What the topology actually is (measured, not assumed)

Read from the compose tree on 2026-08-24. **Only five services carry Traefik router labels** — everything else on the network has no ingress role whatsoever:

| Needs Traefik to reach it (has router labels)                         | Has no ingress role at all                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bff`, `pwa-static`, `authentik-server`, `n8n`, `traefik` (dashboard) | `token-svc`, `catalog-svc`, `media-svc`, `planner-svc`, `notif-svc`, `search-svc`, `chat-hub`, `postgres`, `redis`, `rabbitmq`, `minio`, `otel-collector`, `prometheus`, `grafana`, `blackbox-exporter`, `alertmanager`, `osrm` |

**That ratio is what makes the split tractable.** Five services need dual-homing; seventeen need nothing done to them at all. The change is much smaller than "rework the network layout".

Files that declare or reference `dt_internal`: ten compose files under `infra/compose/`, three config files (`infra/traefik/traefik.yml`, `infra/observability/prometheus.yml`, `infra/observability/otel-collector.yml`), and two workflows (`.github/workflows/deploy-qa.yml`, `load-test.yml`) — **plus, in the other repo**, `qr-bell/infra/compose/overlay.qrb-qual.yml` and `qr-bell/.github/workflows/deploy-qual.yml`.

## The design

Introduce **`dt_edge`** — a network whose only purpose is proxy traffic — and leave `dt_internal` as the service mesh, keeping its name so seventeen services need no edit.

- **`traefik`** → `dt_edge` **only**. It has no business on the mesh; it never talks to Postgres.
- **The four routed services** (`bff`, `pwa-static`, `authentik-server`, `n8n`) → **both** networks. Edge for ingress, mesh for their real work.
- **Everything else** → `dt_internal` only. Untouched.
- **qr-bell's `qrb-api` / `qrb-web`** → `dt_edge` instead of `dt_internal`.

The result: qr-bell keeps its TLS and its shared ingress, and loses reachability to the mesh entirely.

### Why the residual edge co-tenancy is acceptable — and where it is not

After the split, qr-bell can still reach `bff`, `pwa-static`, `authentik-server` and `n8n` on `dt_edge`. That is **not** a new exposure for the first two: both are internet-facing through Traefik already, so a co-tenant gains nothing the public internet does not have.

🔴 **It is not free for the other two, and this is the plan's one honest caveat.** Reaching a container directly on `dt_edge` **bypasses every Traefik middleware** — the dashboard's basic-auth, any rate limit, any IP allowlist. So for anything whose protection lives in a middleware rather than in the service itself, edge co-tenancy is still a real reduction in defence. **`n8n` is the sharp case**: a workflow engine whose entire purpose is issuing arbitrary HTTP requests, sitting next to a co-tenant. Slice 3 therefore checks n8n's own authentication rather than assuming the proxy is what protects it.

⇒ If that check finds n8n relies on Traefik for protection, the correct answer is a **third** network (`dt_ops`) for the ops-only services, not a weakening of this plan. Deliberately out of scope here — flagged, not folded in.

## Slices

### Slice 1 — `dt_edge` exists and is dual-homed (Daily Tour only, additive)

Create the network; attach `traefik` and the four routed services to it **in addition to** `dt_internal`. **Nothing is removed.** qr-bell is untouched and keeps working, because Traefik is on both networks throughout.

🔴 **The one thing that will break this slice if forgotten:** once a routed container is on two networks, Traefik can no longer infer which IP to use, and picks one **non-deterministically**. Every routed service must therefore gain an explicit `traefik.docker.network=dt_edge` label **in the same commit that adds the second network** — not in a follow-up. qr-bell already does this correctly (`traefik.docker.network=dt_internal`), which is the precedent to copy; Daily Tour's own services do **not** set it today because they have never needed to.

### Slice 2 — qr-bell moves to `dt_edge` (other repo)

In `overlay.qrb-qual.yml`, switch `qrb-api` and `qrb-web` from `dt_internal` to `dt_edge` and update both `traefik.docker.network` labels to match. Update the preflight guard in `qr-bell/.github/workflows/deploy-qual.yml`, which today inspects `dt_internal` by name and would otherwise pass while asserting the wrong thing.

### Slice 3 — remove the overlap, and make the boundary self-checking (Daily Tour)

Drop `dt_internal` from the `traefik` service. Then add the guard that makes this plan durable: **a check that fails when a container outside Daily Tour's compose project is attached to `dt_internal`**, so the next repo that attaches gets a red pipeline instead of silent reachability. Update `AUTH_POSTURES.md` and the `internal-auth.ts:8` comment, and give the "sole trusted caller" claim a written falsifier — it is an assertion about a shared network, and it needs one.

## Ordering — this is the part that decides which product breaks

The three slices are **strictly ordered**, and the reason is not tidiness:

- **Slice 2 before Slice 1** ⇒ qr-bell's compose references a network that does not exist yet, `external: true` fails, and **qr-bell will not start**.
- **Slice 3 before Slice 2** ⇒ Traefik has left `dt_internal` while qr-bell is still only on it. Traefik can no longer reach `qrb-api`, and **qr-bell serves 502s** — it keeps its certificate and loses its backend, which is the failure that looks like a TLS problem and is not.

Slices 1 and 2 are both **purely additive**, so each is revertable on its own by putting the old network line back and redeploying; no data moves and no image is rebuilt. Only Slice 3 is subtractive, which is exactly why it is last and why it does not run until Slice 2 is verified green in the other repo.

⚠️ **Two repos, two pipelines, one box.** Nothing enforces this ordering mechanically — it is a human sequencing constraint across repositories, and the qr-bell deploy is triggered separately. Do not start Slice 3 on the strength of Slice 2 being _merged_; start it on Slice 2 being _deployed and verified_.

## Verification — the probe must be able to fail

The card already names this trap: today an un-credentialed request **succeeds**, so a test asserting "the BFF can read places" passes identically before and after and proves nothing. The same applies to the network probe — after the split, `connection refused` from a broken probe and `connection refused` from a working boundary are the same string.

⇒ **Every negative below is paired with a positive control taken in the same shell, at the same moment.**

| #   | probe                                                         | required                          | why it discriminates                                                                                                    |
| --- | ------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | from `qrb-api`: `dt_catalog_svc:8081/v1/places`               | **fails to resolve/connect**      | the defect itself — this returned 200 + PII before                                                                      |
| 2   | from `qrb-api`: `dt_postgres:5432`, `dt_media_svc:8087/ready` | **fails**                         | the mesh is gone, not just one host                                                                                     |
| 3   | from `qrb-api`: reach `dt_traefik`                            | **succeeds**                      | 🔑 **positive control** — proves the probe has a network and 1–2 are a boundary, not a broken shell                     |
| 4   | `https://qrb-qual.codecomedy.dev` + `/api/...` end to end     | **200 over TLS**                  | qr-bell kept the thing it joined for                                                                                    |
| 5   | `https://qual.stay.portugalodyssey.pt` guest + owner flows    | **unchanged**                     | the four dual-homed services still route                                                                                |
| 6   | from `bff`: `dt_catalog_svc:8081/v1/places` with its token    | **200**                           | 🔑 **positive control** — the mesh still works; a fix that also broke Daily Tour would otherwise read as success on 1–2 |
| 7   | `docker network inspect dt_internal`                          | **only `dailytour-*` containers** | states the boundary as an inventory, not an inference                                                                   |

**Probes 3 and 6 are not optional.** Without 3, the whole table is satisfiable by a container with no network at all. Without 6, it is satisfiable by taking Daily Tour down.

## Rollback

Slice 1 and Slice 2 revert independently by restoring the removed network line and redeploying that repo — additive changes, so the previous state is always still valid. Slice 3 reverts by re-adding `dt_internal` to `traefik`. **No migration, no data movement, no image rebuild anywhere in this plan**, which is what keeps the blast radius to a compose edit and a `up -d`.

The one genuinely awkward window is between Slice 2 deploying and Slice 3 landing: qr-bell is on `dt_edge` while Traefik is still on both. Everything works, and the old hole is already closed for qr-bell specifically — so **it is safe to sit in that state indefinitely** if the two repos cannot be coordinated the same day.

## Out of scope

- **The `dt_ops` third network** for `n8n` / `grafana` / the dashboard — conditional on what Slice 3 finds about n8n's own auth. Flagged above, not assumed.
- **Prod.** This plan targets qual, which is where the co-tenancy exists. Prod inherits the layout when it is stood up.
- **Retiring catalog-svc's internal-token gate.** It shipped in `#459` and stays. Two independent controls is the point: the network split assumes correct compose everywhere, the token assumes nothing.
