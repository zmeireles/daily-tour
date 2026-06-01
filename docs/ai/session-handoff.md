# Session Handoff — 2026-05-28 → 31 → 06-01 → next session

> **UPDATE 2026-06-01 (close-out): #184 MERGED (`1ab8310`), #147 slice-C CLOSED (done), two follow-ups spun out.** All four slice-C parts now on `main` (parts 1+2 #184, part 3 #181, part 4 #182). **Key finding on close-out:** the enrichment is **not actually user-visible** — planner produces `travel_to_minutes`/`weather_aware`, but the BFF `toStop()` (`services/bff/src/lib/tour-plan-view.ts` ≈L59-69) **drops both**, and the PWA `TimelineStop` has no travel/weather UI. So #147 closed as a **backend skip-case** (no rendered consumer change), and the genuine user-visible work + its forward-flow UAT moved to a new task:
>
> - **daily-tour #149** `[pwa+bff]` — surface travel-time + weather-aware in the tour timeline (BFF `toStop` mapping → PWA `TimelineStop` render). **Carries the deferred forward-flow UAT.** Start here if picking up user-facing planner work.
> - **daily-tour #148** `[planner-svc]` — reconcile planner's own `planner` exchange/queue onto canonical `dt.events` bus (the #182 carry-over; tech-debt).
> - dt-tests `review` queue was empty at close-out. tasks-prod MCP needed a `/mcp` reconnect this session.

> **UPDATE 2026-06-01 (later): #147 slice-C parts 2+3 SHIPPED — OSRM travel-time + IPMA weather wired (PR #184, merged).** This closes the OSRM/IPMA slice the prior entry scoped. `process_plan` is now wired into the consumer (`_process_plan` → `_enrich_plan` → annotate travel times → `process_plan`). Highlights:
>
> - **Gap the prior scope missed:** RAG candidates carry no coords, but `estimate_minutes` needs lat/lng. Resolved in-house by reading `catalog.place` (planner already has `GRANT SELECT ON catalog`) via a minimal read-only `PlaceRow` + `repository/places.get_place_coords` — **no second-service change**.
> - Added the **Redis client planner-svc lacked** (`cache.get_redis`, lazy singleton) + `REDIS_URL`/`OSRM_URL` compose env. **Weather degrades gracefully** — `process_plan` now catches `RedisError` around `get_forecast` (the prior code only caught IPMA HTTP failures, so a Redis outage would have dead-lettered plans).
> - `annotate_travel_times` recomputes inter-stop `travel_to_minutes` (first step left unset — placeholder guesthouse origin). Over-budget day → `TravelTimeError` → `mark_rejected("travel_time: …")`.
> - **Live-verified** (rebuilt planner-svc): POST → `ready`, per-step travel `None,3,4,14` (haversine — OSRM not deployed locally), IPMA forecast cached in Redis (5 days, ~30m TTL), `weather_aware:false` (today < 60% rain). ruff+mypy+pytest green (34 passed, 4 new).
> - **Remaining #147:** parts 2+3 done; **part 1 (#181) + part 4 (#182)** shipped earlier this session — so **all of slice-C is now landed pending #184 review.** Only the carry-over follow-up remains: planner's own `planner` exchange vs canonical `dt.events`/`tour.requested` (flagged in #182).
> - **OSRM overlay not brought up** (`overlay.osrm.yml`, optional) — haversine fallback verified instead.
> - ⚠️ **Riff/dt-tests MCP (`mcp__tasks-prod__*`) was NOT loaded this session** — polling ritual couldn't run; user must `/mcp` to reconnect. #147 progress not recorded in Riff yet.

> **UPDATE 2026-06-01 (#147 planner slice-C, 2/4 done + the other 2 fully scoped).** Marathon session also shipped the retro prevention work (P4 #177 env-check table asserts, P2 #178 journey smoke, **#180 Python services finally in CI** — ruff+mypy+pytest matrix; cleared the accumulated lint/type debt across all 4 py services) and a `make help` fix (#179). Then opened #147 slice-C:
>
> - **#181 (part 1 — real `reservation_id`)** — JWT `rid` → BFF → planner POST → `tour_plan.reservation_id` column → `plan_payload.reservation_id` (was the `plan_id` placeholder). Live-verified. ⚠️ schema migration 0002, **awaiting review/merge**.
> - **#182 (part 4 — DLQ)** — planner's queue now dead-letters poison-pills to the canonical **`dt.dlx`** (discovered planner was the _lone_ queue off the project's `dt.events`/`dt.dlx` convention; aligned it). Live-verified (nack → `dt.dlx.unrouted`). ⚠️ broker-topology (one-time queue-delete migration), **awaiting review/merge**.
>
> **Remaining #147 parts 2+3 (OSRM travel-time + IPMA weather) = ONE fresh slice — fully de-risked this session:**
>
> - The enrichment is **built + tested already** (`validators/travel_time.py`, `weather/swap.py`, `workers/plan_worker.py::process_plan`) but **`process_plan` is never wired into the pipeline** (`produce_plan` doesn't call it). That's the gap.
> - Both degrade gracefully: `estimate_minutes` is OSRM-first with **haversine fallback**; `get_forecast` (in `daily_tour_common.weather.ipma_client`) is a **read-through cache** (fetches the IPMA public API for Ponta Delgada `3490100`, no key; **returns `[]` on failure**). The slice-B-feared "IPMA cache-accounting gap" is NOT real.
> - **Work for the fresh slice:** (1) add a **redis client** to planner-svc — it has _none_ today (config `redis_url` + connection + compose `REDIS_URL`); `process_plan` needs `aioredis.Redis`. (2) recompute `travel_to_minutes` per step via `estimate_minutes` (OSRM/haversine) using candidate coords, replacing the LLM's guess. (3) call `process_plan(plan, candidates, redis)` after `produce_plan` in `mq._process_plan`. (4) behavior change: over-budget days now → `TravelTimeError` → `mark_rejected` (new failure surface). (5) optional: bring up `overlay.osrm.yml` (~15MB PBF + ~60s build) to verify the real OSRM path vs haversine. `planner.config.osrm_url` already defaults to `http://osrm-routed:5000`.
> - **Follow-up flagged (#182):** planner uses its own `planner` exchange + a queue absent from `infra/rabbitmq/definitions.json`, instead of the canonical `dt.events`/`tour.requested`. Worth reconciling.
> - **Riff tunnel `:15432` was DOWN** at session end (ECONNREFUSED) — couldn't update #147. Reconnect (L021) + record slice-C 2/4 progress + the parts-2/3 scope above as a #147 sub-task.

> **UPDATE 2026-05-31 (T-4.0.1 shipped): UAT-G08 PASSED.** PR #175 shipped chat-hub Postgres persistence + typed ack + `GET /v1/history`, a bff `GET /v1/chat/history` proxy, and pwa history re-hydration — closing the UAT-G08 "messages don't survive reload" gap. Browser-verified via **DT-TESTS-23 PASS** (send → reload → persists; send+ack frames). Latent fix bundled: blank `${VAR:-}` chat-hub credentials now coerce to `None` (was crashing startup via `aiogram.Bot("")` on first rebuild since the telegram mount). **T-4.0.1 is the 2nd of the four retro-flagged false-resolves genuinely shipped + browser-attested.** Reservation-scoped threads deferred to BFF `rid` forwarding (Riff #147). **Next leveraged lane: P4 — `dev-env-check.sh` table-existence assertions (would have caught the empty `chat.*`/`planner.tour_plan` schemas).**

> **UPDATE 2026-05-31 (post-#171): UAT-G07 PASSED.** After #172 (BFF `steps[]`→`stops[]` mapping) + #173 (Makefile compose lifecycle) landed, DT-TESTS-21 (UAT-G07 retry) was browser-verified PASS in a fresh incognito window: 4-step time-ordered timeline, real Azores places, `POST /v1/tour-plans`→201, telemetry→204, no console errors. daily-tour Riff **#143 closed (done)** — its slice-C enhancements (IPMA/OSRM/DLQ/real `reservation_id`) spun out to **Riff #147**. T-3.0.3 is now the first of the four retro-flagged false-resolves to be genuinely shipped _and_ browser-attested. **Next leveraged lane: T-4.0.1 retry (chat-hub persistence + `in_app` echo) → unblocks UAT-G08 full PASS.**

> **Multi-day arc, 11 PRs merged (#160–#170).** Closed out Plan-002 Slice 2.C to 5/6 (only T-2.C.1 chat WS eslint retry remains, gated on a concrete repro), surfaced + fixed four Plan-001 plan-accounting failures, shipped the planner worker end-to-end (UAT-G07 now returns a real LLM-generated plan), and patched the BFF chat WS framing bug that was blocking UAT-G08. **Next session resumes by re-running UAT-G07 to verify the planner pipeline lands a real plan in the browser.** ✅ done — see UPDATE above.

## TL;DR — resume next session

```bash
git checkout main && git fetch origin --prune && git reset --hard origin/main
source /home/jmeireles/.nvm/nvm.sh && nvm use 22.22.3       # Node 25 in PATH; .nvmrc pins 22.22.3
bash scripts/dev/dev-env-check.sh --markdown                # env gate — should be ✅ all checks
# Vite likely down (it dies SIGTERM across long gaps); restart:
pnpm --filter @daily-tour/pwa dev                            # → http://localhost:5173
# tasks-prod MCP: if `mcp__tasks-prod__*` not visible, user runs /mcp.
# If SSH tunnel to VPS Postgres on :15432 is down (ECONNREFUSED), user must reconnect (see L021).
```

**Then, in priority order:**

1. **Re-run dt-tests UAT-G07** — the planner worker now ships real LLM plans (PR #167+#168). UAT was BLOCKED at end of last UAT session; should now PASS-or-PASS-with-issues. Re-fingerprint task body + fresh token first; the existing token from the last G07 attempt is invalid (used by the test).
2. **Pick next lane** from the "Still outstanding" list below.

## What landed this arc (chronological)

### 2026-05-28 — Plan-002 Slice 2.C kick-off

| #    | Title                                                                       | What                                                                                                                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #160 | docs(handoff,plan-002): session closeout 2026-05-29 + close T-2.C.2/T-2.C.3 | repo squash-merge setting fix (`squash_merge_commit_title=PR_TITLE`) — eliminates the per-PR `--subject` workaround that bit #151/#159. Also marked T-2.C.3 done (was already shipped in `eslint.base.js`).                                                                    |
| #161 | docs(lessons): close T-2.C.5 — L019-L021 project-local + L017-L018 playbook | Lessons codified from the operational pain points (layout-wrapper cross-route audit, Node nvm drift, tasks-prod tunnel diagnosis, squash-merge title setting, cs-agent push PR title gap).                                                                                     |
| #162 | docs(plan-001,plan-002): close T-2.C.0 — retroactive Wave 29-bulk catch-up  | EXECUTION.md gap closed with a retroactive Wave 29-bulk entry mapping the 45 Phase 2-5 tasks to PRs #61-#94.                                                                                                                                                                   |
| #163 | docs(plan-001): close T-2.C.4 — estimate recalibration from Plan-001 data   | `calibration.md` — 28-wave wall-clock analysis. Headline: late-Plan-001 ratio is **0.20× of predictions with a 10-min floor**. New heuristic: `realistic_actual = max(10 min, 0.20 × first_instinct)` for steady-state familiar work; reverts to 0.5-1.0× for novel territory. |

### 2026-05-29 — PWA gap + chat WS fix

| #    | Title                                                        | What                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #164 | feat(pwa): enable 'Plan my day' CTA linking to /tour/new     | `premium-stubs.tsx` was still a disabled "Coming soon" stub even though T-3.1.0 had shipped the intake form at `/tour/new`. Converted to an enabled `<Link>`. Dropped the redundant "Message João" stub (chat tile in ActionGrid covers it). Unblocked UAT-G07 entry path.                                                                                                                  |
| #165 | fix(bff): forward chat WS frames preserving text/binary type | BFF chat-ws bridge was calling `upstream.send(data)` on a `Buffer` without `{ binary: isBinary }` → `ws` defaulted to **binary** frames → chat-hub's `receive_text()` crashed with `KeyError('text')`. Fix threads `isBinary` through both relay directions. Regression test asserts text frames stay text end-to-end via a fake upstream WS server. Unblocked the UAT-G08 transport layer. |

### 2026-05-30 — UAT-G07/G08 cycle + Plan-001 accounting fixes

**UAT-G07** (BLOCKED): the planner-svc crashed on `POST /v1/tour-plans` with `relation "planner.tour_plan" does not exist` (Python migrations never applied), then once that was patched the row sat at `queued` forever (the planner async consumer was never wired — T-3.0.3 plan-accounting failure). Telemetry `POST /v1/telemetry/tour` separately returned 500 with `permission denied for schema analytics` (the BFF GRANT was an `ALTER DEFAULT PRIVILEGES` clause that only covered future tables, not the pre-existing `analytics.tour_event`). Three filed retries + the dev-env migration gap → four PRs this day:

| #    | Title                                                                   | What                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #166 | fix(infra): grant BFF INSERT on existing analytics tables (#144)        | Explicit `GRANT INSERT ON ALL TABLES IN SCHEMA analytics TO bff` covering existing tables; the DEFAULT PRIVILEGES clause still handles future tables. Applied locally via manual one-liner; the SQL is in `02-roles.sql` for fresh DBs.                                                                                                                                                                                        |
| #167 | feat(planner-svc): wire aio-pika publisher + consumer (T-3.0.3 slice A) | Restored the transport layer: publisher on POST flow, consumer in `__main__.py` via `asyncio.wait FIRST_COMPLETED` (mirrors search-svc), stub handler marks plan ready with placeholder payload. UAT-G07 stops polling at `queued` forever.                                                                                                                                                                                    |
| #168 | feat(planner-svc): real LLM + RAG pipeline (T-3.0.3 slice B)            | Replaced stub with the full pipeline: translate request_payload → RAG fanout → Anthropic Messages → JSON parse → provenance check. Live-verified: POST → `ready` with 4-step plan, real place_ids, timezone-aware datetimes, contextual rationales. Failure modes (invalid_request / rag_unavailable / rag_empty / llm_unavailable / llm_error / llm_unparseable / provenance) all land in `mark_rejected` with reason+detail. |
| #169 | chore(dev-env): auto-migrate Python services in dev-up.sh (#145)        | `dev-up.sh` Stage 4 now applies `services/<svc>/migrations/*.sql` for `search-svc` and `planner-svc` as the schema-owning role. Idempotent. Verified by dropping `planner.tour_plan` + re-running the stage.                                                                                                                                                                                                                   |

**UAT-G08** (PASS-with-issues): transport works after #165, but chat-hub has zero Postgres code so messages don't persist and there's no echo. Closed as `pass-with-issues` referencing the still-open T-4.0.1 retry.

### 2026-05-30 (later) — Plan-001 accounting retrospective

| #    | Title                                                                        | What                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #170 | docs(plan-001): accounting retrospective + L022 (Plan-002 T-2.C.5 close-out) | `docs/implementation-plans/001-roadmap/retrospective.md` captures the **4 confirmed instances** of Plan-001 tasks marked done in TODO.md without shipping the working behavior (T-3.0.3, T-4.0.1, analytics GRANT, Python migrations), **4 root causes** (PR bundling, CI testing gaps, TODO ticks ≠ feature works, dev-env drift), and **5 prevention proposals (P1-P5)** for Plan-002+. L022 distils into the lessons catalog. |

## Plan-002 Slice 2.C status — 5/6 done

- ✅ T-2.C.0 — TODO.md/EXECUTION.md doc sync (#162)
- ⬜ T-2.C.1 — chat WS eslint retry (open; gated on a concrete repro that hasn't surfaced)
- ✅ T-2.C.2 — cs-agent closer-fallback fix (repo setting via #160)
- ✅ T-2.C.3 — ESLint test override (was already shipped in `eslint.base.js`; verified via #161)
- ✅ T-2.C.4 — estimate recalibration (#163)
- ✅ T-2.C.5 — lessons L017-L022 + Plan-001 accounting retro (#161 + #170)

## Still outstanding (next-session candidates)

### A. Direct continuation of today's work

1. **Re-run UAT-G07** — verify the planner pipeline lands a real plan in the browser. Re-fingerprint dt-tests #8 (DT-TESTS-8 is currently `done + failed + blocked` per fail-trail protocol; mint a fresh token, post a re-fingerprint comment, file a `retry-1` task if structure follows the G05/G08 pattern). On PASS: flip daily-tour Riff #143 to done.
2. **T-4.0.1 retry** — chat-hub schemas + persistence + in_app echo. Unblocks UAT-G08 full PASS. Substantial novel territory (need to design the persistence model + driver logic). Per calibration, plan for 60-90 min real wall-clock.

### B. Open Riff items

- **daily-tour #143.C** — IPMA weather + OSRM travel-time integration in `planner-svc`; real `reservation_id` propagation (currently using `plan_id` as a placeholder); dead-letter queue for poison-pill nacks. Multi-layer novel territory, expect 90-180 min.
- **daily-tour #135** — Signed media-svc URLs for place hero images. Still gated on real photography (product decision).
- **daily-tour #142** — host's-pick cap rule, single-vs-multi guesthouse scoping, reservations admin screen. Three product decisions — needs YOUR call before any of them is buildable.

### C. Prevention work from the Plan-001 retro

- **P4** (concrete, ~30 min) — `scripts/dev/dev-env-check.sh` should assert expected tables exist per schema. Loud failure on `planner.tour_plan` missing (rather than discovering it during a UAT).
- **P2** (~half-day) — end-to-end smoke tests for the three known journey gaps: `/v1/tour-plans` → `ready`, WS → reload → persist, `/v1/telemetry/tour` → 204. Either added to `dev-smoke.sh` or as a new CI job.
- **P1, P3, P5** — process changes that need orchestrator + human alignment before codifying in CLAUDE.md / agent playbook.

### D. Plan-002 Thrust A + B (next major phases)

- **Thrust A — Deploy to QA VPS** — long pole is VPS acquisition (Ubuntu 24, 4-8 vCPU, 16-32 GB RAM). Can stage configs (Traefik+ACME, Authentik realm import, smoke-test playbook) ahead of the box.
- **Thrust B — Real design pass** — Stitch mockups for Home/Detail/Discover/Tour/Chat, real brand mark, translation review, real photography for 28 places. Needs design/product decisions.

## Operational notes (carry-forward)

- **PR titles now land verbatim as squash commit subjects** (repo setting via #160). No more `--subject` workaround on `gh pr merge`. Test ran 4× consecutive (#161-#163, #166-#170 batch) — works.
- **planner-svc** is now a real worker. POST `/v1/tour-plans` triggers the full pipeline (~5-10s end-to-end with real Anthropic key). Failure modes are visible — check the row's `plan_payload.error` field if the status is `rejected`.
- **BFF rebuilt in this session** (twice — once for #165 chat-ws fix, once for #166 GRANT didn't actually need a rebuild). Currently running the latest fix. Restart with:
  ```bash
  set -a; . ./.env; set +a
  docker compose -f infra/compose/docker-compose.base.yml -f infra/compose/docker-compose.app.yml up -d --build --no-deps bff planner-svc
  ```
- **Lefthook can reject commits** if the subject line is too long or doesn't match conventional commits even when valid. Today's #170 first attempt failed with `docs(retro): ...` (passing CC syntax) but worked with `docs(plan-001): ...`. Worth investigating the regex on a calmer day.
- **The `mcp__tasks-prod__*` MCP** can show schemas while the SSH tunnel is down (see L021). When in doubt: `ss -tlnp \| grep 15432`.

## Riff state (daily-tour project `e98dfe58-…d3df`)

- **#143** in-progress at "B done" — slice C pending. Comment thread documents A → B → C breakdown.
- **#144** done via #166.
- **#145** done via #169.
- **#142** todo — waiting for product decisions (cap rule, scoping, reservations).
- **#135** todo — waiting for real photography.
- Phase 0 / Phase 1 / Slice 0.4 epics still showing in-progress in Riff but are effectively done per TODO.md — minor Riff housekeeping for next session.

## dt-tests state

- DT-TESTS-8 (UAT-G07) — `done + failed + blocked + blocked?` labels. Full diagnosis comment posted. Now unblocked by #167+#168. **Next session should re-fingerprint and re-run.**
- DT-TESTS-9 (UAT-G08) — `done + pass-with-issues + transport-only`. Transport works; persistence + echo gap remains (T-4.0.1).
- DT-TESTS-19 — `done + failed` (Wave-2 G05/etc UAT, separate flow).
- DT-TESTS-20 — `done + PASS` (G05 retry, separate flow).
- Review queue empty as of session end.

## Bus number

1 (you). State on origin + this doc + Riff (`daily-tour` + `dt-tests` projects) + `~/.claude/docs/agent-playbook.md` (lessons L017+L018) + `docs/ai/lessons/L019-L022` (project-local lessons).

---

**Session arc**: started 2026-05-28 morning on Plan-002 Slice 2.C close-out (squash-merge setting + lessons + doc sync + calibration), pivoted into the PWA "Plan my day" CTA on 05-29, followed by the chat-WS framing fix, then ran the UAT-G07/G08 cycle on 05-30 which surfaced four Plan-001 plan-accounting failures — all four fixed in the same session (analytics GRANT, planner consumer slice A, planner LLM pipeline slice B, dev-up migration loop) plus a retro doc + L022 capturing the pattern.

Next session: re-run UAT-G07 first to verify the planner pipeline lands a real plan in the PWA. Then pick from the outstanding list (T-4.0.1 retry is the most leveraged, P4 env-check assertion is the cheapest).
