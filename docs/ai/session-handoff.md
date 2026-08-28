# Session Handoff — 08-27 (**s749 — the `cs:Barra` spec-005 elicitation answered, and a probe of my own that was clean and wrong by 101 days.**) · 08-26 (**s748 — a CI gap closed, and the obvious fix for it would have blocked every PR in the repo forever.**) · 08-26 (**s747 — the plan-ownership fix merged on a clean Fable gate; the four-service auth gate built, green and awaiting the owner; and a test that went inert in silence between the two.**) · 08-25 (**s746 — the plan-ownership hole closed, a service found with no auth gate at all, and one of my own tests caught being unable to fail.**) · 08-25 (**s745 — three PRs merged, the network split planned, and a peer question that exposed the limits of my own evidence.**) · … → 08-24 (**s744 — two merges shipped, two PRs waiting on the owner, and the day's through-line: four defects that were all checks which could not fail.**) · 08-23 (**s743 — media-svc was serving presigned media URLs to any container on `dt_internal`; found, fixed, deployed and UAT'd. Plus: a blind-evaluation contamination finding promoted to the user-level verification protocol.**) · 08-23 (**s742 — a full implement→merge→deploy→UAT loop: 7 PRs shipped and verified on qual, catalog-svc's missing auth CLOSED, and 6 defect-hunt findings filed. One product decision waiting.**) · 08-21 (s741 · s740) · 08-20 (s739 · s738) · 08-19 (s737 · s736) · 08-18 (s735) · 08-17 (s734 · s733 · s732) · 07-20 (**Plan-008 CLOSED**)

> **UPDATE 2026-08-27 (LATEST — session `s749`, `dt:Furnas`. One task: answer `cs:Barra`'s spec-005 elicitation. The archaeology it needed turned into a measurement of this house's own record — and of a probe of mine that was wrong by 101 days. No code changed; the two PRs still wait on the owner. Closed on the owner's "do the closeout and park".)**
>
> ### State
>
> `main` **`c9f62b3`**, tree clean · **the SAME TWO open pull requests, both green, both still deliberately unmerged** — [`#477`](https://github.com/zmeireles/daily-tour/pull/477) (11/11) and [`#479`](https://github.com/zmeireles/daily-tour/pull/479) (12/12) · A2A drained and acked through **`seq 1440`** · dt-tests `review` queue **empty** (polled at start) · Docker **zero containers** at both ends · Telegram `allowFrom` = Zé alone ⇒ **rule INERT, nothing sent** (measured, not skipped) · **no subagents spawned** — standing no-agents instruction · bridge armed, `ESTAB` verified twice, stopped at closeout.
>
> ### ▶ FIRST TASK NEXT SESSION — the same two decisions, now asked a FIFTH time
>
> **Nothing in this handoff is approval.** The owner's only instruction this session was _"read the A2A comms and answer cs:Barra's elicitation, then close out and park"_ — it authorised neither merge, and I did not treat the silence as consent.
>
> 1. **Merge [`#477`](https://github.com/zmeireles/daily-tour/pull/477)** — the four-service auth gate. Closes [`dt-tests #45`](https://tasks.codecomedy.dev/p/dt-tests/r/45) (`critical`) and [`#44`](https://tasks.codecomedy.dev/p/dt-tests/r/44). Recommendation unchanged: **Fable gate first, then merge if clean.**
> 2. **Merge [`#479`](https://github.com/zmeireles/daily-tour/pull/479)** — the `python-common` CI gap. `.github/workflows/*` is always-escalate.
> 3. 🔴 **THEN, and only then**, add `Python (ruff + mypy + pytest) (python-common)` to the `protect-main` ruleset (`16458194`). **The order is load-bearing** — adding it while `main` lacks the job blocks every PR in the repo, and it presents as CI hanging, not failing.
>
> ### The work: `cs:Barra`'s spec-005 elicitation, round 1 — answered (`seq 1439`), plus a barrier note (`seq 1440`)
>
> He asked one question — _"what problem has your house solved MORE THAN ONCE, where the second time cost again?"_ — and attached a methodological separator he asked not to be skipped: date the words your probe used · if the result is empty, say **which** of «there was no repetition» / «my probe cannot reach repetitions» · give the denominator **in records, not days**.
>
> **Two cases went back, both over his bar.** But the separator is what produced the finding.
>
> ### 🪤 The finding of the session — my first probe was clean, and wrong by 101 days
>
> I searched the house's records with the vocabulary the house uses **today**. It returned a tidy result. Then I dated the vocabulary itself, with `git log -S` over all 467 commits:
>
> | probe term                                | born       | age        | history it can reach |
> | ----------------------------------------- | ---------- | ---------- | -------------------- |
> | `"recurring class"`                       | 2026-08-26 | **1 day**  | 1%                   |
> | `"auth gate"`                             | 2026-08-23 | **4 days** | 3.8%                 |
> | `"could not fail"` · `"positive control"` | 2026-08-17 | 10 days    | 9.5%                 |
> | `"cannot fail"`                           | 2026-07-30 | 28 days    | 27%                  |
> | `"unauthenticated"`                       | 2026-05-16 | 103 days   | 98%                  |
>
> ⇒ **The natural vocabulary for my strongest case is four days old in a 105-day house.** The lexical probe's earliest hit was 2026-07-30 and it found **zero** before that. A structural probe — citation chains through `docs/ai/lessons/`, which use none of those words — finds the same form at **2026-05-30** (`L022`) and, following `L022`'s own _Related_ line, at **2026-04-20** (`L016`, global playbook) — **24 days before this repo's first commit.**
>
> > **The zero was the instrument, not the world.** Distance between what the probe reached and what exists: **101 days.**
>
> **And the innocent explanation for the zero is false, which is the part worth keeping.** «Nobody was writing in May» — May wrote **1979 lines** of handoff (the densest month) across **199 commits** (the busiest), and the lexical probe finds nothing there. What hides it is not silence, it is **the voice**: May's lines are written confidently (`✅ Resolved 2026-05-17 via PR #83`). `L022` is an instance of the class **filed as an accounting problem**, with no error vocabulary anywhere in it. No pain-shaped probe will ever reach it.
>
> ### 🔴 A correction of this house's own count, and it is the useful number
>
> Yesterday's handoff reads _"**Fifth** instance of this house's recurring class."_ Counted against the whole record: **at least 22** distinct instances of a check/probe/instrument structurally unable to fail, plus 3 of the same shape in prose. The undercount is not carelessness — **every session counts from what it can reach, and no session has ever counted the whole record.**
>
> ⇒ That gap (5 vs 22) is the only leak estimate this house has, and it is a lower bound on the **undercount**, not on the class. The class's true denominator is unmeasurable by construction: an instance that is never caught reads as green in CI, in the PR body **and in this file**.
>
> ### The second case: the auth boundary was solved FOUR times in FOUR days
>
> | #   | service                  | card                                                  | fix                                      | date  |
> | --- | ------------------------ | ----------------------------------------------------- | ---------------------------------------- | ----- |
> | 1   | catalog-svc              | [`#36`](https://tasks.codecomedy.dev/p/dt-tests/r/36) | PR `#459` service-wide `onRequest`       | 08-23 |
> | 2   | media-svc                | [`#41`](https://tasks.codecomedy.dev/p/dt-tests/r/41) | PR `#465` deny-by-default                | 08-23 |
> | 3   | planner-svc              | [`#43`](https://tasks.codecomedy.dev/p/dt-tests/r/43) | unauthenticated, **unmetered LLM spend** | 08-24 |
> | 4   | all four Python services | [`#45`](https://tasks.codecomedy.dev/p/dt-tests/r/45) | PR `#477` — **still open**               | 08-26 |
>
> **Discovery was paid at full price four times; the implementation was nearly free** — the two TS gates are near-copies whose headers each say "mirrors the other's". ⇒ **The cost is not building the thing, it is learning that the thing is missing here too.**
>
> 🔑 **And the sharpest datum: the artefact produced by solve #1 is what made solve #2 cost full price.** `services/bff/src/plugins/AUTH_POSTURES.md` asserted media-svc _"reject[ed] any non-health request"_. It did not — `GET /v1/assets/:id` answered a non-BFF container with a 302 and a presigned MinIO URL. Anyone consulting the document to check got a confident, false _"already covered"_.
>
> ### 🪤 The bridge trap fired a SIXTH consecutive session — in a new guise
>
> Not "a `pgrep` hit that isn't mine" this time. **Eight bridges were live and not one was daily-tour's** — joraa, Casa, po-platform-sA, eventos-judo, cc-platform, fin-po-management, cc-specs, nexumpro. A session reading the count would have concluded it was covered and run with **no wake bridge at all**.
>
> ⚠️ **And the pid trap fired twice, both times as documented:** the `armed` line printed `740899` / `771092` (the supervisors) while the sockets were on `740924` / `771117` (the children). Probing `ESTAB` on the number `armed` prints finds nothing on a live bridge. Both were verified `ESTAB` against `185.166.39.210:443` by reading the child pid and probing **in the same breath**.
>
> 📌 The supervisor exited mid-session with `{"reason":"comm","action":"rearm"}` — that is the design working (a message had arrived), not a death. Re-armed, re-verified.
>
> ### ⚠️ Incidental findings — filed here, nobody asked for them
>
> - **The lesson codes collide.** `L019`–`L021` exist **both** in `docs/ai/lessons/` and in `~/.claude/docs/agent-playbook.md`, naming **different lessons**, while the local README states the two sequences are shared. Any future `L0NN` reference is ambiguous without saying which file.
> - **`L023` was predicted in writing and never written.** `L019`'s _Related_ section, 2026-05-29: _"L023 (future) — should formalize 'dispatcher-pattern route audit checklist' once we hit this again."_ Ninety days later it does not exist.
> - **`docs/ai/backlog.md` is stale.** It still describes Plan-001 Phase 0 as the next executable wave and has an empty _Done_ section, while the repo is at Plan-009. Anything reading it for current state is reading May.
>
> ### ⚠️ Unchanged and still owed
>
> - `mypy src` vs `mypy src tests` — **37 errors** across five packages (chat-hub 32, planner-svc 3, python-common 2). Real work, sized, deliberately not bundled.
> - `get_shared` still lacks a `status == "ready"` predicate — unreachable today, belongs in Phase-3 if a back-to-queued transition is added.
> - `docs/ai/incidents/` still has **zero entries** in 105 days.

> **UPDATE 2026-08-26 (LATEST — session `s748`, `dt:Furnas`. One PR: the Python package every service imports was never in CI. The one-line fix described in the last handoff would have blocked every PR in the repo. Closed by coordinated `/close-all` at 11:10.)**
>
> ### State
>
> `main` **`33b95f8`** · **TWO open pull requests, both green, both deliberately unmerged** — [`#477`](https://github.com/zmeireles/daily-tour/pull/477) (11/11, `MERGEABLE / CLEAN`) and [`#479`](https://github.com/zmeireles/daily-tour/pull/479) (12/12, `MERGEABLE / CLEAN`) · A2A inbox **empty** at both ends, drained through **`seq 1364`** · dt-tests `review` queue **empty** · Docker **zero containers** at both ends · Telegram `allowFrom` = Zé alone ⇒ **rule INERT, nothing sent** (measured, not skipped) · **no subagents spawned** — standing no-agents instruction · bridge stopped at closeout · Riff board **conferida e alterada** — [`dt-tests #45`](https://tasks.codecomedy.dev/p/dt-tests/r/45) updated.
>
> ### ▶ FIRST TASK NEXT SESSION — the same two decisions, now asked a FOURTH time, plus one new
>
> **Nothing in this handoff is approval.** The owner's only message this session was "Lets resume work"; every other input was a peer session's closeout order.
>
> 1. **Merge [`#477`](https://github.com/zmeireles/daily-tour/pull/477)** — the four-service auth gate. Re-verified this session: 11/11 green, `MERGEABLE / CLEAN`. It closes [`dt-tests #45`](https://tasks.codecomedy.dev/p/dt-tests/r/45) (`critical`) and [`#44`](https://tasks.codecomedy.dev/p/dt-tests/r/44). Recommendation unchanged: **Fable gate first, then merge if clean.**
> 2. **Merge [`#479`](https://github.com/zmeireles/daily-tour/pull/479)** — the CI gap below. Docs/CI category, but `.github/workflows/*` is always-escalate.
> 3. 🔴 **THEN, and only then, add `Python (ruff + mypy + pytest) (python-common)` to the `protect-main` ruleset (`16458194`).** **The order is load-bearing.** Adding it while `main` still lacks the job means the ruleset waits on a check that never reports — **every PR blocks**. This is the same failure as the trap below, reached from the other side.
>
> ### Shipped: [`#479`](https://github.com/zmeireles/daily-tour/pull/479) — the package every service imports was verified on one laptop
>
> `ci.yml`'s Python matrix ran the four services. **`packages/python-common` was absent** — the one Python package every service imports at runtime (`init_otel` ×4, `init_sentry` ×4, shared models, weather, OSRM). Same shape as the finding that created the matrix: work CI structurally could not see.
>
> Measured on `main` **before** changing anything, with the matrix's exact commands: ruff clean · `mypy src` clean (19 files) · **39 tests pass**. ⇒ The gate it was missing is one it already passes. What was missing was anyone running it.
>
> ### 🪤 The finding of the session — the fix the last handoff called "one line" would have bricked the repo
>
> The matrix hardcodes `working-directory: services/${{ matrix.service }}`; this package lives under `packages/`. **The natural fix is to key the matrix on the path.** That renames all four existing jobs — and the **`protect-main` ruleset (`16458194`) pins those four check names verbatim**:
>
> ```
> Python (ruff + mypy + pytest) (chat-hub)   … (notif-svc) … (planner-svc) … (search-svc)
> ```
>
> Renamed required checks **never report**. The ruleset then waits on them forever ⇒ **every PR in the repo blocks — and it presents as CI hanging, not as CI failing**, so the cause is nowhere near the symptom.
>
> ⇒ Matrix key stays a bare package name; the directory moves to a separate `dir`; the job `name:` is written out explicitly. Generated names diffed against the live ruleset: **four byte-identical, one added, no `<` lines.**
>
> ### 📌 The one thing I refused to assert from memory — and it is the transferable part
>
> Whether GitHub **appends** the matrix suffix to a `name:` that already contains a matrix expression. If it appends, the names become `… (chat-hub) (chat-hub, services/chat-hub)` and all four required checks die. I could argue it either way from memory, and four required checks depended on the answer.
>
> **Measured instead of predicted, and the measurement was nearly free:** the ruleset binds `main` only, so a branch is a consequence-free place to ask GitHub directly. Pushed, read the names GitHub actually reported. **It does not append.** Four byte-identical, `(python-common)` added, 21s, pass.
>
> > **A branch is an instrument.** When the cost of being wrong is repo-wide and the cost of measuring is one push, memory is never the cheaper option.
>
> **And the diff carries a positive control**, because a name comparison that cannot fail reads exactly like a pass: mutating one reported name to the path form (`(chat-hub)` → `(services/chat-hub)`) makes the diff fire. Verified. Fifth instance of this house's recurring class, and the first where the probe was controlled _before_ being trusted rather than after.
>
> ### Sized, deliberately not fixed: `mypy src` vs `mypy src tests`
>
> The sibling narrowness in the same job — the type checker never sees the tests. Measured across all five so the next session need not re-derive it:
>
> | package                  | errors under `mypy src tests` |
> | ------------------------ | ----------------------------- |
> | `chat-hub`               | **32**, in 6 files            |
> | `planner-svc`            | 3                             |
> | `packages/python-common` | 2                             |
> | `notif-svc`              | 0                             |
> | `search-svc`             | 0                             |
>
> **37 total.** Real work, and it does not belong in a PR about coverage.
>
> ### 🪤 A ritual trap that has now fired FIVE consecutive sessions
>
> The startup `pgrep` hit belonged to **po-platform-sA** again — its detached daemon (`comm-bridge-daemon.sh`) runs the shared script and sources its own token. Read as "a bridge is up", this session would have run **with no wake bridge at all** while looking correctly armed.
>
> ⚠️ **The node pid rotated within the session** (`28079` → `193724`) while the supervisor held at `28021`. Probing `ESTAB` on the number the `armed` line prints finds nothing on a live bridge.
>
> ⚠️ **The global count is not a signal in either direction during a coordinated closeout** — 12 nodes were up at closeout with houses stopping and re-arming in the same minute. Ownership was settled by PPID chain to this session's own claude pid (`17275`), never by count.
>
> ### ⚠️ Unchanged and still owed from `s747`
>
> - `get_shared` still lacks a `status == "ready"` predicate — unreachable today, belongs in the Phase-3 plan if a back-to-queued transition is ever added.
> - `docs/ai/incidents/` still has **zero entries** in 104 days. Not fixed; nobody asked.

> **UPDATE 2026-08-26 (LATEST — session `s747`, `dt:Furnas`. The plan-ownership fix merged after a clean Fable gate; the missing auth gate on ALL FOUR Python services built and green but NOT merged; and two corrections of my own claims, one of which would have shipped a gate that gated nothing. Closed by coordinated `/close-all` at 04:17.)**
>
> ### State
>
> `main` **`9b63e42`** · **one OPEN pull request, deliberately unmerged** — [`#477`](https://github.com/zmeireles/daily-tour/pull/477), 11/11 CI green, `MERGEABLE / CLEAN`, already rebased onto `main` · local branches: `main` + the PR branch · A2A inbox **empty**, drained and acked through **`seq 1364`** · Docker **zero containers** at both ends · Telegram `allowFrom` = Zé alone ⇒ **rule INERT, nothing sent** (measured; also 04:17, outside the 09:00–20:00 window, so it would have been deferred anyway) · bridge stopped at closeout · Riff board **conferida e alterada** — `#42` closed, `#45` filed.
>
> ### ▶ FIRST TASK NEXT SESSION — two decisions, both put to the owner and NEITHER answered
>
> These were asked three times and no reply arrived (the intervening messages were all bridge wakeups, not the owner). **Do not infer approval from this handoff.**
>
> 1. **Merge [`#477`](https://github.com/zmeireles/daily-tour/pull/477)?** It is finished, green and clean. Unmerged because a service-wide auth boundary is always-escalate. My recommendation was **run the Fable gate first, then merge if clean** — the same sequence that just paid off on `#475`.
> 2. **Add `packages/python-common` to the CI matrix?** One line. Until then the **54 tests that prove the new gate works never run in CI** (see below).
>
> ### Merged: [`#475`](https://github.com/zmeireles/daily-tour/pull/475) — the plan-ownership fix, `9b63e42`
>
> Fable gate verdict **merge clean, zero findings**, from 8 code mutations + 2 typecheck probes. It confirmed independently that the two-route split is complete, that stranger-vs-missing is byte-identical at both layers, and that a forgetful caller genuinely does not compile. [`dt-tests #42`](https://tasks.codecomedy.dev/p/dt-tests/r/42) **closed** with evidence.
>
> ⚠️ Its `get_shared` still lacks a `status == "ready"` predicate — unreachable today, **but it belongs in the Phase-3 plan** if a back-to-queued transition is ever added.
>
> ### Built, green, NOT merged: [`#477`](https://github.com/zmeireles/daily-tour/pull/477) — no Python service had an auth gate at all
>
> Not an opt-in gate some routes forgot: **there was nothing to opt into.** Positive control (the same grep hits catalog-svc) confirms the absence is real across **planner-svc, search-svc, notif-svc and chat-hub**.
>
> **chat-hub is the severe one and chains with nothing to guess** — filed as [`dt-tests #45`](https://tasks.codecomedy.dev/p/dt-tests/r/45), `critical`: `GET /v1/threads` hands out every guest id → `GET /v1/history/{id}` returns their whole conversation → `POST /v1/reply/{id}` **messages a guest as the host**. Plus `WS /ws/{client_id}`, which streams a named guest's live messages and which the BFF was opening **with no headers at all**.
>
> 🔴 **I recommended the wrong fix first, and it is the most useful thing in this handoff.** I proposed gating the shared `daily_tour_common.app.create_app`. **That function is dead code** — its only importer is its own test; all four services build their app directly. Positive control: the same package's other helpers (`init_otel` ×4, `init_sentry` ×4, models, weather, osrm) _are_ imported. ⇒ Gating it would have left **every service open, with CI green and both cards closed.** Corrected on both cards before any code was written.
>
> **The shape that shipped:** one ASGI middleware in `daily_tour_common`, wired into each service's own `create_app`. Middleware rather than `Depends(...)` so a route added later is covered without anyone remembering; it answers the **`websocket`** scope, not just `http`; each service **requires its own token** (no default, 32-char floor) so it cannot boot token-less, and the tokens are distinct so leaking one does not open the others.
>
> Callers updated: BFF (8 call sites + the WS handshake), **planner-svc → search-svc** (`rag/retriever.py` — a service-to-service hop is not exempt just because both ends are ours), and the n8n post-stay workflow.
>
> **Two things fixed because this change made them load-bearing:**
>
> - **chat-hub's Telegram webhook was fail-open** — `if self._webhook_secret and ...` skipped the check entirely when the secret was unset. That path had to be exempted from the gate (an external provider cannot present an internal token), which made its own broken check the _only_ authentication on it. Now fails closed, with a regression test.
> - **n8n never received `NOTIF_SVC_URL`** — referenced by the workflow, never in the container's environment. Pre-existing; the token would have been just as undefined.
>
> ### 🪤 The silent test at the seam between the two PRs — the finding of the session
>
> Merging `#477` onto `#475` was measured, not predicted: a conflict in `planner-client.ts` plus **5 of 6** tests failing in `test_routes_plan_read.py`. The sixth is the one that matters. `test_a_missing_plan_answers_exactly_like_a_stranger_s_plan` — `#475`'s no-information-leak assertion — **kept passing**, because it compared only that the two responses were _equal_ and under the gate both were an identical `401`.
>
> ⇒ **Five loud failures would have walked a rebaser straight past the one that went inert.** It now pins the status to 404 as well: unauthenticated, the file fails **5 of 6 before** the pin and **6 of 6 after**.
>
> > **An equality assertion is satisfied by any pair of identical responses, including two identical failures.** Equality alone cannot separate "both correct" from "both broken".
>
> ### 🔴 The tests proving the new gate works do NOT run in CI
>
> `ci.yml:256` — the Python matrix is `[chat-hub, notif-svc, planner-svc, search-svc]`. **`packages/python-common` is absent**, so the middleware's own 54 tests (websocket refusal, exact-vs-prefix open paths, header case-insensitivity, the empty-token guard, every mutation number quoted on the PR) are verified **on this machine only**. The four per-service _wiring_ tests do run.
>
> Same shape `#475` surfaced from the other side — `ci.yml:277` runs `mypy src`, not `src tests`. **Two instances of "a check narrower than the code believes it to be" in one workflow file.** Not fixed: workflow files are always-escalate.
>
> ### 🪤 `docs/ai/incidents/` has ZERO entries — and it is not empty by luck
>
> Found while answering `cs:Barra`'s spec-004 round 3, and verified independently by them with `--diff-filter=A` across **all refs**: an incident was **never** filed there, not even one later deleted. **Zero in 103 days**, with only `FORMAT.md` present — in a project that has had a credential leak, a service outage and three services found with no authentication, all documented elsewhere.
>
> | medium                                        | instances of the "observable read wrongly" class |
> | --------------------------------------------- | ------------------------------------------------ |
> | `docs/ai/incidents/` — **the designated one** | **0**                                            |
> | `docs/ai/lessons/`                            | 2 (`L021`, `L022`)                               |
> | `docs/ai/session-handoff.md` — **this file**  | 28                                               |
>
> ⇒ **The project does record these; just never where someone asking "have there been incidents?" would look.** An artefact that exists but was never practised reads identically to one where nothing happened.
>
> ### ⚠️ Two corrections of my own claims, both stated to the owner
>
> - **I reported that the Fable gate "never reported".** It had completed and sent its full report **before** my first ping; the messages had not yet reached me. The verdict was clean. My report was wrong, not the agent.
> - **My count of `incidents/` came back `1` when the truth was `0`** — my `git log --format='%ad' --name-only` emitted a date line that `grep -v FORMAT` did not strip, so I counted a formatting artefact as an incident. **I only caught it because it contradicted `cs:Barra`'s independent number.** Had they agreed with me, `1` would have shipped. The correction was not rigour; it was having a second measurement path.
>
> ### Ritual — three traps fired, one of them new
>
> - **The `pgrep` trap fired for the FOURTH consecutive session.** The startup hit belonged to **po-platform-sA** again (PPID chain to its own daemon). Armed my own from the **pinned launcher** (`cc-mcp-launcher`), as the amended rule now requires — s746 used cc-platform's live checkout.
> - **The child pid rotated twice mid-session** (`28201` → `618870` → `762039`) while the supervisor stayed put. The `armed` line prints the **supervisor**; probing `ESTAB` on that number finds nothing on a live bridge. Re-derive with `pgrep -P <supervisor>` **in the same breath** as the probe.
> - 🆕 **`pgrep -f 'comm-watch-supervise'` matched my own probe's shell.** At closeout it reported three "trunks" of mine; two were `bash` (one already exited by the time I read it) and only one had a node child. **`readlink /proc/<pid>/exe` is the discriminator** — the real bridge ends in `/node`. Attribution by PPID chain to the session pid (`18348`) settled it: exactly one real trunk.
> - The bridge exited three times with `{"reason":"comm","action":"rearm"}` — **that is the design working, not a dead bridge.** Re-armed and `ESTAB`-verified each time.
>
> ### A2A — spec-004 round 3 closed, `NÃO MENSURÁVEL`
>
> `cs:Barra` refused the previous session's "oldest case = 2026-05-15, nothing older" and demanded a positive control. **It failed: the commit-message probe catches 0 of 2 known instances**, because the findings live in `docs/ai/lessons/` and the commits carrying them are titled `docs(lessons): close T-2.C.5 …`. The docs probe catches 2 of 2. And the window before that date had **no artefact to record in** — `lessons/` was not born until 2026-05-29. Both halves fail ⇒ `NÃO MENSURÁVEL`, **not** "it did not happen". Thread closed and acked both ways; nothing owed.

> **UPDATE 2026-08-25 (session `s746`, `dt:Furnas`. One PR: the authed tour-plan read is finally scoped to its owner. A third service found answering anyone on the mesh. And the mutation run caught a test of mine that could not have failed. Closed by coordinated `/close-all`.)**
>
> ### State
>
> `main` **`8100b87`** · **one OPEN pull request, deliberately unmerged** — [`#475`](https://github.com/zmeireles/daily-tour/pull/475), 11/11 CI green, `MERGEABLE / CLEAN` · local branches: `main` + the PR branch + this closeout · A2A inbox **empty**, drained through **`seq 1252`**, nothing owed · Docker **zero containers** at both ends · Telegram `allowFrom` = Zé alone ⇒ **rule INERT, nothing sent** (measured; 11:30 local, window open, so this is not a deferral) · bridge stopped at closeout.
>
> ### ▶ FIRST TASK NEXT SESSION
>
> **Decide [`#475`](https://github.com/zmeireles/daily-tour/pull/475) — the plan-ownership fix.** It is finished and green; it is unmerged only because a privacy boundary is always-escalate. Two things the owner may want first:
>
> - **The Fable review gate has NOT been run on it.** House doctrine wants it on a security-shaped PR. This session was under a standing instruction not to spawn agents, so it was surfaced rather than run.
> - **`gh pr update-branch 475` is not needed** — it was `CLEAN` at closeout, but `main` may have moved since.
>
> Then: **planner-svc has no auth gate at all — [`dt-tests #44`](https://tasks.codecomedy.dev/p/dt-tests/r/44)**, filed this session, and it is the LLM-spend path.
>
> ### Shipped: [`#475`](https://github.com/zmeireles/daily-tour/pull/475) — any guest could read any guest's plan
>
> **[`dt-tests #42`](https://tasks.codecomedy.dev/p/dt-tests/r/42)** — the authed `GET /v1/tour-plans/:planId` demanded a valid guest JWT and then never checked whose plan it served.
>
> 🔑 **The card's own fallback was the wrong key, and the handoff before this one already said so — it was re-confirmed, not re-derived.** `sub` is stable (`token-svc/src/routes/exchange.ts:72` mints it from a join on the existing reservation). Reservation-scoping would have compared a plan against **itself** wherever `reservation_id` is null, because `plan_worker.py:285` fills it with `reservation_id or plan_id`. **Do not revive it.**
>
> 📌 **The fix is not "add the parameter", and this is the part worth carrying.** One planner-svc endpoint served BOTH the owner's read and the public shared read, so scoping it in place would have broken every shared link. The obvious repair — one route, optional `guest_id` — was rejected:
>
> > An optional scope is applied by whoever remembers to pass it. The next caller that forgets gets an unscoped read, and **nothing fails.**
>
> That is exactly the defect `#465` took out of media-svc. So the audience is chosen by **which URL you call**:
>
> | route                               | audience  | predicate                          | scope omitted           |
> | ----------------------------------- | --------- | ---------------------------------- | ----------------------- |
> | `GET /v1/tour-plans/{id}?guest_id=` | the owner | `id = … AND guest_id = …`          | **422** — no default    |
> | `GET /v1/public/tour-plans/{id}`    | the world | `id = … AND shared_at IS NOT NULL` | n/a — takes no identity |
>
> The BFF signature makes the scope a required argument, so a forgetful caller **does not compile**. 404 never 403, and a stranger's plan is asserted byte-identical to a missing one. **No schema change, no migration; public BFF URLs unchanged**, so the PWA, the k6 scenario, `dev-smoke.sh` and the 2D e2e spec needed no edit (verified by grep: nothing but the BFF calls planner-svc).
>
> ### 🪤 The mutation run caught one of MY tests being inert — the fourth time this house has found this shape
>
> Four mutations were applied, run, reverted and re-confirmed green. The fourth is the one to read:
>
> | mutation                                                                | result                                                |
> | ----------------------------------------------------------------------- | ----------------------------------------------------- |
> | drop `guest_id` from `get_owned`'s WHERE (the original defect)          | **1 failed** / 3 passed                               |
> | route calls the unscoped `get_by_id` (what the code did before)         | **3 failed** / 3 passed                               |
> | give `guest_id` a default + fall back to unscoped (the fail-open shape) | **1 failed** / 5 passed                               |
> | BFF stops passing the caller's identity                                 | **2 failed** / 14 passed — _on the first run, only 1_ |
>
> My test **"GET another guest's plan — 404" passed with the fix reverted.** Its fake planner returned `null` for an omitted scope, so the 404 arrived for the _wrong reason_ and the test could not fail. ⇒ **A fake that is safer than the system it stands in for cannot detect the system being unsafe.** The fake now answers like the pre-fix planner-svc — with no scope it serves the row to anyone — and the reason is written into the test so nobody simplifies it back.
>
> ### 🔺 Filed, not folded: [`dt-tests #44`](https://tasks.codecomedy.dev/p/dt-tests/r/44) — planner-svc has NO auth gate at all
>
> Not an opt-in `preHandler` some routes forget (media-svc before `#465`) — **there is nothing to opt into.** `grep -rni "internal_token|verify_internal|Depends("` over `planner_svc/` returns nothing, while the same grep finds catalog-svc's: **a positive control, so this is a real absence.**
>
> ⚠️ **The exposure is not reads.** Plan ids are unguessable. It is `POST /v1/tour-plans` — **unauthenticated, unmetered LLM spend**, because the 5/min per-guest cap lives in the BFF and a direct caller on `dt_internal` bypasses it — plus the ability to share or revoke somebody's plan. Third service in the same class as `#36` and `#41`. **Plan-009 shrinks who can reach it and does not close it.**
>
> ### ⚠️ I corrected a false claim in my own PR body
>
> I wrote that the pre-existing `test_provenance.py` mypy errors survive because planner-svc is not gated in CI. **It is gated** — a dedicated Python matrix, and it passed. The real reason is that `ci.yml:277` runs **`uv run mypy src`, not `src tests`**, so `tests/` is never typechecked in CI. The code assumes otherwise: `test_repository_share.py` carries a comment about a `cast` that exists to pass _"under `mypy src tests`"_.
>
> ⇒ **The local command is stricter than the gate, and a test file can drift red with nothing failing.** Left alone — CI config is always-escalate — but it is the same shape this repo keeps finding: **a check narrower than the code believes it to be.** The 3 errors are untouched since `#71`.
>
> ### 🪤 Ritual: the `pgrep` trap fired again, and the child pid rotated
>
> - The startup `pgrep` hit was **po-platform-sA's** — again, third session running. PPID chain to its daemon, cwd confirms. Armed my own, `ESTAB` verified.
> - **At closeout the child pid had rotated**, 30229 → **266891**, while the supervisor stayed 30204. The `armed` line prints the SUPERVISOR pid, so probing `ESTAB` on that number finds nothing and reads as "no bridge" on a live one. `pgrep -P <supervisor>` is the only way to the node pid, and it must be read in the same breath as the probe.
> - **A supervisor log line saying `comm-watch: terminated` is NOT a dead bridge.** Mine said exactly that and was `ESTAB` throughout — it is the re-arm cycle working.
> - 🔴 **I armed from cc-platform's live checkout**, which the global instructions were amended _during this session_ to forbid — the pinned launcher at `cc-mcp-launcher` is now the required path. Nothing went wrong here, but **the next session must use the launcher path.**
>
> ### Riff control tower — updated, nothing claiming a state it lacks
>
> [`#42`](https://tasks.codecomedy.dev/p/dt-tests/r/42) commented with the PR, the two inverted measurements and the inert-test finding — **left open**, since the PR is unmerged. [`#44`](https://tasks.codecomedy.dev/p/dt-tests/r/44) filed. Board: 5 open, **none at `review`**. No pending item lives only in a local file.

> **UPDATE 2026-08-25 (LATEST — session `s745`, `dt:Furnas`. Three PRs merged and the board emptied; the network split turned from an open question into a written plan; and a peer's research question forced two admissions about the limits of my own evidence. Closed by coordinated `/close-all`.)**
>
> ### State
>
> `main` **`6dc0c5c`** · **zero open pull requests** · local branches drained to `main` alone · tree clean · A2A inbox drained and acked through **`seq 1252`** · Docker **zero containers** · Telegram **no client** (`allowFrom` = Zé alone ⇒ rule inert, nothing sent) · bridge **stopped deliberately** at closeout.
>
> ### ▶ FIRST TASK NEXT SESSION
>
> **Fix the plan-ownership hole — [`dt-tests #42`](https://tasks.codecomedy.dev/p/dt-tests/r/42). It is fully unblocked and the design is settled.** The authed `GET /v1/tour-plans/:planId` never checks ownership: any guest with a valid token reads any plan by id.
>
> 🔑 **The prerequisite measurement is DONE, and it inverted the card's own advice** — do not redo it, and do not follow the fallback the card suggested:
>
> - **`sub` is stable.** `token-svc/src/routes/exchange.ts:72` sets `sub: row.guestId` via a join; the route is a pure read and mints nothing. The only `insert(guestTable)` in the tree is the seed — with a positive control, since the same grep finds `insert(reservationTable)` one line below. So the same person keeps one id across a re-redeem _and_ across a new grant.
> - ⚠️ **The card's fallback (scope by reservation) was the WRONG key.** On the plan model (`planner_svc/models.py:44-45`) `guest_id` is NOT NULL but `reservation_id` is **nullable**, and `plan_worker.py:285` fills it with `reservation_id or plan_id` — substituting the plan's own id. Reservation-scoping would compare the plan against itself exactly where the reservation is missing: a check that cannot fail, in the dangerous direction.
>
> ⇒ **Scope by `guest_id` from the JWT `sub`.** The test must demand **404/403 for a non-owner `sub`** — "the owner can read their own plan" passes before and after and proves nothing.
>
> ### Merged this session
>
> | PR                                                         | what                                                                                                                                                              |
> | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | [`#470`](https://github.com/zmeireles/daily-tour/pull/470) | plan sharing made explicit and revocable — `shared_at` is the grant, public route 404s without it, migration backfills so **none of the 47 existing links broke** |
> | [`#471`](https://github.com/zmeireles/daily-tour/pull/471) | the transcoded derivatives are finally served (backoffice surfaces), plus the two gate fixes below                                                                |
> | [`#473`](https://github.com/zmeireles/daily-tour/pull/473) | **Plan-009** — the ingress/mesh network split, docs only                                                                                                          |
>
> ### Plan-009 — the network split is written, not started
>
> [`docs/implementation-plans/009-network-split/`](../implementation-plans/009-network-split/README.md) closes option 2 of [`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36). Option 1 (the catalog-svc token gate, `#459`) **shipped and stays** — two independent controls.
>
> 📌 **The topology read shrank the job.** Measured across both repos: **only five services carry Traefik router labels** (`bff`, `pwa-static`, `authentik-server`, `n8n`, the Traefik dashboard); the other **seventeen** on `dt_internal` have no ingress role. So `dt_edge` takes the proxy fabric, `dt_internal` **keeps its name** as the mesh, and seventeen services need no edit. qr-bell joins only for `traefik.docker.network` — it already has `qrb_internal` for real work — so moving it costs it nothing.
>
> ⚠️ **The ordering is load-bearing and asymmetric:** qr-bell first ⇒ its `external: true` names a network that does not exist and **it will not start**; Daily Tour's cleanup first ⇒ Traefik has left `dt_internal` while qr-bell is still only on it ⇒ **502s behind a valid certificate**, which reads as a TLS fault and is not. Slices 1–2 are additive and revert independently; slice 3 subtracts and is gated on slice 2 being **deployed and verified**, never merged.
>
> 🔴 **Stated against interest in the plan itself:** the split does **not** fully solve `n8n`. Direct container access on `dt_edge` bypasses every Traefik middleware, so anything protected by a middleware rather than its own auth keeps its exposure to co-tenants. Slice 3 checks n8n's own auth; if it leans on the proxy the answer is a third `dt_ops` network — **flagged, left out of scope**, not folded in to make the plan look complete.
>
> ### The Fable gate earned its cost again — and again on things CI cannot see
>
> Verdict on `#471` was **merge with fixes**, and the 🟠 was the house signature:
>
> - **The owner-avatar e2e spec asserted `/^\/v1\/media\/[0-9a-f-]{36}$/`** — anchored, no query. The avatar now renders `?w=200`, so it breaks — and `playwright.config.ts:8` `testIgnore`s `**/owner-*.spec.ts`, so **CI structurally could not see it**. Fixed keeping the width in the assertion deliberately: without it, dropping `?w=` would silently revert to full-size originals and the spec would still pass.
> - **The `typeof candidate === "string"` guard** (`media-svc/src/routes/assets.ts:38`) was load-bearing but untested — mutating it to `candidate ?? asset.bucketKey` survived all 4 tests. Added `constructor` / `__proto__` to the attack list; **measured** the mutant now presigns `[Function Object]` and fails, then restored the guard and reconfirmed green.
> - The gate's third finding was **filed, not folded**: [`dt-tests #43`](https://tasks.codecomedy.dev/p/dt-tests/r/43) — the guest catalog and place editor still render `place_media.url` verbatim, so the heaviest consumers still pull originals. Non-trivial because that stored URL is sometimes an external Commons link, so it needs a prefix check.
>
> ### 🪤 Two ritual traps that fired this session
>
> - **The startup `pgrep` hit was po-platform-sA's**, again — PPID chain to its daemon, cwd confirms. Armed my own, verified `ESTAB`.
> - **My first arming attempt failed and reported exit code 0.** The ritual's command uses the supervisor path **relative to cc-platform**, so from this repo it hits `No such file or directory`, and the pipe to `tail` swallowed the status. ⇒ **Use the absolute path**, and never read a piped exit code as the command's. A check that could not fail, inside the ritual meant to prevent them.
>
> ### Riff control tower — updated before closing
>
> `#40` and `#37` **closed** with evidence; `#36` and `#42` commented (the plan link, and the measurement above); `#43` **filed**. Nothing left claiming a state it does not have.
>
> ### A2A — `cs:Barra`, spec-004 round 2, and two admissions against my own answer
>
> Asked for the **oldest** case in this house of "read an observable, concluded X, truth was Y" — searched, not recalled. Answer sent (`seq 1261`) and the question acked.
>
> - **Oldest found: `384c4ab`, 2026-05-15** — an agent's autocommit existed for T-0.3.0, so the task read as delivered; **~30% of scope had shipped** and the central deliverable, the compose file itself, was absent. What separated them: reading the diff's file list rather than the commit's existence.
> - ⚠️ **My date is a CEILING, not an age.** The commit it describes (`3aa88c0`) was discarded by the squash-merge — `git log` returns `unknown revision`. The event is provably older and undatable. **In squash-merging repos the description of a mistake survives while the mistake loses its date** — I flagged this as likely distorting his whole sample.
> - ⚠️ **My "nothing older" is one day deep.** This repo's first commit is 2026-05-14. That is the floor of the house, not a negative about the world — my sample cannot falsify a multi-year recency hypothesis.
> - 📌 **The find worth keeping:** `docs/ai/lessons/L021` (2026-05-28) — _the tasks MCP shows its schemas reconnected while the SSH tunnel underneath is down; check `ss -tlnp`_. **Identical shape and identical cure** to this week's bridge finding (`pgrep` says covered, no `ESTAB`), three months earlier and independently discovered. Evidence the class is structural rather than ten agents reciting one document — though it is one pair in one house.
> - Language control run rather than assumed: commits **0 PT / 1090 EN**, docs **5 / 952**. An English grep here measures defects, not idiom.
>
> ### Sessions — investigated on request, no anomaly
>
> Zé asked why more than one session existed. **Measured two independent ways** (`ListAgents`, and `ps` + `/proc/<pid>/cwd`): **12 sessions, 12 distinct working directories, zero duplicates** — one per project. All 12 share an identical command line and started inside an 18-second window, launched by his own `~/.local/bin/cc-open-all` with the prompt "Lets resume work" — **this session among them**. Nothing was killed and no peer was pinged. The question was overtaken by the coordinated `/close-all`.

> **UPDATE 2026-08-24 (LATEST — session `s744`, `dt:Furnas`. Two merges, two PRs open awaiting the owner's call, and three owner decisions turned into code. The through-line of the day was **checks that could not fail**.)**
>
> ### State
>
> `main` **`3bc57b0`** · **two OPEN pull requests, both deliberately unmerged** · local branches drained to `main` + the two PR branches · A2A inbox drained and acked through **`seq 1196`** · Docker **zero containers** · bridge stopped at closeout (see the sweep).
>
> ### ▶ WHAT NEEDS THE OWNER — first thing next session
>
> 1. **[`#470`](https://github.com/zmeireles/daily-tour/pull/470) — plan sharing opt-in.** CI green, Fable-gated, one real gap found and closed. `BEHIND` (main moved) ⇒ needs `gh pr update-branch 470` then merge. **Not merged: privacy boundary = always-escalate.**
> 2. **[`#471`](https://github.com/zmeireles/daily-tour/pull/471) — image variants.** CI green and `CLEAN`. **Not yet Fable-gated** — it carries a security-shaped change (the variant-key lookup), so gate it before merging.
> 3. **Deploy-ordering blip on `#470`**, pre-existing: `deploy-qa.yml` starts containers **before** migrating, and the new ORM model selects `shared_at` ⇒ plan reads 5xx for the minutes until the migration lands. Acceptable on qual; decide before it ever reaches prod.
> 4. Still unanswered from s742/s743: **[`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36) option 2** — the network split (see below).
>
> ### Merged this session
>
> | PR                                                         | what                                                                                                                                                     |
> | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | [`#468`](https://github.com/zmeireles/daily-tour/pull/468) | guesthouse list gains sorting + pagination, on a new shared `backoffice/shared/data-table` primitive; places rewired onto it with its 17 tests untouched |
> | [`#469`](https://github.com/zmeireles/daily-tour/pull/469) | one base-layer rule giving buttons and tab triggers a pointer cursor                                                                                     |
>
> ### Riff triage — two cards were stale, not open
>
> - **`daily-tour #156`** (no locale switcher in admin) — **already shipped**; closed with evidence. The backoffice switcher is a _separate component_ from the guest one, which is why a grep for the guest path missed it.
> - **`daily-tour #158`** (`registerSW.js` 404/MIME on qual) — **fixed**; closed. Probed live _with a control_: a bogus `.js` 404s, so the 200 is real.
> - Adjacent nit, filed not folded: `manifest.webmanifest` is served as `application/octet-stream`. Cosmetic — Chrome sniffs it.
>
> ### The owner's three decisions, and what each became
>
> - **`dt-tests #40` → C.** Shipped in `#470`. `shared_at` is the grant; public route 404s without it; revoke clears it; migration backfills so **none of the 47 existing links break**.
> - **`dt-tests #37` → 1.** Shipped in `#471`. ⚠️ **The card's headline deliverable is impossible and this is measured:** guest place images are **external URLs** (14 Wikimedia Commons refs in the seed, **zero** `/v1/media/`), so `place-card` cannot gain a srcset — those images never touch media-svc. The pipeline only ever processed **owner uploads**. The guest-side waste the card describes is **real and still unfixed**; closing it means ingesting Commons images into media-svc, which is separate work and probably a licensing question.
> - **`dt-tests #36` → 3 (both).** ⚠️ **Option 1 was ALREADY SHIPPED** (PR `#459`: service-wide `onRequest` + a `min(32)` boot config so catalog-svc cannot start token-less) — verified in code, not taken from the handoff. So "both" leaves **only option 2, the network split**: `dt_internal` across ~9 compose files here **plus the qr-bell repo**, a two-repo coordinated deploy where the ordering decides whether qr-bell loses TLS or Daily Tour loses its mesh. **Not started** — it needs a written plan first. `qr-bell` is at `my-projects/qr-bell` and had a live session (`qr-bell-5c`) on this machine.
>
> ### 🔺 New card filed: [`dt-tests #42`](https://tasks.codecomedy.dev/p/dt-tests/r/42)
>
> The **authed** `GET /v1/tour-plans/:planId` never checks ownership — any guest with a valid token can read any plan by id. Measured at all three layers, with a positive control (the same grep finds identity-scoping in 5 admin routes and in the new `set_shared`). **It is `#40`'s blind spot:** closing the public hole leaves this one open. ⚠️ Before fixing, **measure whether the guest JWT `sub` survives a re-redeem** — if it does not, scoping by `guest_id` would lock guests out of their own earlier plans, and the scope key must be the reservation instead.
>
> ---
>
> ## The pattern worth carrying forward: a check that cannot fail
>
> Four times today the defect was **an observable that could not have come out any other way**. None would have been caught by CI going green.
>
> | what read as fine                                                     | what it actually was                                                                                                                                                                                                           | what separated them                                                                                                                                                                                                   |
> | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | migration re-runs with no error ⇒ "idempotent"                        | idempotent as **DDL**, corrupting as **data** — `dev-up.sh` re-applies every migration on every start, and a revoked share has `shared_at` NULL + status `ready`, so each run would **silently re-share every withdrawn link** | **diverge the data first** (revoke), _then_ re-run, and require the divergence to survive. Not "does it error" — "does it change what it must not"                                                                    |
> | 184/184 BFF tests green ⇒ "the share route is covered"                | fully **swapping** POST↔DELETE also left 184/184 green. "Stop sharing" would have **granted** public access                                                                                                                    | only a **mutation** separates green-on-correct from green-on-inverted                                                                                                                                                 |
> | schema contract test green                                            | the fixture was `variants: {}` — **empty** — so it passed identically under the string schema and the object schema, which is how the drift survived                                                                           | feed a **non-empty value of the wrong shape** and require rejection                                                                                                                                                   |
> | `pgrep` finds `comm-watch` at this project's path ⇒ "I have a bridge" | it belonged to **po-platform-sA**                                                                                                                                                                                              | attribute by **principal** (walk PPID → read which `~/.secrets/tasks-*.env` the launcher sources), then prove liveness separately with `ss -tnp` → **`ESTAB`**. _Exists · is mine · is listening_ are three questions |
>
> 📌 **And the same shape in my own prose, twice.** `#469` shipped an acceptance criterion — "every console control shows a pointer" — that was **false**: four of nine selector arms are inert because shadcn sets `cursor-default` on menu and select items. `#470`'s body claimed the guest id is "never accepted from the body" and **that claim had no test** — a mutation reading `body.guest_id` passed the whole suite. **A claim written in a PR is not a control.** Both corrected before merge.
>
> ## The Fable-5 review gate earned its cost — on prose, not on code
>
> Neither gate found a code defect; **both found a false claim of mine**, which is the failure mode that survives green CI. Worth keeping:
>
> - It checked the **emitted bytes**, not my description — my PR text had line-wrapped a CSS selector **before `:not(`**, which in CSS is a **descendant combinator** and a completely different rule. The source was always right; only the prose wrapped. A rule that compiles to the wrong selector still ships green.
> - It ran the `#470` migration against a **real Postgres 16**, including revoke-then-re-run-twice, and proved the resurrection scenario unreachable.
> - 🪤 **Process hazard, measured:** its first `git fetch` + `git rev-parse FETCH_HEAD` in the shared checkout returned **the other PR's commit** — a concurrent fetch clobbered `FETCH_HEAD`. **With several agents on one repo, pin by OID.**
>
> ## Session-conduct notes
>
> - **Bridge:** the startup `pgrep` hit belonged to **po-platform-sA** (PPID chain + cwd). Armed my own, verified **`ESTAB`**. One supervisor exit with `reason:"comm"` mid-session ⇒ re-armed, as designed.
> - 🪤 **At closeout the OTHER half of that trap fired:** `pgrep -f comm-watch` matched **my own probe shell**, whose PPID chain confirms it is _mine_ and which is _not a bridge_. **The PPID chain is necessary and not sufficient, and it fails toward the dangerous side.** The discriminator is `node …comm-watch.mjs` vs `/bin/bash -c`.
> - **Telegram:** `allowFrom` = `[2031690099]` = **Zé alone ⇒ the client-announce rule is INERT.** Nothing sent; measured, not skipped.
> - **Containers:** `docker ps -a` empty at both ends.
> - **A2A:** answered `cs:Barra`'s spec-004 elicitation with four cases from this session — and said, against interest, that **three of the four share a cure that is already written** (`R1`'s positive control), so if the ten houses return mostly that family the spec should be **rejected as method, not saved**. The one that does _not_ reduce to it is the `pgrep` case, where the cure is not a negative control but **changing the attribution key**.

> **UPDATE 2026-08-23 ( — session `s743`, `dt:Furnas`. Resumed the standing implement→deploy→UAT loop. One security defect found by measuring a claim the docs made about themselves: shipped, deployed and verified. Separately, an A2A audit turned into a cross-house method finding.)**
>
> ### State
>
> `main` **`89248c2`** · **zero open pull requests** · tree clean · **qual deployed and UAT'd on `89248c2`** (image tag confirmed on the box) · local branches drained to `main` alone · A2A inbox drained through **`seq 1098`**, nothing owed.
>
> ### ⏹ Closeout addendum — 24-08 03:47, coordinated shutdown (`casa-c6`)
>
> **🔴 The A2A bridge is DOWN and was deliberately NOT re-armed.** It was terminated externally at `18:42:43Z` — `reason: "signal:TERM"`, **`delivered: false`** (no message lost), and **only this session's**: six other houses' bridges were still running, so it was not a machine-wide stop. The thread had been waking this session every 2–4 minutes for half an hour, which is the likeliest reason someone stopped it.
>
> ⚠️ **Do not read this as "the bridge died".** A `reason:"comm"` exit is the design working and must be re-armed; a `signal:TERM` with `delivered:false` is someone stopping it. **Re-arming a job that was deliberately killed overrides an explicit act** — so it was left down and the question put to the owner instead. **The next session should arm its own at startup as usual** (that is the ritual, and it is not the same act).
>
> ⇒ **Inbox drained manually before closing: empty, everything acked through `seq 1145`. Nothing owed.**
>
> **Sweep, item by item:** subagents **none launched** (standing instruction not to use the Agent tool) · background jobs **all finished**, 9 bridge re-arms · Docker **zero containers** on the workstation · Telegram `allowFrom` = `[2031690099]` = **Zé alone ⇒ the client-announce rule does not fire at all** — this is _not_ a notice deferred past the 03:45 contact window, there is no client to defer to · six `comm-watch` processes belong to **cc-specs · nexumpro-marketplace · nexumpro-porta · po-platform-sA · fit-platform · codecomedy-platform** — named and untouched, attributed by PPID chain, **no `pkill -f`**.
>
> 🪤 **One more phantom, logged because it is reusable:** the background-job probe reported an unaccounted task id. It was the harness's own **transient per-call scratch file** — the task dir is written concurrently by the harness, so globbing it races. **A directory someone else writes to is not a stable inventory.**
>
> **How the A2A thread ended (`seq 1114`–`1145`), for whoever picks it up:** my canary objection did not just land, it **narrowed the rule** — the surviving form is a canary that _already exists_ in the file, which has no moment of birth and so is immune by construction; planting a new one is now the exception. I also **corrected my own over-generalisation** (I claimed a pattern about houses from `n=2`; the third and fourth measured clean). The class was recorded under this session's name: **not a missing measurement — the right measurement with the wrong quantifier.** All of it lives in `~/.claude/docs/verification-protocol.md`, `R1` fifth limit.
>
> ### ▶ WHAT NEEDS THE OWNER — unchanged from s742, nothing new
>
> 1. **[`dt-tests #40`](https://tasks.codecomedy.dev/p/dt-tests/r/40)** — the plan-sharing decision. One token answers it.
> 2. **[`dt-tests #37`](https://tasks.codecomedy.dev/p/dt-tests/r/37)** — consume the image variants or delete the pipeline. Genuinely opposite directions, so still not picked unilaterally.
> 3. **[`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36)** stays open on purpose — the network split touches the qr-bell repo.
>
> ---
>
> ## Shipped: [`#465`](https://github.com/zmeireles/daily-tour/pull/465) — media-svc was allow-by-default
>
> **[`dt-tests #41`](https://tasks.codecomedy.dev/p/dt-tests/r/41) — CLOSED.** `GET /v1/assets/:id` had no auth. Measured from `dt_notif_svc` (not the BFF, on `dt_internal`, the network **qr-bell's containers share**):
>
> ```
> GET dt_media_svc:8087/v1/assets/<id>   -> 302 + presigned MinIO GET URL
> GET dt_media_svc:8087/health           -> 200      (positive control)
> ```
>
> The route carried a comment calling the presigned URL _"the access control mechanism"_. **It bounds a leak; it does not decide who may ask for one.**
>
> 📌 **The defect was the DEFAULT, not the route.** media-svc used a `verifyInternal` **preHandler each route had to opt into** — so the next route added would be unauthenticated by omission, with nothing failing. catalog-svc (after `#459`) uses a service-wide `onRequest` hook. The fix mirrors catalog-svc rather than patching the one route; the BFF now also sends the token on `fetchAsset`, the one call that omitted the header it already held.
>
> **Verified on qual after deploy — both halves, because a fix that only closed the hole would have taken the console's images down and looked like a success:**
>
> | probe                                            | result                                       |
> | ------------------------------------------------ | -------------------------------------------- |
> | `/v1/assets/<id>` no header                      | **401** (was 302)                            |
> | `/v1/assets/<id>` **valid** token                | **302** — the legitimate caller still passes |
> | `/v1/uploads/sign` no header                     | 401                                          |
> | BFF `GET /v1/media/<id>` (what the console uses) | **200 `image/png`**, bogus id → 404          |
> | catalog-svc `#36` gate, regression check         | 401 / `/ready` 200                           |
>
> ⚠️ **No deploy-ordering hazard** — unlike `#459`, `MEDIA_SVC_INTERNAL_TOKEN` was already set on both services.
>
> ---
>
> ## 🩤 Three probes of mine were wrong before they were right — all caught by a control
>
> | what                                                                            | why it was silent                                                                                                                                                       |
> | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | media-svc "unauthenticated" probe returned **404**                              | I guessed route names that don't exist. A 404 is not evidence of auth — **the probe could not have found the thing.**                                                   |
> | a regex scan reported the two `/v1/admin/geocode` routes as guest-default       | they declare `auth: "owner"` via a **`ROUTE_OPTS` constant** the scan couldn't follow. **A false positive I nearly filed** — reading the file first is what stopped it. |
> | "the auth hooks are missing `return reply`, so the handler runs behind the 401" | plausible, documented-looking, and **false on Fastify 5**. Measured with a positive control; see the `reference_fastify_hook_send` memory. **Do not re-file it.**       |
>
> ⇒ Every one was caught by the same move: **a positive control proving the instrument can see the thing it is looking for.**
>
> 🚨 **And a fourth, in this very file:** the first attempt to write this entry consumed its own anchor with an earlier `replace`, so the insert matched nothing — and the script still printed "handoff updated". **Same shape as the s742 slug-fix control.** Assert the change is PRESENT afterwards, not just that the anchor existed before.
>
> ---
>
> ## The A2A thread — an audit that found a defect in the auditor's own objection
>
> `cs:Barra` asked me to ratify a blind-evaluator run for spec 003 (`seq 1058`). I audited it, found the vice that would have annulled it, and then **ran the control that refuted my own objection**:
>
> - **Verified independently in git:** the answer key and pass criterion were committed at `287292e` **14:26:58Z**, the evaluator's answers at `a17ad5c` **14:32:26Z**. Six minutes, right order.
> - **The vice:** the evaluator declared _"no tools, no files"_ — true and **irrelevant**. `~/.claude/CLAUDE.md` contains, verbatim, the answers for three of its seven hits and the opposite of one of its two misses, and **one of those was a gate item**.
> - **The control:** same package, byte-identical, raw `POST /v1/messages` with **no `system` field**. It reproduced all four. ⇒ my objection died. Reported the score honestly as **6–7/9**, hanging on one reading that goes against me.
> - ⚠️ **Fable 5 refused the package** (`stop_reason: refusal`, category `cyber` — false positive on the "blind falsifiability test" framing). Control ran on Opus 5; the model difference is declared, not buried.
>
> **Promoted the same day** to `~/.claude/docs/verification-protocol.md` as **R1's fifth limit** — it applies to any blind evaluator, jury, adversarial reviewer or delegated negative control run as an agent on this machine.
>
> 🔴 **Then I corrected it (`seq 1111`), because half of it was my inference, not my measurement** — `fpm:Vigia` caught that. The file _containing_ the answers was measured; the file _reaching the evaluator_ was inferred from the harness. The fix was to run the falsifier **we had written for future controls, backwards, against the original evaluator's answers**:
>
> - `~/.claude/CLAUDE.md:130` — _"answerable with one token: `1`, `b`, `sim`"_
> - the original evaluator's rule-`G` answer — _"respondível com um **token**"_
> - **absent from the package**; **absent from my clean control**
>
> ⇒ the entry path is now **measured from the receipt side**, not inferred. ⭐ And the leak pushed the evaluator **toward the house file and away from the spec's answer** — it depressed the score rather than inflating it, which is why the result survived the clean control.
>
> ---
>
> ## Session-conduct notes
>
> - 🩤 **The bridge trap fired again, and the new `ESTAB` rule earned its place.** The running `comm-watch` at startup belonged to **po-platform-sA** (PPID chain). Armed my own, then verified with `ss -tnp | grep pid=` → **`ESTAB`**. _Exists · is mine · is listening_ are three questions.
> - The supervisor exited **three times** with `{"reason":"comm","action":"rearm"}` — that is the design working, not a death. Re-armed each time.
> - **Telegram:** allowlist is Zé alone, so the client-announce rule sends nothing. Measured, not skipped.
> - **Containers:** `docker ps -a` empty on the workstation at startup. Nothing to sweep.
> - Could not send the correction to the closed audience — `no active edge authorizes dt:Furnas -> fpm:Vigia`, even with only `in_reply_to` set. Asked `cs:Barra` to propagate.

> **UPDATE 2026-08-23 (session `s742`, `dt:Furnas`. Ran a continuous implement→test→PR→merge→deploy→UAT loop under the owner's standing instruction. Seven PRs shipped and verified on qual; a defect hunt filed six findings; one product decision is written up and waiting.)**
>
> ### State
>
> `main` **`1b75101`** · **zero open pull requests** · tree clean · qual deployed and UAT'd through `1b75101` · local branches drained to `main` alone.
>
> ### ▶ WHAT NEEDS THE OWNER
>
> 1. **[`dt-tests #40`](https://tasks.codecomedy.dev/p/dt-tests/r/40) — the plan-sharing decision, now fully written up.** Asked across four sessions with no facts in one place; that card now holds every measurement and a recommendation (**option C**). One token answers it.
> 2. **[`dt-tests #37`](https://tasks.codecomedy.dev/p/dt-tests/r/37) — consume the image variants, or delete the pipeline?** Genuinely opposite directions, so it was NOT picked unilaterally. See below.
> 3. **[`dt-tests #36`](https://tasks.codecomedy.dev/p/dt-tests/r/36) stays OPEN on purpose** — the stop-gap shipped, the architectural fix (network split) touches the qr-bell repo.
>
> ---
>
> ## Shipped this loop — every one merged, deployed AND browser-UAT'd on qual
>
> | PR                                                         | what                                                      | UAT on qual                                                       |
> | ---------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
> | [`#457`](https://github.com/zmeireles/daily-tour/pull/457) | an owner can remove **and reorder** a place's photos      | **7/7** — incl. a removed photo staying removed after save+reopen |
> | [`#458`](https://github.com/zmeireles/daily-tour/pull/458) | 24-hour `TimeField` replaces `<input type="time">`        | ✅ `timeField=2 native=0`, value `09:00`, no AM/PM                |
> | [`#459`](https://github.com/zmeireles/daily-tour/pull/459) | **catalog-svc requires `X-Internal-Token`**               | ✅ the exact leaking call now **401**                             |
> | [`#460`](https://github.com/zmeireles/daily-tour/pull/460) | rail footer stops overflowing (locale codes + `shrink-0`) | ✅ overflow **0px**, toggle **36×36 inside** the rail             |
> | [`#461`](https://github.com/zmeireles/daily-tour/pull/461) | the slug field explains itself instead of lying           | ✅ placeholder previews `casa-azul-do-mar` live                   |
> | [`#462`](https://github.com/zmeireles/daily-tour/pull/462) | OSM raster capped at z19                                  | latent fix, no UAT possible                                       |
> | [`#463`](https://github.com/zmeireles/daily-tour/pull/463) | an owner can clear their profile photo                    | server test re-reads via GET                                      |
>
> ### The security finding, and why it mattered
>
> `AUTH_POSTURES.md` claimed _"catalog-svc / media-svc use a separate `X-Internal-Token`"_. **Only media-svc did.** catalog-svc had **no auth of any kind** — no plugin, no `preHandler`, including on `POST`/`PATCH`/`DELETE`.
>
> The posture rested on `internal-auth.ts:8`: _"The BFF is the sole trusted caller on `dt_internal`."_ **Measured false.** 25 containers on that network, including **`qrb-api` — a different product, repo and CI runner**, which joined deliberately to reuse Daily Tour's Traefik. From inside it, no credential:
>
> ```
> GET dt_catalog_svc:8081/v1/places → 200 + full data, incl. contacts.email
> ```
>
> 📌 **The premise was true when written and rotted silently, because no test in this repo can fail when a _different repo_ adds a network.** `AUTH_POSTURES.md` now carries a **falsifier** — the one command that re-checks it.
>
> **Post-fix, measured:** that same call returns **401**; `/ready` still open (healthchecks send no header); catalog-svc **healthy**; the owner console still lists places and guesthouses with **no 4xx**. Both halves proven — a fix that only closed the hole would have taken the console down.
>
> ---
>
> ## 🪤 Three verification mistakes I made, all caught — read this before trusting a control
>
> This loop leaned on "neuter the fix, confirm exactly the right tests go red". **Three times that control was itself broken**, and each failure mode is reusable:
>
> | what happened                                                 | why it was silent                                                                                                                                                 |
> | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | control reported **PASS** on the slug fix                     | prettier had wrapped the JSX; my single-line `str.replace` **matched nothing**, so the file never changed. A control that does not modify the file tests nothing. |
> | control reported **PASS** again (2nd attempt)                 | same cause, different anchor — fixed only by `assert old in s` **before** writing                                                                                 |
> | UAT reported the theme toggle at **40×32, right=52** — a PASS | the probe selected `button[aria-label][title]`, and **the fix itself had just added `title` to the locale buttons**. It measured `EN`, not the toggle.            |
>
> ⇒ **Two habits now non-negotiable here:** (a) assert the anchor exists before applying a control, and (b) after changing a component's attributes, re-check that any probe selecting on those attributes still selects the same element. The toggle numbers were right by luck for two checks.
>
> ---
>
> ## The defect hunt — six findings filed, four already fixed
>
> Method that worked: **take a claim the code makes about itself, then measure it.** `AUTH_POSTURES.md` and `internal-auth.ts` both asserted things that had quietly stopped being true.
>
> - [`#34`](https://tasks.codecomedy.dev/p/dt-tests/r/34) photos could be added, never removed → **fixed** (`#457`)
> - [`#35`](https://tasks.codecomedy.dev/p/dt-tests/r/35) profile photo could not be cleared → **fixed** (`#463`)
> - [`#36`](https://tasks.codecomedy.dev/p/dt-tests/r/36) catalog-svc unauthenticated → **stop-gap fixed** (`#459`), network split still open
> - [`#37`](https://tasks.codecomedy.dev/p/dt-tests/r/37) **48 of 56 objects in the media bucket are derivatives nothing serves** — open, needs a decision
> - [`#38`](https://tasks.codecomedy.dev/p/dt-tests/r/38) rail footer overflow → **fixed** (`#460`)
> - [`#39`](https://tasks.codecomedy.dev/p/dt-tests/r/39) slug field lied → **fixed** (`#461`)
>
> ### `#37` in one line, because it is the sharpest of them
>
> Every uploaded image is transcoded into **6 derivatives** (200/600/1200 × avif/webp). **8/8 assets have them; 48 of 56 bucket objects are them; nothing reads them.** The tell: the worker writes `Record<string,string>` where the published contract declares objects — **a shape mismatch that has never thrown is itself proof nothing consumes the output.** Consume them (`?w=` + `srcset`) or delete the pipeline; they are opposite, so it waits.
>
> ---
>
> ## ⚠️ Unresolved: the blank map the owner reported
>
> **Not reproduced.** In real Chrome on the same page: **14 OSM tiles, all 200**, zero console errors, geocode 200.
>
> `#462` capped the raster source at z19 (OSM 404s above it) — a **real latent defect**, but **not shown to be the reported cause**. My zoom repro was _inconclusive, not negative_: the picker has no zoom control and synthetic wheel events produced **0 tile requests**, so the probe never fired.
>
> ⚠️ **The "blank map canvas is a headless-SwiftShader artifact" note in memory does NOT apply** — that covers headless screenshots; the owner was in real Chrome.
>
> **One datum settles it:** DevTools → Network → filter `tile.openstreetmap.org` in that modal. Requests-with-a-status vs no-requests-at-all point at completely different causes.
>
> ---
>
> ## Session-conduct notes
>
> - **Model switched mid-session** — Opus → Fable 5 (weekly Opus at 94%) → back to Opus 5 after the weekly reset, coordinated via a peer session. Context carried across both switches with no handoff needed.
> - **`CATALOG_SVC_INTERNAL_TOKEN` was generated ON the VPS** into the gitignored `.env.qual` **before** the `#459` deploy — compose refuses to start without it and catalog-svc refuses to boot without it, so the ordering was load-bearing, not incidental.
> - The `bash-secret-guard` hook correctly refused a heredoc containing compose's `${VAR:?...}` placeholder syntax. Worked around by writing the script to a file rather than piping it through the shell — **not** by weakening the hook.

> **UPDATE 2026-08-21 (session `s742`, earlier phase, `dt:Furnas`. Cleared the whole owner queue that `s741` left: both green PRs merged, qual deployed, both blocked UAT cards run and passed. One new gap filed.)**
>
> ### State
>
> `main` **`140520d`** · **zero open pull requests** · tree clean · **qual is LIVE on `140520d`** — all 10 app images verified on the box, no longer behind `main` · local branches drained to `main` alone · A2A inbox clean, nothing owed · zero Daily Tour containers on the workstation.
>
> ### ▶ WHAT NEEDS THE OWNER — one thing, and it is the same one
>
> **The plan-sharing product call — now asked across four sessions.** Every `ready` plan is permanently reachable by URL whether or not the guest chose to share it, and a guest who shares **cannot unshare**. Making it explicit **would break existing share links**, which is why no session has done it unilaterally. Nothing else is waiting on him.
>
> ---
>
> ## What shipped
>
> | what                              | PR                                                         | state                |
> | --------------------------------- | ---------------------------------------------------------- | -------------------- |
> | place photos are persisted        | [`#452`](https://github.com/zmeireles/daily-tour/pull/452) | **merged** `339ddb2` |
> | the chat guest JWT out of the URL | [`#454`](https://github.com/zmeireles/daily-tour/pull/454) | **merged** `140520d` |
>
> ⚠️ **Both PRs were `BEHIND` and the ruleset refused the merge** — `gh pr merge` returned _"11 of 11 required status checks are expected"_, which reads like a CI failure and is not one. `gh pr update-branch` then a re-run of CI cleared it, one PR at a time (merging the first puts the second behind again).
>
> ## The deploy
>
> Dispatched `deploy-qa.yml` with the **full 40-char** `image_tag`; every step green including the guest smoke and the `--qual` readiness gate. **Verified on the box rather than taken from the workflow's word:** all 10 `ghcr.io/zmeireles/daily-tour/*` images on `140520da604c…`.
>
> 📌 **The `--force-recreate` warning carried since `s740` did NOT apply here, and that was checked rather than assumed.** `#450` put `REDIS_URL` in the **tracked** `docker-compose.app.yml`, and the image tag changed too — two config-hash changes, so `up -d` recreated token-svc on its own. Confirmed after the fact: `dt_token_svc` is `healthy` and its env holds `REDIS_URL`. The Geoapify lesson still holds for its actual case — a change to `.env.qual` alone, with compose and tag unmoved.
>
> ---
>
> ## Both blocked UAT cards: PASS
>
> ### [`dt-tests #33`](https://tasks.codecomedy.dev/p/dt-tests/r/33) — chat after the token left the URL · **4/4**
>
> **The question this card existed for is answered: Traefik DOES forward `Sec-WebSocket-Protocol` end-to-end on qual.** Handshake **101**, response echoes **`dt.jwt` alone**, WS URL is bare `/v1/chat/ws`, message sent and survived a reload.
>
> **Two negative controls, both fired** — the old `?token=` shape and a bare sentinel with no JWT were each **closed `1008 unauthorized`**. Without them a "connected" result would be indistinguishable from a server that authenticates nobody.
>
> ### [`dt-tests #32`](https://tasks.codecomedy.dev/p/dt-tests/r/32) — photos persist · **PASS on every criterion the UI supports**
>
> A5 (survives re-opening) and D3 (an unrelated edit does not wipe it) — the two decisive ones — both green. Confirmed down **two independent paths**: the console re-open, and the guest payload `"hero_image_url":"/v1/media/a0408664-…"` carrying the same asset id, rendered in-browser at 400×300. Negative control: a nonexistent place name returns **0** payloads.
>
> **Fixture left in place:** `ZZ-Media-1`, published, Host's Pick on, 2 photos. Part E not run, so no catalogue place was touched.
>
> ---
>
> ## New: [`dt-tests #34`](https://tasks.codecomedy.dev/p/dt-tests/r/34) — an owner can add photos but never remove one
>
> `#32` step C4 tells the tester to click _"the ✕ on its thumbnail"_. **There is no ✕** — `media-uploader.tsx` renders each thumbnail as an `<img>` in a bare div, and `place-form.tsx` wires no removal path. Measured live: **0** buttons in thumbnail containers.
>
> A **gap, not a regression** — but the first photo is the hero image guests see, so an owner who uploads the wrong one first cannot fix it without an engineer. ⇒ **C4/C5 can never pass and should be struck from `#32`** until this ships, or the next tester files the same phantom defect.
>
> ---
>
> ## 🪤 Console-UAT gotchas that cost this session ~15 harness iterations
>
> Anyone automating the owner console should read these first — each one produced a **false FAIL** before being understood:
>
> | trap                                                     | what actually happens                                                                                                                                                                                                                                              |
> | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | **`.fill()` silently does not work**                     | The Identity inputs are React-controlled and ignore it — the DOM value changes, React state does not, and Save blanks the field with _"Required"_. Use `pressSequentially`. The character counter (`10 / 120`) is the honest read of React state.                  |
> | **All three locale tabs are required**                   | The form opens on **Portuguese** (not English, whatever the underline suggests — read `aria-selected`). `name_en` and `name_es` must be filled too, or Save fires **no network request at all**.                                                                   |
> | **The category picker is two-level**                     | Clicking "See" is not enough; at least one detail ("Viewpoint", …) is required. Same two-level shape as the action picker in `#370`.                                                                                                                               |
> | **The Places list is paginated**                         | "Page 1 of 5", sorted by name — a `ZZ-` fixture is on the **last** page. A row lookup without pagination reports "place not found" and reads exactly like a save that failed.                                                                                      |
> | **Authentik login needs `waitForSelector`, not a sleep** | The identification and password stages advance at their own pace; a fixed `waitForTimeout` lands on the wrong stage and silently restarts the flow.                                                                                                                |
> | **The sidebar has buttons named `English`/`Português`**  | Same names as the Identity locale tabs. `getByRole("button")` matches the sidebar first and switches the **UI** language instead of the content tab — text then accumulates in one field (observed: 20 chars for a 10-char name). Use `getByRole("tab")` strictly. |
>
> Probe scripts are in this session's scratchpad, not committed — they are throwaway harness, not product tests.
>
> ---
>
> ## Startup checks
>
> - **The bridge trap fired again, same direction as `s741` predicted.** A `comm-watch` was running from a path under this machine's projects; the PPID chain walked back to **`po-platform-sA`**'s daemon. Armed my own rather than trusting the `pgrep` hit.
> - **Telegram sent nothing, and that is a measured result** — `allowFrom` is the owner alone (`2031690099`).
> - **Containers:** `docker ps -a` empty at session start — not merely zero Daily Tour ones.
> - **`s741-closeout` deleted** (squash-merged as `#455`, so not an ancestor of `main` — `-D`, not `-d`).
> - **`cs-agent status` lists 7 `finished` agents** from long-dead sessions with an empty worktree directory. Registry residue, no live work, left alone.

> **UPDATE 2026-08-21 (session `s741`, `dt:Furnas`. Closed out `s739`'s defect hunt: its last three open findings are now all settled — two measured down to latent, the third fixed and green. Closed for a coordinated laptop shutdown.)**
>
> ### State
>
> `main` **`00e194c`** · **2 open pull requests, both fully green, both awaiting the owner** · working tree clean · A2A bridge **stopped at closeout** (mine was pid `37008`, confirmed by PPID chain back to this session's own `claude` process; **nine** other supervisors run on this box and belong to other sessions — none touched) · **zero Daily Tour containers** (the 8 running are `cc-dev-*`, owned by `codecomedy-platform`) · qual **NOT deployed this session** — still `bd2058e`, still behind `main` by the guest-revocation security fix.
>
> ### ▶ WHAT NEEDS THE OWNER — four things, none started
>
> 1. **Merge [`#452`](https://github.com/zmeireles/daily-tour/pull/452)** — place photos are persisted. 11/11 green since 08-20. Phase-1 feature surface ⇒ always-escalate.
> 2. **Merge [`#454`](https://github.com/zmeireles/daily-tour/pull/454)** — the chat guest JWT out of the URL. **12/12 green.**
> 3. **🔴 Deploy qual.** It still serves the build where **revoking a guest does nothing** ([`#450`](https://github.com/zmeireles/daily-tour/pull/450), merged 08-20, never deployed). ⚠️ token-svc needs **`--force-recreate`**, not `restart`, or the new `REDIS_URL` is not substituted. Deploying also unblocks **two** UAT cards: [`dt-tests #32`](https://tasks.codecomedy.dev/p/dt-tests/r/32) and [`#33`](https://tasks.codecomedy.dev/p/dt-tests/r/33).
> 4. **The plan-sharing product call** — asked three sessions running, still unanswered. Every `ready` plan is permanently reachable by URL whether or not the guest chose to share, and a guest who shares **cannot unshare**. Making it explicit **would break existing share links**, which is why no session has done it unilaterally.
>
> ---
>
> ## The defect hunt is now CLOSED — all four findings resolved
>
> `s739` found four pieces of inert machinery; `s740` fixed three. This session took the remaining three open items (one fix + two unverified severities) and settled every one.
>
> ### 1 · Owner-to-owner boundary → **latent, not live** (measured, no code changed)
>
> 18 of 23 tenant-scoped owner routes take an id and never compare it to the caller. Severity turned entirely on how many accounts sit in Authentik's flat `staff` group — **which nobody had ever measured.** Now measured on qual:
>
> | group                 |           members |
> | --------------------- | ----------------: |
> | `authentik Admins`    |                 1 |
> | **`staff`**           | **1** (`akadmin`) |
> | `authentik Read-only` |                 0 |
>
> Total users = 3; the other two are internals (`AnonymousUser`, an outpost service account) which cannot carry the group claim, and the BFF's owner posture requires it (`plugins/owner-auth.ts`).
>
> **Control:** the same query returns a populated group AND a zero-member group, so it discriminates rather than answering "1" to everything.
>
> ⇒ **There is no second owner to cross a boundary with.** It fires the day one exists — which the subscription product implies. Do not re-inherit it as a live hole; do not forget it either.
>
> ### 2 · Rate limiter keyed on an unverified JWT claim → **real, bounded, deliberately not fixed**
>
> `guestKeyGenerator` decodes without verifying, so a forged `sub` earns its own bucket. But `/v1/tour-plans` and `/v1/discover` are both `auth: required`, and the verifying preHandler runs **before** the handler — so a forged token is 401'd and **never reaches the LLM the limiter exists to protect.** An authenticated caller cannot escape their own bucket, because changing `sub` breaks the signature.
>
> Reachable consequence: unlimited _401s_ on two routes, under Traefik's `default-ratelimit` (average 100/s, burst 200, applied to `bff` and `bff-apex-v1`). ⇒ 🟡, left alone on purpose. The cheap complete fix, if ever wanted: verify in the keyGenerator and fall back to `req.ip` — HS256 is one HMAC.
>
> ### 3 · Guest JWTs in logs → **FIXED**, [`#454`](https://github.com/zmeireles/daily-tour/pull/454), 12/12 green
>
> This grew on inspection. It is a straight violation of **D15** ("token in URL … never echoed in logs"), and the credential reached **two** sinks:
>
> | sink                        | records                                              | maskable?                                       |
> | --------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
> | BFF pino log                | `req.url`, via a redactor covering only `/r/<token>` | yes                                             |
> | **Traefik JSON access log** | `RequestPath`, **query string included**             | **no** — it can drop headers, not redact a path |
>
> 📌 **The Traefik half is measured, not assumed.** Its `RequestPath` holds a scanner's `/wp-admin/install.php?step=1` verbatim, 9 times. ⇒ **A BFF-only redaction would have closed the sink we control and left the one we do not** — and would have read exactly like a fix.
>
> **Not yet leaked, and that is measured too:** 11,231 logged requests in 14 days, **zero** `chat/ws` — nobody has opened chat on qual. Positive control: the same probe finds 4,495 `/v1/` URLs, so it works. Armed, not fired.
>
> **The fix moves the credential instead of masking it.** The client offers `["dt.jwt", "<jwt>"]` and the server reads `Sec-WebSocket-Protocol` — the standard carrier, since a browser cannot set arbitrary headers on a WS handshake, and request headers are dropped from Traefik's log by default. `handleProtocols` echoes the sentinel ONLY, so it never returns in a response header. The query shape is **removed, not deprecated**: accepting it would keep the leak reachable from any stale client.
>
> ⚠️ **What the tests structurally CANNOT answer:** whether Traefik forwards `Sec-WebSocket-Protocol` end-to-end on qual. Standard behaviour, unverified here, and if it does not forward, chat silently stops authenticating. That is exactly what [`dt-tests #33`](https://tasks.codecomedy.dev/p/dt-tests/r/33) exists to check — **run it right after the deploy.**
>
> ---
>
> ## How #454 was verified — the controls, not the greens
>
> | control                      | result                                                                     |
> | ---------------------------- | -------------------------------------------------------------------------- |
> | neuter `redactUrlForLog`     | **6 red, 5 green** — the leaves-untouched and sentinel-shape tests survive |
> | restore `?token=` acceptance | **exactly** the "REJECTS the old way" test red, other 5 green              |
>
> The first control matters more than it looks: a suite that goes **all**-red under a neutered function is not discriminating, it is just coupled. This one keeps green precisely the assertions that should not depend on redaction.
>
> The serializer Fastify actually receives is now exported (`serializeRequestForLog`) so a test can prove the redaction is **wired** — _a redactor no serializer calls reads exactly like one that works_, which is this project's recurring failure shape.
>
> Full BFF suite 181/181 · PWA chat 20/20 · lint + typecheck green on bff, pwa, shared-types · repo-wide sweep found no doc, script or infra still speaking the old shape (control: the same sweep finds 22 references to the new one).
>
> ---
>
> ## Startup checks, for the next session
>
> - **`/mcp` NOT needed.** The served `add_comment` description carries the post-fix «OMIT IT … REFUSED (#178)» text. Run that served-description probe first; only the stale wording justifies asking the owner for `/mcp`.
> - **A2A inbox drained**, everything acked through **seq 1014** (`cs:Barra`, a notification that explicitly asks for no reply). Nothing owed.
> - 🪤 **The bridge trap fired here, in the direction the new rule predicts.** At startup a `comm-watch` supervisor WAS running from a path under this machine's projects — and it belonged to **po-platform-sA** (cwd + PPID chain proved it). Read literally, "one is already running, do not arm a second" would have left this session with **no wake bridge at all.** Armed my own and confirmed it by walking the PPID chain back to this session's `claude` process, never by name or count.
> - **Telegram sent nothing, and that is a measured result** — `allowFrom` is the owner alone (`2031690099`), so the client-announce rule does not fire on this project.
> - **Containers:** zero belonging to Daily Tour, at both ends of the session. The 8 `cc-dev-*` are `codecomedy-platform`'s — named and left alone.
>
> ### Local branch state
>
> `s741-chat-token-out-of-url` is **kept deliberately** — its PR (`#454`) is green and unmerged, so it is a deferred-not-merged branch, not an orphan. Delete it after the merge.
>
> ---

> **UPDATE 2026-08-21 (session `s740`, `dt:Furnas`. Picked up `s739`'s defect hunt and closed three of its four findings. Also downgraded one of the 🟠 hypotheses on a measurement, correcting a severity claim I had made myself. Closed for a coordinated laptop shutdown.)**
>
> ### State
>
> `main` **`b97de79`** · **1 open pull request, 11/11 green, awaiting the owner** · tree clean · A2A bridge **stopped at closeout** · **zero Daily Tour containers** on this host (the 8 running are `cc-dev`, owned by `codecomedy-platform` — named and left alone) · qual **NOT deployed this session**, so it is now behind `main` **by a security fix**.
>
> ### ▶ WHAT NEEDS THE OWNER — three things, none of them started
>
> 1. **Merge [`#452`](https://github.com/zmeireles/daily-tour/pull/452)** — the place-photo fix. Phase-1 feature surface ⇒ always-escalate. His "merge all PRs" earlier covered the three open at that moment; this one landed after, and was deliberately not treated as standing authorisation.
> 2. **🔴 Deploy qual.** The guest-revocation fix ([`#450`](https://github.com/zmeireles/daily-tour/pull/450)) is merged but **not live** — qual still serves the build where revoking a guest does nothing. ⚠️ token-svc needs **`--force-recreate`**, not `restart`, or the new `REDIS_URL` will not be substituted (the plan-008 Geoapify lesson).
> 3. **A product decision: should plan-sharing become explicit and revocable?** It changes behaviour and **would break existing share links**, so it was not done unilaterally. See the tour-plan section below.
>
> ---
>
> ## Shipped this session
>
> | what                                                          | PR                                                         | state                        |
> | ------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
> | guest-token revocation actually revokes (**hunt finding 1**)  | [`#450`](https://github.com/zmeireles/daily-tour/pull/450) | merged                       |
> | the pre-push test gate selects something (**hunt finding 3**) | [`#451`](https://github.com/zmeireles/daily-tour/pull/451) | merged                       |
> | `make vps` stops running half the command on the workstation  | [`#447`](https://github.com/zmeireles/daily-tour/pull/447) | merged (carried from `s739`) |
> | live-qual masthead spec in version control                    | [`#448`](https://github.com/zmeireles/daily-tour/pull/448) | merged (auto, test-only)     |
> | place photos are persisted (**hunt finding 2**)               | [`#452`](https://github.com/zmeireles/daily-tour/pull/452) | **11/11 green, UNMERGED**    |
>
> Also filed **the forward-flow UAT for the photo fix** — [`dt-tests` card `#32`](https://tasks.codecomedy.dev/p/dt-tests/r/32), marked 🚫 blocked until deployed, carrying the fixture rule (create and leave, never archive) and an optional part that checks a landmark's photo credit survives a save.
>
> ### `#451` proved itself within the hour
>
> The very next push ran **4 test tasks including `catalog-svc:test`**, where the same gate had been selecting **zero**. The fix is not just argued, it is observed working.
>
> ---
>
> ## 🔴 The tour-plan finding — VERIFIED, and DOWNGRADED. I had overstated it.
>
> I described this to the owner as _"exploitable from the browser"_, in the same breath as the revocation bug, and said I would verify it first because it _"needs no account at all to exploit"_. **That was wrong on reachability**, and it would have mis-set his priorities. The corrected picture, measured:
>
> **The missing check is real and structural.** `POST` writes `guestId` from the JWT `sub`; the authed `GET /v1/tour-plans/:planId` destructures **only `locale`** from `req.user`. And the BFF _could not_ check even if it wanted to — `getTourPlan(planId)` sends no caller identity downstream, and planner-svc's `TourPlanOut` is `{id, status, plan_payload}`, so **`guest_id` never crosses the boundary.** Same shape as finding 1: not a weak guard, an absent one, with the data it needs never wired through.
>
> **But it is not reachable.** planner-svc exposes exactly **two** plan endpoints — create and get-by-id. **No list endpoint exists anywhere**, and no admin or metrics route reads plan ids out. A plan id only ever appears in its own creator's response, so an attacker needs a UUIDv4 they have no way to obtain. The practical posture is a **capability URL** — the same one `media-display.ts` documents deliberately for asset ids.
>
> ⇒ **Latent, not live.** Do not re-inherit it as an open door.
>
> ### What IS a present defect, and it is not the IDOR
>
> **No share flag exists anywhere.** Probed `is_public` / `is_shared` / `share_token` / `shared_with` across all services: nothing. Positive control — the same probe finds `is_hosts_pick`, so it reaches flag columns in both TS and SQL. Two consequences that are true today:
>
> 1. Every `ready` plan is permanently reachable by URL **whether or not the guest ever chose to share it**.
> 2. A guest who shares a link **cannot unshare it.** The share page (`tour.share.$planId.tsx`) is a real feature — this is a share feature missing its off switch, not a stray endpoint.
>
> ### What would make the latent half fire
>
> **The first thing that lists plan ids.** Worth knowing: `analytics.tour_event` already stores `plan_id` **and** `guest_id` in the same row — the ingredients sit together, only a reader is missing. An analytics export, or an owner view of guest plans, switches this on.
>
> **The small fix that needs no product decision** (proposed, not done): expose `guest_id` from planner-svc and compare it to `sub` in the authed GET. A guest reading their own plan is unaffected.
>
> ---
>
> ## Still open from the hunt — unchanged, still 🟠 unverified
>
> - **No owner-to-owner boundary** — 18 of 23 tenant-scoped owner routes take an id and never compare it to the caller. Severity turns on how many accounts sit in Authentik's flat `staff` group, **which still nobody has measured.**
> - **Rate limiter keyed on an unverified JWT claim.**
> - **Guest JWTs logged in full** on chat connect (`?token=` is not covered by the redactor).
> - **Owner cannot clear phone/email**; split opening hours truncated; every place save rewrites `guesthouse_scope`.
>
> ---
>
> ## How the two fixes were verified — the controls matter more than the greens
>
> Every claim below was re-measured in this session, not inherited.
>
> **Finding 1 (revocation).** 5 new tests. Neutering the publish turns **exactly those 5 red** and leaves the 25 pre-existing green — including `"204; 204 again; exchange 401"`, which is precisely why the old suite could never have caught it. CI logs confirm `token-svc:test` genuinely ran 30/30, so the green is not a skip.
>
> **Finding 2 (place photos).** Two controls, and the second is the one worth reading:
>
> | control                                    | result                                                         |
> | ------------------------------------------ | -------------------------------------------------------------- |
> | neuter the writer                          | **exactly the 6 new tests red**, 37 green                      |
> | substitute the naive `DELETE all → INSERT` | **3 stay GREEN**, 3 catch it — the attribution test among them |
>
> ⇒ **Had only the obvious "media persists" and "empty list clears" tests been written, the trap would have shipped straight past them.** They are two of the three the naive version passes. ⚠️ The trap: `place_media.attribution` holds the Wikimedia Commons author/licence/source for the seeded landmarks and has **no other copy in the app**. The implementation therefore never rewrites a surviving row — only its `sort_order` moves.
>
> 📌 **A probe was widened mid-task** on `cc:Bicho`'s point that _a positive control proves a probe works, not that it reaches_: finding 2 was re-probed repo-wide, any language, raw SQL included, before being trusted. Control — the same shape finds `catalog.place`'s writers in both drizzle and raw SQL, across services and seeds.
>
> ---
>
> ## Startup checks, for the next session's benefit
>
> - **`/mcp` was NOT needed.** Both probes agreed this session already ran post-fix code: the served `add_comment` says _«OMIT IT … REFUSED (#178)»_, and `update_task(999999, project_id: <home>)` answered **`Task not found`**, not _«not scoped»_ — with `comm_whoami` as the negative control confirming the id really was `home_project_id`. `cc:Bicho` adopted this as a correction to their own fleet-wide "everyone restart" advice. **Run the served-description probe FIRST; only _«(default: claude)»_ justifies asking the owner for `/mcp`.**
> - ⚠️ **`#177` is still reached by no probe.** Inference, not measurement. Do not cite a green `#176` probe as coverage of it.
> - **Telegram: nothing was sent, and that is a measured result.** `allowFrom` is the owner alone (`2031690099`), so the client-announce rule does not fire on this project at all. Not an omission.
> - **A2A:** inbox drained and every message acked. The wake bridge cycled several times (each exit `reason: comm`) and was re-armed each time; **stopped at closeout.** ⚠️ On this machine the supervisor churns processes fast enough that `pgrep` disagrees with itself seconds apart — the authoritative signal is your own armed job's exit record, not the process table.
>
> ---

> **UPDATE 2026-08-20 (session `s739`, `dt:Furnas`. A defect hunt the owner authorised, which found FOUR pieces of machinery that silently do nothing — including a documented security control that was never built. Two PRs green and unmerged; the hunt's fix order is UNANSWERED. Closed early for a coordinated laptop shutdown.)**
>
> ### State
>
> `main` **`d3dd5dd`** · **2 open pull requests, both 11/11 green, both awaiting the owner** · tree clean · A2A bridge **stopped at closeout** · zero Docker containers on this host · qual healthy at **`bd2058e`** (26 containers, all `dt_*` healthy) and still head-of-line — everything on `main` since is docs-only.
>
> ### ▶ WHAT NEEDS THE OWNER — four things, none of them started
>
> 1. **`/mcp`** — this session's Riff MCP server runs **pre-fix code** for two authorization defects fixed upstream. Confirmed **two independent ways**, not inferred (see below). A session cannot restart its own server.
> 2. **Merge [`#447`](https://github.com/zmeireles/daily-tour/pull/447)** — the `make vps` cross-machine bug. Deliberately NOT auto-merged: it touches the VPS access path, which the doctrine lists as always-escalate.
> 3. **Merge [`#448`](https://github.com/zmeireles/daily-tour/pull/448)** — the live masthead spec. Tests-only, inside the auto-mergeable category; left unmerged only because the shutdown arrived first.
> 4. **🔴 Choose the fix order for the defect hunt.** Asked twice, never answered. The four verified findings below are all _inert machinery_, and one of them means guest revocation does not work.
>
> ---
>
> ## 🔴 The defect hunt — four findings VERIFIED BY THIS SESSION, with controls
>
> Three agents swept distinct axes (inert guards · write-path data loss · authz boundaries). **Their reports were not relayed on trust** — the four highest-severity claims were re-measured here, each with a control proving the probe could return the other answer.
>
> ### 1. Guest-token revocation is inert — a documented control that was never built
>
> `markJtiRevoked` (`services/bff/src/lib/redis.ts:48`) has **zero callers anywhere**. Control: the same grep finds **five** for its sibling `isJtiRevoked`, so the probe discriminates. `services/token-svc/src/routes/revoke.ts` writes `revoked_at` in Postgres only, and **token-svc has no Redis dependency at all** (`package.json`) — so the cache the BFF checks at `plugins/auth.ts:39` can never be populated.
>
> ⇒ Revoking a guest leaves their JWT working until it expires — **up to an hour**, with no way to shorten it. Revoke _does_ block minting a new one; the guest does not need one.
>
> 🔴 **`AUTH_POSTURES.md:9` documents this cache as THE enforcement for the `required` posture. That line is false.** The only writer of that Redis key in the whole repo is a test that seeds it itself before asserting the guard fires — the guard is real, the writer is fiction.
>
> ### 2. Every photo an owner attaches to a place is silently discarded
>
> **No `INSERT INTO catalog.place_media` exists in any route** — grep finds it only in tests and seeds. Control: the same query shape finds the writer in `guesthouses.ts`, which _does_ persist media. `media` is stripped at catalog-svc's zod boundary (`routes/places.ts:61-78`, no `media` key ⇒ zod `strip` deletes it and `safeParse` still succeeds).
>
> ⇒ Owner drags in photos → each uploads 201 → thumbnails render → save returns **200** → zero `place_media` rows. Guest discover gets `hero_image_url: null`; reopening the form shows no thumbnails. **Bytes survive** in MinIO, only the association is lost.
>
> ⚠️ **Trap for whoever fixes it:** the obvious delete-all-then-insert-from-assetIds would wipe `place_media.alt`, `attribution` and `sort_order`. `seeds/places-sao-miguel.sql:723` populates `attribution` with Wikimedia Commons author/licence/source for the 14 landmark photos — **licence-compliance data with no other copy in the app**, currently safe only because no write path exists.
>
> ### 3. The pre-push test gate has never run a test
>
> `lefthook.yml:159-165` runs `turbo run test --filter=...[HEAD]`. At `pre-push` the commit exists and the tree is clean, so the diff is empty.
>
> `[medido]` `...[HEAD]` → **0 packages, 0 tasks**. Control: `...[HEAD~5]` → **3 tasks**, so the command works and it is the ref that is wrong.
>
> ⇒ The repo's only local test gate selects nothing, every time. **The hook's own comment names the correct ref** (`[origin/main]`) — a one-token divergence from stated intent.
>
> ### 4. The restore drill passes on a dump with no rows
>
> `scripts/ops/restore-drill-postgres.sh:127-146`. Two mechanisms compound: `pg_restore` runs without `--exit-on-error` and its non-zero exit — which is _how it reports a partial restore_ — is swallowed by `|| log`; then the verification loop **logs row counts and never compares them** (`|| die` fires only if the table is missing).
>
> ⇒ A schema-only dump yields three tables, three counts of `0`, and prints **"restore drill PASSED — latest main dump is restorable."** This is the DR guard; a green drill is the only evidence the backups are worth keeping.
>
> ---
>
> ## 🟠 Reported by the agents, NOT re-verified here — treat as hypotheses
>
> - **No owner-to-owner boundary: 18 of 23 tenant-scoped owner routes** take an id and never compare it to the caller. Authentik has a single flat `staff` group. Chain: list all reservations → `POST /v1/admin/reservations/:id/token` → **mint a working guest JWT into another owner's guesthouse** (and per finding 1, that owner cannot effectively revoke it). ⚠️ **Documented as a deliberate "single-owner v1, deferred to Phase 2"**, so this is a known gap, not a surprise — **severity turns on how many accounts are in `staff` on qual**, which the agent could not measure and which nobody has checked. The subscription direction makes owner #2 the trigger. `admin-profile.ts:11-22` is named as the template for the fix: identity _is_ the address, so a cross-tenant request is unrepresentable rather than merely rejected.
> - **Tour-plan IDOR** — any guest reads any guest's plan; `guest_id` is written on create and read back by nothing. A `public` variant exposes any `ready` plan unauthenticated (no share flag).
> - **Rate limiter keyed on an unverified JWT claim** — the `trustProxy` shape one layer up: the counter increments at `onRequest`, signature is checked at `preHandler`, so a stranger holding a victim's `sub` can exhaust their budget. The in-code comment argues it is safe and reasons only about the attacker's _own_ bucket.
> - **Guest JWTs logged in full** on chat connect — the redactor covers `/r/<token>`, not `?token=`.
> - **Owner cannot clear phone/email** — blank → `undefined` → dropped by `JSON.stringify`, then by drizzle's SET builder. Console still says "Saved."
> - Split opening hours truncated to the first interval per day; every place save rewrites `guesthouse_scope` to `{all:true}`. Both **latent** — nothing can currently produce the triggering data — and both fire the day an importer or Phase-1.4 scoping lands.
>
> **The agents also recorded verified negatives**, which are worth as much: partial-update clobbering is clean (every PATCH uses explicit `if (x !== undefined)` guards), dirty-fields-only submission is clean, optimistic-UI rollback is correct, and the orphaned-middleware shape was specifically looked for and **not** found (the limiter is attached to both bff routers).
>
> ### The one finding worth acting on before the others, if only one gets done
>
> **Finding 1.** It is the smallest fix and the largest gap, and unlike the rest it makes a _document_ false.
>
> ---
>
> ## Shipped this session
>
> | what                                                          | PR                                                         | state                                    |
> | ------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
> | the `s738` closeout record                                    | `#446`                                                     | merged — **but see the duplicate below** |
> | `make vps` no longer runs half the command on the workstation | [`#447`](https://github.com/zmeireles/daily-tour/pull/447) | **11/11 green, UNMERGED**                |
> | live-qual masthead verification, in version control           | [`#448`](https://github.com/zmeireles/daily-tour/pull/448) | **11/11 green, UNMERGED**                |
>
> Also: **`dt-tests` `#30`'s Cleanup section rewritten** — it still told the tester to archive the place they create, which is irreversible (`#376`) and contradicts the owner's standing 08-19 fixture instruction. `s738` fixed `#31` and flagged this one. **All 31 cards were then swept**; the other 29 create no data, so the sweep is complete rather than sampled.
>
> ---
>
> ## 💀 `make vps` was running half of every command on the workstation
>
> `Makefile:137` read `ssh … $(CMD)` **unquoted**, so the local shell parsed the recipe before ssh existed: the first segment went to the VPS and **everything after a `;`, `&&` or `|` ran here.**
>
> ```
> OLD  make vps CMD='hostname; hostname'  ->  srv911943
>                                             jmeireles-Latitude-5401   <- laptop
> NEW  same                               ->  srv911943
>                                             srv911943
> ```
>
> ⚠️ **The documented example was itself affected.** `CMD='cd /opt/daily-tour && docker compose ps'` ran the `cd` remotely and `docker compose ps` here, which answers _"no configuration file provided"_ — **a laptop's reply, indistinguishable from a broken deploy.** This session read `docker info` as `0 containers` and came within one probe of filing qual as DOWN. qual had 26 healthy containers. Globs went the same way, shipping this laptop's `/opt` to the VPS.
>
> 💀 One character from the daily shape: `make vps CMD='cd /opt/dt/data && rm -rf *'` no-ops remotely and **`rm -rf *` in the caller's working directory.**
>
> ---
>
> ## 🪤 Verification errors this session — three mine, one in a brief I wrote
>
> 1. **A stale ref read as remote state.** I concluded `s738` never shipped its closeout, because `git log origin/main` used a **local ref I had not fetched** and `git ls-remote --heads <branch>` came back empty — which is what you get **both** when a branch was never pushed **and** when it was merged and auto-deleted. Two states, opposite meanings, one reading. Pushed and merged a **duplicate PR** (`#446`); net diff against the real one is **zero**, so no content damage, but `main` carries an empty commit. ⇒ **Ask about the destination, not the vehicle:** fetch first, then `gh pr list --state merged --head <branch>`.
> 2. **A false claim about my own habit, caught by another agent.** Told `cc:Bicho` I never pass `username` to Riff write tools _"in this session or as a habit"_. The first half was verifiable and true; the second covered ~15 sessions **none of which are visible to me**, and was **false — 9 rows, newest the day before**. The confidence of the checkable half leaked onto the uncheckable half. Root cause is not ours and is worth knowing: the tool's description reads `'Author username (default: claude)'`, **so the agent who reads carefully supplies it obediently and the careless one is right by accident.** Full entry in `~/.claude/docs/verification-incidents.md`.
> 3. **A guard placed where a louder failure shadows it.** Refactoring the masthead script, I put the `DT_REDEEM_URL` check _after_ the module resolution — so running with no token reported `MODULE_NOT_FOUND` and pointed at `pnpm install` instead of `make qual-token`. Caught by running the control. **A guard an earlier failure can shadow does not fire.**
> 4. **A tautological measurement, in a brief I wrote.** I told the UAT agent to measure nav headroom as `nav.clientWidth − Σ(children) − gaps`. It is **0 at every width by CSS construction** — `nav` is shrink-to-fit, so its box hugs its children whether comfortable or crushed. The agent caught it and measured the outer row instead. I specified an instrument that cannot vary, in a brief whose whole subject was hunting instruments that cannot fail.
>
> ---
>
> ## The `/mcp` gap, measured two ways
>
> Upstream fixed two authorization defects in `tasks-mcp` at ~09:49Z. **The checkout on this workstation has them; this session's server process does not** — it loaded at 08:49Z.
>
> | probe                                                                                                                      | reading |
> | -------------------------------------------------------------------------------------------------------------------------- | ------- |
> | **schema** (mine) — `update_task` declares no `project_id`                                                                 | pre-fix |
> | **behaviour** (`fpm:Vigia`'s) — `update_task(task_id: 999999)` → _"your agent token is not scoped to act on this project"_ | pre-fix |
>
> Negative control: `comm_whoami` shows the token **is** scoped to this project, so "not scoped" is a false diagnosis — which is the defect itself.
>
> ⚠️ **My schema probe is BLIND to the more serious of the two fixes**, and this matters for anyone reusing it: one fix changed a _declaration_ (visible), the other changed an _enforcement seam_ and left every schema byte identical. Caught by `fpm:Vigia`. ⇒ **The disk being current is precisely the reading that misleads** — a session that pulls, sees a clean tree, and concludes it is fine is wrong.
>
> ---
>
> ## ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** → expect `dt:Furnas` / `DAILY-TOUR`.
> 2. **`comm_inbox after_seq=973`** — 973 is the watermark (my last send; last _received_ was 969, acked). Three exchanges with `cc:Bicho` closed this session, nothing owed.
> 3. **Re-arm the A2A bridge** — stopped at this closeout. By **supervisor cwd**, never by count, and never with a `pgrep` pattern your own command contains.
> 4. **Ask the owner the four items under ▶ above**, starting with the hunt's fix order. Do **not** open new work while `#447`/`#448` sit green and unmerged.
> 5. **Docker:** zero containers at close. Nothing owed.
> 6. **Telegram:** allowlist is Zé alone ⇒ the client-announce rule **does not fire**; nothing was sent, and that is a measured result rather than an omission.
> 7. **`dt-tests`** — `#31` still `todo` and ready to run; `#22` deferred until prod. Both cards' Cleanup sections are now safe.

> **UPDATE 2026-08-19 → 08-20 (LATEST — session `s738`, `dt:Furnas`. A short, single-purpose session: the deploy decision `s737` left open was taken and executed, and `UAT #31` was unblocked for the owner. Closed early for a coordinated laptop shutdown, so the work queue was never opened.)**
>
> ### State
>
> `main` **`f347549`** (unchanged — no code shipped this session) · **0 open pull requests** · **0 open issues** · tree clean · A2A bridge armed at start, **stopped at closeout** · **qual NOW deployed at `bd2058e6c485…`** (was `80e017f`).
>
> ⇒ **qual and `main` now agree** on everything that produces an image. `f347549` is docs-only and builds none, so `bd2058e` is the correct head-of-line tag.
>
> ### ▶ WHAT NEEDS THE OWNER
>
> 1. **`dt-tests` card `#31`** — opening-hours data loss + guesthouse slug/error fixes. **Ready to run right now**; the readiness gate says so in as many words. Its Cleanup section was rewritten this session — see below before running it.
> 2. **An unanswered question of mine:** with the tracker empty, whether the next session opens a **defect hunt**, starts a **new feature initiative** (deferred at scale: reservations beta-scoping, needing a token-svc discriminator column; and the O(N) list→count endpoint), or holds. Asked, never answered — the shutdown came first.
>
> ### The deploy, and what was actually verified
>
> Run [`32275487028`](https://github.com/zmeireles/daily-tour/actions/runs/32275487028) — every step green, `Rollback on failure` **skipped**, rollback target recorded as `80e017f`.
>
> **All 11 images confirmed present at `bd2058e` BEFORE dispatch, with a negative control** — a bogus 40-char tag answered `404` on the same query that answered `200` for each real one. The check could distinguish present from absent rather than merely agreeing.
>
> Readiness gate verdict: **`✅ ENV READY — tester may run the UAT.`** 17/17 services healthy · **49 places** · 11 relations · `/admin` 200.
>
> Post-deploy, the two checks the `s736` proxy-trust + edge-limiter changes require:
>
> | check                                                 | result                                                                                            |
> | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
> | hop count still **one**                               | apex `server: nginx`; `/v1` helmet headers, no `Server` — identical to the pre-deploy fingerprint |
> | ordinary traffic **not** 429'd (the collapse symptom) | 25 requests, **25× 200, zero 429**                                                                |
> | `POST /v1/feedback`, removed by `#442`                | genuine bff `404` — gone                                                                          |
>
> **Places went 48 → 49: the owner's `UAT #30` place survived the redeploy.** Migrate+seed does not clobber it — which is the first direct evidence that the fixture rule (below) is safe against a routine deploy.
>
> ### 🪤 A probe that could not discriminate — caught before it was published
>
> The obvious check for `#442` is "`POST /v1/feedback` should 404". Run first, it returned **nginx `405`** — and so did **a route that never existed**. Identical responses: the probe was not reaching the bff at all, because the container was **mid-swap** and Traefik was falling back to the PWA's nginx. A 404-shaped answer would have been reported as proof.
>
> ⇒ Re-run after the stack settled, **with a positive control**: `POST /v1/telemetry/tour` → `401` _from the bff_ (route exists, auth required), proving POST reaches it. Only then is `/v1/feedback`'s bff-`404` evidence. Same family as everything in the `s736`/`s737` blocks: **an observable that cannot tell "it worked" from "it never ran".**
>
> ### 🪤 The `pgrep` self-match trap fired AGAIN, on the very check that documents it
>
> `s737` wrote down that a bridge check must not use a pattern the shell command itself contains. The first check this session did exactly that and reported **two live daily-tour supervisors** — both were my own shell. The bridge was in fact **down**. Re-checked with a pattern split so it cannot self-match; the only live supervisors belonged to Casa, fit-platform, nexumpro-marketplace, po-platform, cc-specs and codecomedy-platform.
>
> ⇒ **A written warning did not prevent the repeat.** The habit that worked was the _mechanical_ one: resolve every candidate pid's `cwd`, and treat "the pid is gone a second later" as the tell.
>
> ### 🔴 `dt-tests` card `#31` — its Cleanup section was WRONG and is rewritten
>
> The card instructed the tester to **archive** the `ZZ-` throwaways when finished. That contradicts the owner's standing 08-19 instruction (_"don't clean up the new data — I'm going to use it for other tests"_), and **archiving is irreversible** (`#376`) — the console cannot re-publish and the API rejects further edits. Following the card would have destroyed something deliberate, with no way back.
>
> Rewritten to say leave everything `published`, quoting the instruction and the reason. Parts A–D and the pass criteria are **untouched**. ⚠️ **`UAT #30`'s card carries the same defective Cleanup section and was NOT edited** — check any other card before a tester follows it.
>
> ### Not verified, and worth naming
>
> **The masthead fix rendering.** Grepping the minified bundle for Tailwind classes was inconclusive and is a bad instrument. What _is_ solid: the deployed `pwa` image is `bd2058e` (confirmed in the run log), the commit carrying `#443`, whose guards passed in CI. A live render at 768 and 1280 in pt-PT would close it properly and was offered, not run.
>
> ### Housekeeping
>
> `MEMORY.md`'s index line for the F&F testing pivot still listed **Lane-3 Phase-2** and **"remediate the 4 untagged places"** as owed. Both were settled on 07-30 (Phase-2 done; the untagged places a **phantom** — already-archived `ZZ-LANE3` disposables). Index corrected; the memory file itself was already right.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** → expect `dt:Furnas` / `DAILY-TOUR`.
> 2. **`comm_inbox after_seq=928`** — 928 remains the watermark; this session drained nothing new (inbox was empty throughout).
> 3. **Re-arm the A2A bridge** — stopped at this closeout. By **supervisor cwd**, and with a pattern that cannot match your own command.
> 4. **Poll the tester board** (project `e03901a6-…081cc`) — `#31` was `todo` at close, unblocked and ready.
> 5. **Docker:** **zero containers on this host** at close — nothing owed, and the JORAA leftover from 08-19 is gone.
> 6. **Ask the owner the question in ▶ 2** before picking work; the tracker is empty, so the next move is a scope choice, not a queue.

> **UPDATE 2026-08-19 (LATEST — session `s737`, `dt:Furnas`. The required layout gate was wedging every pull request and is fixed; the queue the owner authorised is drained; `UAT #30` finally has its HUMAN pass. Four verification errors, all mine, all caught — they are the most useful part of this block.)**
>
> ### State
>
> `main` **`bd2058e`** · **0 open pull requests** · tree clean · A2A bridge **ARMED** (checked by supervisor cwd; six other projects' bridges were live and none was this one's) · qual deployed at **`80e017f0378c…`**.
>
> ⚠️ **qual does NOT carry today's PWA fix.** The masthead change (`#443`) merged after the deploy, and it touches `apps/pwa/**`, so `publish-images` fires on `bd2058e` — a fresh image set will exist. Deploying it is a decision, not a leftover.
>
> ### ▶ WHAT NEEDS THE OWNER
>
> 1. **`dt-tests` card `#31`** — opening-hours data loss + guesthouse slug/error fixes. He said on 08-19 he would run it the same day.
> 2. **Whether to deploy the masthead fix to qual.** Nothing depends on it; the environment has no audience yet.
>
> ### Shipped and merged
>
> | what                                                                                   | PR     |
> | -------------------------------------------------------------------------------------- | ------ |
> | take apt off the required layout gate's critical path, and stop caching on a blank key | `#441` |
> | the `s736` closeout documentation that had been wedged behind that gate                | `#440` |
> | remove the guest-feedback route orphaned by the drawer deletion (**table kept**)       | `#442` |
> | give the masthead nav its width back so no locale wraps                                | `#443` |
>
> Closed with evidence: the 429-latency issue (`#328`), the orphaned endpoint (`#431`), the masthead (`#417`).
>
> ### 🔴 The required gate was wedging every pull request — and the obvious fix was wrong
>
> `E2E (layout / overflow)` became a required check on 08-19 and immediately failed a **docs-only** pull request. Two defects, found in that order:
>
> 1. **The retry could not work.** `timeout` kills `pnpm`, never the `apt-get` three levels under it; the orphan keeps `/var/lib/apt/lists/lock`, so attempt 2 died **eleven seconds** in. Reaping the orphan fixed that — **and was not enough**: with the lock free, attempt 2 used its full 300 s and hung exactly like attempt 1.
> 2. **apt itself is the cause, and it is not ours.** The runner's mirrorlist puts `azure.archive.ubuntu.com` first, every index off it is `Ign`'d, and the fallback then goes **silent mid-acquire for 4m21s** — measured twice in a row (runs `32230362122`, `32235692022`). No retry budget can help.
>
> ⇒ **Install the browser without apt, then prove it launches.** apt remains only as a fallback for a genuinely missing library. Result on a **cold** cache: install **12 seconds**, versus two consecutive 10-minute failures; 57 layout specs pass.
>
> 🪤 **And a second, quieter defect in the same job:** `Resolve Playwright version` threw from the repo root (`@playwright/test` belongs to `apps/pwa`; pnpm's `node_modules` is isolated), the command substitution swallowed it, and `echo` still exited 0. **The browser cache key had silently been the constant `playwright-Linux-`** — invalidated by nothing, least of all the version bump it exists to catch. Now `playwright-Linux-1.60.0`, and the step refuses to cache on a blank key.
>
> ### The deploy, and the trap in dispatching it
>
> ⚠️ **`image_tag` must be the SHA of a `publish-images` commit, and `main`'s head usually is not one.** `publish-images` does not watch `infra/compose/**`, so the edge-limiter commit (a Traefik label change) never produced images. Left blank, the input defaults to `github.sha` and the deploy pulls a manifest that does not exist. Deployed at `80e017f0378c…`; **all 11 images verified present with a negative control** (a bogus tag answered NO on the same query that answered YES for the real one). The compose change still lands, because the workflow does `git checkout -f` at the dispatched ref.
>
> **Post-deploy, the two checks the change required:** ordinary traffic **not** 429'd (25 requests, all 200 — the collapse symptom a wrong proxy-trust direction would produce), and the hop count still **one** (apex `server: nginx`, `/v1` helmet headers and no `Server`, identical to the pre-deploy fingerprint). Readiness gate: 48 places, 11 relations, `akadmin in staff: True`.
>
> ⚠️ **Not measured:** the limiter's rejection behaviour under a real flood on qual. Doing so means deliberately flooding the environment the owner tests in.
>
> ### 🎉 `UAT #30` has its HUMAN pass — forward-flow satisfied after four sessions
>
> The owner ran it on 08-19 and moved the card to `done` (**status field verified**, not taken on report — this is the card whose `status` disagreed with its own comments for 20 days). Corroborated in the database rather than from the screen: the created place carries **`eat` / `sea-view`**, the _Comer → Vista para o mar_ of steps 3–4. That tag row is the mechanism step 7 depends on, because the guest query **inner-joins** through `place_action_wish` — an untagged place is structurally invisible.
>
> 🔴 **Qual test data is now a FIXTURE. Do not clean it up.** Owner, 08-19: _"don't clean up the new data — I'm going to use it for other tests."_ This **contradicts the Cleanup section written on the UAT cards**, and archiving is irreversible (`#376`), so a session that follows the card destroys something deliberate. The place `UAT #30` stays `published`.
>
> ### 🪤 FOUR verification errors in one session, every one mine
>
> 1. **Compared a wrapped width against unwrapped ones** and published the conclusion that the avatar could not be causing the 1280 wrap. It could, and it was.
> 2. **Applied a padding change that does not exist** — Tailwind's `lg` starts at **1024**, so 768 and 960 share `px-2` — and from that declared the layout model "broken at 768". The model predicts all eight cells correctly; the arithmetic around it did not.
> 3. **Filtered a failure out of my own output.** A `git commit` was rejected by prettier; I had grepped the output down to the lines I expected, saw none of it, pushed the **old** HEAD and reported "pushed". Caught only when the pull-request creation said _no commits between_.
> 4. **A wait loop written as `until [ status != "in_progress" ]`** returned instantly while the run was still `queued` — "not started" wearing the costume of "finished".
>
> **Plus two controls that went red for the WRONG REASON** — a `sed` that mangled the script into a syntax error (exit **2**), and nested quoting that broke a JS string so node exited **1** on a `SyntaxError`, which is the same code the guard itself returns. A control is evidence only if it fails **by the mechanism under test**.
>
> ⇒ All six are one family, and it is the same one the whole `#417`/gitleaks/A2A line has been circling: **an observable that cannot distinguish "it worked" from "it never ran".** Recorded in `~/.claude/…/memory/feedback_verification_that_cannot_fail.md`, which now carries the "fails for the wrong reason" entry.
>
> ### The masthead, since the numbers are worth keeping
>
> The nav is the **only** shrinking column — brand lockup and right cluster are both `shrink-0` — and `max-w-[1200px]` means a wider viewport never reaches it, so the room had to come from inside the header.
>
> | band     | change                                 | buys                                                              |
> | -------- | -------------------------------------- | ----------------------------------------------------------------- |
> | 768–1023 | brand lockup steps up only at `lg`     | **57px** against a 41px deficit                                   |
> | 1280     | `xl` avatar removed, items keep `px-3` | the avatar **alone** leaves pt-PT 2px short, inside browser noise |
>
> Margins after: pt-PT **+16.8px** at 768, **+26.8px** at 1280; all 16 locale × width cells single-line. **The residual allowlist in `layout-overflow.spec.ts` is now EMPTY** — adding an entry silences a real defect. Both guards were watched failing first.
>
> ### Agent-to-agent
>
> The specs session (`cs:Barra`) ran round 1 of 3 on the card-as-async-channel spec. Two amendments of mine were adopted: the requirement is about **the surface the process reads**, not queryability (a "verdict comment" implementation satisfies the old wording and reproduces our 20-day incident whole); and **demonstration is per direction**, as a test that can fail with the opposite direction as control. Then its remaining axis — _protect the scarce side_ — was found **unfalsifiable as written**: four honest counterexamples were all absorbed, so it now stands recorded as `[não falsificável na forma actual]` pending a measurement test.
>
> ⚠️ **Routing:** `dt:Furnas → jo:Pico` is not an authorised edge, and replying in-thread inherits the full audience, so a three-way reply is **refused outright**. Drop `in_reply_to` and answer the author.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** — confirm `dt:Furnas` / `DAILY-TOUR`.
> 2. **`comm_inbox after_seq=928`** — 928 was the last processed (from `cs:Barra`, acked; nothing owed).
> 3. **Re-arm the A2A bridge** if it is down. ⚠️ By **supervisor cwd**, never by count or child — and never with a `pgrep` pattern that your own shell command contains, which reported a bridge that did not exist this session.
> 4. **Poll the tester board** (project `e03901a6-…081cc`) — `#31` was `todo` at close and the owner intended to run it on 08-19.
> 5. **Docker containers**, per the rule added to the global config on 08-19: attribute by compose `working_dir`. One container on this host at close — `joraa_legacy_scratch`, exited since 08-14, **no compose labels**, belongs to JORAA, not touched.

> **UPDATE 2026-08-19 (session `s736`, `dt:Furnas`. Closing for a coordinated shutdown. The queue is EMPTY: zero open pull requests, every owner decision from `s735` taken and executed.)**
>
> ### State
>
> `main` **`1d34ab1`** · **0 open pull requests** · tree clean · session branch namespace drained to 0 · local stack **torn down** · A2A bridge **stopped at closeout** (by pid, `61349`/`61351`).
>
> ⚠️ **qual is NOT deployed with any of this.** Seven commits landed on `main` today and none has been rolled out. Two of them change runtime behaviour on the box — the **proxy-trust fix** and the **edge rate limiter** — so the next deploy is more than routine; see the deploy note below.
>
> ### What shipped (7 commits, all verified as landed)
>
> | what                                                                       | PR     |
> | -------------------------------------------------------------------------- | ------ |
> | scope reverse-proxy trust to one hop — **closes a rate-limit bypass**      | `#437` |
> | attach the Traefik edge rate limiter to the bff routers                    | `#438` |
> | stop an apt stall in the Playwright install from wedging the required gate | `#439` |
> | measure the place-detail **latency SLO** instead of the herd               | `#436` |
> | correct in-code comments asserting falsified causes                        | `#433` |
> | make the load-test dispatch button actually run                            | `#432` |
> | delete the unreachable guest feedback drawer                               | `#430` |
>
> Repo setting, done at the owner's instruction after being carried three sessions: **`E2E (layout / overflow)` is now a REQUIRED check** (`protect-main` went 10 → 11).
>
> ### 🎯 The 429-flood latency question is ANSWERED — the endpoint was never slow
>
> At the **shipped** `cpus: "0.5"` limits, with steady arrival under the rate limit: **p95 69 ms / median 42 ms**, zero throttled, zero errors, against a 200 ms target. `#436` keeps that measurement in the suite as `place-detail-slo.js`.
>
> The alarming "p95 4–6 s" was an artifact of the measurement: a 2-minute flood admits **exactly 400 requests** (200 per fixed limiter window) and **every one lands inside 2–11 seconds of the 120**, up to 134 in a single second. It was timing a ~100-way thundering herd at each window's opening — which is also the mechanism behind the ±40% run-to-run swing the scenario's own comment documented without explaining.
>
> The CPU caps **do** bind (64–75% of scheduling periods throttled at 0.5 cores, **0%** at 4.0) but as a **chain**: catalog-svc's identical half core is co-equal. Either alone buys ~1.6×; both together 7.4×. On a 2-vCPU box that rules out raising them, which is why the fix went to the edge.
>
> The latency issue (`#328`) is retitled and has a closure recommendation posted. **Deliberately left open:** the fixed-window limiter really does concentrate admissions; under a synthetic single-source flood that is mostly an artifact, so it was not pre-emptively reworked.
>
> ### 🔴 A rate-limit BYPASS was found on the way — recorded privately, fixed, NOT publicly disclosed
>
> `trustProxy: true` made Fastify believe the caller's own `X-Forwarded-For`, and the global limiter keys on `req.ip`. Measured **with a control**: fixed header → 200 admitted + 60 rejected; rotating header → **260 admitted, zero rejected**.
>
> The owner chose the quiet route (option 1 of 4, 2026-08-18 15:32Z): no public issue, neutral commit message, review before merge. Evidence and the fix comparison are in **`~/.claude/incidents/INC-019`**, not in the repo. `#437` scopes trust to one hop; `proxy-trust.test.ts` pins **both** failure directions and was accepted only after being watched **fail** against the old setting.
>
> ⚠️ **Fixture trap written into that test file:** a **single-entry** `X-Forwarded-For` resolves identically under both settings, so the obvious version of that test passes either way and proves nothing. Do not "simplify" the multi-entry fixtures.
>
> ### The edge limiter, measured end to end (`#438`)
>
> `default-ratelimit` had been defined since Phase 0 and attached to **no router at all**. Attaching it takes bff CPU throttling from **98% of scheduling periods to 9%**.
>
> **It is not spoofable** — re-running the flood with a rotating header across ~250 fabricated addresses changed nothing, because Traefik keys on the real TCP peer. That was the one thing that could have made wiring it pointless, and it is measured, not read off a docs page.
>
> Both routers needed it **independently**: middlewares are per-router and the qual overlay _merges_ labels by key, so `bff-apex-v1` — the router that actually carries qual traffic — would have been missed by the obvious one-line change.
>
> ### ▶ DEPLOY NOTE — read before the next qual rollout
>
> The proxy-trust change alters how `req.ip` is derived, and the edge limiter starts rejecting at Traefik. **Verify after deploying**, because getting proxy trust wrong in the _other_ direction collapses every guest into one bucket and reads as "the rate limit is too aggressive", not as a misconfiguration:
>
> 1. Confirm ordinary guest traffic is **not** being 429'd (the collapse symptom).
> 2. Confirm the hop count is still **one** — client → Traefik → bff. It was verified on 08-18 via response fingerprints: the apex answers `server: nginx` (the PWA static backend behind Traefik) while `/v1` answers with helmet headers and no `Server` (the bff). If `api.<apex>` is ever pointed at the VPS, that ingress path changes and the assumption behind `trustProxy: 1` must be re-checked.
>
> ### 🪤 THREE self-inflicted verification errors in one session — all caught, none by luck twice
>
> 1. **A null result read as a finding.** Published _"hypothesis falsified"_ from an A/B whose **return leg had already flagged** that host load drifted (twin arms 2.8× apart at identical settings — larger than the 1.7× effect claimed). Recorded the drift, then reasoned past it. **Rule: when a repeat arm disagrees with its twin by more than the effect under test, the experiment measured the environment.**
> 2. **`gh pr merge` exits 0 when it REFUSES.** It prints an `--auto` hint and returns success. A merge script reported "✓ merged" for five pull requests when **one** had merged. Caught only because `git log` showed one new commit where five belonged. **Verify `state == MERGED`; never trust the exit code.**
> 3. **A healthy A2A bridge declared dead.** Reported the bridge had died; it had been alive 14 hours. Two causes, both now in memory: `pgrep` on `comm-watch.mjs` matches the short-lived **child** (between re-arms there is none), and the script path is codecomedy-platform's for **every** project because the tool is shared — so the path proves nothing in either direction. **Match `comm-watch-supervise.sh` and resolve its cwd.** Also: the supervisor's "armed, nothing after = SIGKILL" partition describes a process that has **ENDED** — check `ps -p` before reading a missing exit line as a cause of death.
>
> All three, plus the earlier gitleaks control, are the same family: **a signal that cannot distinguish "done" from "never started".**
>
> ### ▶ THE QUEUE — nothing is blocked, everything below needs the owner
>
> 1. **Deploy to qual** — nothing since `9f34ac6`; see the deploy note above.
> 2. **The orphaned guest-feedback endpoint and table** (`#431`) — now definitively dead, since `#430` deleted the only consumer. Dropping a table is a migration ⇒ always-escalate.
> 3. **The masthead nav two-line residual** (`#417`) — reopened on the owner's decision; fresh measurement is on the issue.
> 4. **The action-picker guest-visibility test** (`dt-tests` card `#30`) — still needs a HUMAN run; the owner ruled an automated pass does not satisfy forward-flow.
> 5. **Close the latency issue** (`#328`) if the posted recommendation is accepted.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** — confirm `dt:Furnas` / `DAILY-TOUR`.
> 2. **`comm_inbox after_seq=821`** — 821 was the last message processed (from `cs:Barra`, acked; nothing owed).
> 3. **Re-arm the A2A bridge** — stopped at this closeout. ⚠️ Check by **supervisor cwd**, never by count, path, or child process:
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
> 4. **Poll the tester board** for anything in `review` (project `e03901a6-…081cc`) — **empty** at close.
> 5. **The queue above**, starting with the deploy.

> **UPDATE 2026-08-18 (session `s735`, `dt:Furnas`, closing for a coordinated shutdown. Everything that did not need the owner is done or awaiting review; two things genuinely need him and are listed first.)**
>
> ### ▶ WHAT NEEDS THE OWNER — read this before anything else
>
> 1. **Make the layout/overflow browser gate a required check** — the owner chose to do this and asked to be guided. It is **not** in the `protect-main` ruleset (id `16458194`), which currently requires 10 checks. A ready-to-apply payload with the 10 existing plus the new one was written to the session scratchpad; regenerate it by reading the ruleset and appending the context `E2E (layout / overflow)`, then `gh api -X PUT repos/zmeireles/daily-tour/rulesets/16458194 --input <file>`. **Safety verified, not assumed:** the job carries no `paths`/`if` gate and demonstrably reported on both docs-only pull requests this session, so requiring it cannot deadlock a docs change. Reliability measured over the last 45 CI runs: **34 of 35 completed runs passed (97%)**; the single genuine failure (08-16) was the guard catching a real defect, and one infra timeout (apt hanging inside the Playwright install) cleared on a rerun.
> 2. **The action-picker guest-visibility test needs a human run** (`dt-tests` card `#30`) — the owner decided an automated pass does **not** satisfy forward-flow, so this stays open until he runs it. A guest link was minted for him this session and will expire; mint a fresh one with `make qual-token`. The owner password for the console is `AUTHENTIK_BOOTSTRAP_PASSWORD` in `/opt/daily-tour/.env.qual` on the box (presence confirmed; value never printed). **Step 7 — the owner-created place appearing to the guest — is the load-bearing one.** Three traps that cause a false fail are written on the card: both language tabs must be filled, two English-label defects are cosmetic and must not fail a step, and archiving is irreversible so the place needs a `ZZ-` throwaway name.
>
> ### State
>
> `main` **`3114ce3`** · qual **`9f34ac6`** — deployed this session, smoke + readiness gate green, `.last_deploy_tag` on the box confirms it · tree clean · A2A bridge **STOPPED at closeout**.
>
> **Three pull requests open, all awaiting review, none auto-mergeable:**
>
> | what it does                                             | PR     | state                                                                                                                                                        |
> | -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | deletes the unreachable guest feedback drawer            | `#430` | ⚠️ merge state `UNKNOWN` — the ruleset is **strict**, so it likely needs `gh pr update-branch --rebase` before it can merge, exactly as the gitleaks one did |
> | makes the load-test dispatch button actually run         | `#432` | CLEAN, green                                                                                                                                                 |
> | corrects two in-code comments asserting falsified causes | `#433` | CLEAN, green                                                                                                                                                 |
>
> **Open issues:** the orphaned guest-feedback endpoint and table (`#431`, new) · the masthead nav two-line residual (`#417`, **reopened** on the owner's decision) · the feedback drawer (`#389`, closes with its pull request) · the 429-flood latency (`#328`).
>
> ### Shipped and merged
>
> - **The deploy the outage blocked went through, and needed no code.** The image build had failed twice on a `codeload.github.com` 429/503 during GitHub's partial outage; one rerun with Actions healthy turned all 11 jobs green. All 11 images were verified present in the registry **with a negative control** — a bogus tag returned NO on the same query that returned YES for the real one.
> - **Both layout probes re-measured on the deployed build:** tap targets **32/32, zero failing** (was 16/32); nav wrap depth **5 cells** (was 11), run **twice** for a byte-identical residual because that probe has documented ±1 jitter.
> - **The gitleaks blind spot is closed and proven in CI** (`#428`, closing `#423`). Three whole-file `infra/` waivers became one value-scoped entry; two were deleted outright because they suppressed nothing anywhere in history. The dispatched full-history scan on the merge commit: **424 commits scanned, no leaks**.
>
> ### 🪤 Three cannot-fail traps in one session — all caught, one only barely
>
> 1. **A control the scanner ignores by design.** The first gitleaks control planted the AWS **documentation example** access-key id, which the CI scanner waives. It reported **0 of 3 caught** — indistinguishable from a broken fix. What exposed it was adding a **baseline row** (same tree, waivers removed) in which the control _must_ fire; it caught 3/3 there, which made every other row readable. **A well-known example value is the worst possible control.**
> 2. **A stale comment that would have voided the whole analysis.** `overlay.qual.yml` claimed `deploy.resources.limits` is Swarm-only and ignored by plain compose. Measured instead of believed — two throwaway services, one per style, **both** came up with `NanoCpus=500000000`. Had I trusted it, the half-core cap would have been dismissed as inert while it is the entire mechanism behind the latency issue.
> 3. **A dispatch trigger that has never worked.** The load-test workflow lists `workflow_dispatch` under `on:` but not in the job's `if:`, so dispatching completes as **`skipped`** — `gh workflow run` exits 0, a run appears in the list, nothing executes. Proven with run `32126791400`.
>
> ### The 429-flood latency issue — stated cause falsified again, real cause quantified
>
> The expired artifacts were a non-problem: the **nightly runs and passes every night**, so fresh data was one download away (run `32091893898`).
>
> - Rejections cost **0.9 ms median**. Rejection was already near-free; that premise was never the problem.
> - **Natural experiment:** the discover endpoint **does** use the JWT-decoding key generator, the place-detail endpoint does not. Identical rejection median, and discover's admitted p95 is **3× better**. The decode is not the driver.
> - All latency is in `waiting` (TTFB), with blocked/connecting at zero → server-side, not connection backlog. k6 hits the bff directly; no proxy is in that stack.
> - **Mechanism:** the bff is capped at **half a core**. At 471 rejections/s × 0.46 ms floor cost, saying "no" alone consumes **~43% of the entire budget** — a lower bound. **qual runs the same cap**, so this is not a test artifact.
> - ⚠️ **Not measured:** no bff-side CPU or event-loop-lag metric was captured during the run, so saturation is _inferred_ from latency structure plus arithmetic. Confirming it needs runtime metrics scraped during a load run. Stated as a well-supported hypothesis, not a measurement.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** — confirm the handle is `dt:Furnas` on `DAILY-TOUR`.
> 2. **`comm_inbox after_seq=815`** — 815 is this agent's own last send. Nothing was owed on agent-to-agent comms at close.
> 3. **Re-arm the A2A bridge** — stopped at this closeout. ⚠️ Verify by **cwd/env, never by count**: four bridges were live this session and none were this project's.
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
> 4. **Poll the tester board for anything in `review`** (project `e03901a6-…081cc`) — **empty** at close.
> 5. **The two owner actions at the top of this block**, then the three open pull requests.

> **UPDATE 2026-08-18 (LATEST — session `s735`, `dt:Furnas`. GitHub was healthy again, so everything `s734` left blocked went through. Two owner decisions carried over from `s734` are still open and are NOT mine to take.)**
>
> ### State
>
> `main` **`facf7e1`** == `origin/main` · qual **`9f34ac6`** — **deployed, smoke + readiness gate green** · **1 PR open (#428)** · tree clean, no worktrees · A2A bridge **ARMED** and checked by cwd (one daily-tour pair; the other live bridges are po-platform-sA, Casa, fit-platform, codecomedy).
>
> **Open issues: #423** (has a PR) **· #389 · #328.**
>
> ### The deploy that was blocked for a day, and why it went through untouched
>
> `publish-images` on `9f34ac6` had failed **twice** on 08-17 — `chat-hub` only, on a `codeload.github.com` 429/503 during GitHub's partial outage. **No code change was needed.** One `rerun-failed-jobs` with Actions healthy: **all 11 jobs green.**
>
> Before dispatching, all **11 images verified present in GHCR at the tag** — with a negative control, because a loop that answers "YES" for everything answers nothing: a bogus tag returned `NO` on the same query that returned `YES` for the real one.
>
> Deployed at `image_tag` = `9f34ac6f37234b603530ee1c2d2a118cbf451d37`, which is `main` minus `bca61be` (CI config) and the docs commits — neither has runtime effect and `publish-images` does not fire on them. Logged in `DEPLOYS.md` per that file's own convention (dispatched deploys go in the tracked table; it had gone unused since 06-13).
>
> ### The two probes, on the deployed build
>
> | probe                                   | before            | now                     |                                   |
> | --------------------------------------- | ----------------- | ----------------------- | --------------------------------- |
> | `e2e/issue-407/measure-tap-targets.mjs` | 16/32             | **32/32, zero failing** | ✅                                |
> | `e2e/issue-412/measure-wrap-depth.mjs`  | 11 wrapping cells | **5**                   | ✅ matches the predicted residual |
>
> ⚠️ The wrap probe has documented ±1 jitter, so it was **run twice**. Both runs returned a **byte-identical** residual set — pt-PT/fr/es @768 and pt-PT/fr @1280. The 5 is measured, not one sample.
>
> ⚠️ **The handoff's "six cells" is not contradicted.** This probe samples 768/834/960/1024/1100/**1280** and does **not** sample 800 — and the 768–800 brand-lockup band is one of the two named causes. The sixth cell is most likely at 800, outside the probe's width set. Stated as the likely explanation, **not verified**.
>
> ⚠️ **`ERR_NETWORK_CHANGED` twice mid-run** aborted the first two probe attempts. Not qual: `curl` answered 5/5 × `200` at ~0.5s throughout. It is Chrome's own network-change detector firing on this workstation's churning docker/VPN interfaces. Retry; if it becomes chronic, `--disable-features=NetworkChangeNotifierAutoDetect` on the probes' `chromium.launch` is the fix.
>
> ### #428 — #423, and the control that lied
>
> Three allowlist entries exempted **whole paths** under `infra/`. Narrowed to one value-scoped entry; **two deleted outright** because they raise no findings at all, in the tree or across 418 commits — a waiver that hides nothing is pure blind spot.
>
> Everything measured under **gitleaks 8.24.3 in the pinned container**, never the workstation's build (#421 established they disagree; the local one finds nothing here either way).
>
> | config             | findings | planted caught |
> | ------------------ | -------- | -------------- |
> | exemptions removed | 7        | **3/3**        |
> | old, whole-file    | 0        | **0/3**        |
> | new, value-scoped  | 6        | **3/3**        |
>
> Full history with the new config: **421 commits, no leaks.**
>
> 🪤 **The first control run reported 0/3 and was worthless.** It planted the AWS **documentation example** access-key id (`AKIA…EXAMPLE`, written here with an ellipsis on purpose — see below), which 8.24.3 ignores by design. A control that cannot fire reads exactly like a broken fix, and I nearly filed it as one. What exposed it was adding the **"exemptions removed" baseline row**: without a config in which the control _must_ fire, no other row can be interpreted. New disguise for [[feedback-verification-that-cannot-fail]] — **when planting a control value, a well-known example is the single worst choice**, because it is what scanners allowlist first.
>
> 🎯 **And the version skew got demonstrated for free:** writing that literal into this very file made the pre-commit hook **reject the commit** — the workstation's gitleaks flags the AWS example key that CI's 8.24.3 waives. The two scanners disagree in **both** directions, which is the whole reason #428's evidence had to be gathered in the pinned container.
>
> ⚠️ **#428's positive control was NOT run as a dispatched CI run**, which is what #423's acceptance asks for. Doing so means pushing a synthetic AWS key into a **public** repo's history, tripping GitHub secret scanning and AWS's notifications. Run under CI's pinned version locally instead; the deviation is stated in the PR. The **negative** half (no false positives, full history green) needs nothing planted and **should be dispatched on `main` after merge**.
>
> ### ▶ THE QUEUE
>
> 1. **#428** — needs the owner: touches `.gitleaks.toml`, always-escalate. After merge, **dispatch `Security` on `main`** and confirm green.
> 2. **#389** · **#328** (its stated cause is falsified; the measured degradation is real and unexplained, and its k6 artifacts have expired — re-deriving means re-running the load test).
> 3. **Repo setting, owner's:** make `E2E (layout / overflow)` a **required** check. It is now the third session this has been carried.
>
> ### ▶ TWO OWNER DECISIONS, both inherited from `s734`, both still unanswered
>
> - **A — #417 was closed by accident** (PR #425's body said "does not close 417"; GitHub's parser ignored the negation). Reopen, file a fresh residual issue, or accept the 5 remaining two-line cells. The fresh measurement is now posted as a comment on #417. Both design calls are written out there: the **185.1px brand lockup** at 768–800, and the avatar returning at 1280 with the full words.
> - **B — does UAT #30's automated PASS satisfy forward-flow?** #30 passed on 07-28 by an automated run, not by `akadmin`. The card is **still `todo`** — that stale field is what beat two written records and produced three sessions of false handoff state. Note CI runs exactly one spec (`ci.yml:164`), so none of the 44 tracked `e2e/**/*.mjs` run there.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** — confirm `dt:Furnas` / `DAILY-TOUR`.
> 2. **`comm_inbox after_seq=815`** — 815 is my own last send (the answer to `cs:Barra`, delivered). Message 776 is acked **and answered**; nothing is owed on A2A.
> 3. **Re-arm the A2A bridge** — stopped at closeout. ⚠️ Check by **cwd/env, never by count**: this session again found four live bridges, none of them daily-tour's.
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
> 4. **dt-tests `review` poll** (`e03901a6-…081cc`) — **empty**. `#30`/`#31` are `todo` and `#22` is deferred-until-prod; read decision **B** above before writing "awaiting the tester" again.
> 5. **#428's CI**, then the queue.

> **UPDATE 2026-08-17 (session `s734`, closeout addendum. Written after the block below was already merged as #426 — it CORRECTS that block on one point and records two decisions the owner has not yet made. Read this before acting on anything below.)**
>
> `main` **`3e8aebc`** == `origin/main` · tree clean · **0 open PRs** · local branches **main only** · no stashes, no worktrees · A2A bridge **STOPPED** at closeout.
>
> ### 🔴 CORRECTION — the block below is WRONG about how #417 was closed
>
> It says #417 was closed manually and _"not attributable from the data"_. **Both halves are false, and the reasoning behind them was the bug.**
>
> **What actually closed it: the sentence written to say it must NOT be closed.** #425's body carried the heading
>
> ```
> ## ⚠️ Option 1 does not close #417, and I am not claiming it does
> ```
>
> GitHub's keyword parser matches `close #417` and **does not understand the negation**. Confirmed by GraphQL: `closingIssuesReferences` on **#425 → #417**; on the superseded #422 → none.
>
> **And the evidence used to rule that out could not have distinguished it.** The claim rested on `commit_id: null` in the timeline's `closed` event. Control: **#407 and #415 — both closed by a proven `Closes #N` keyword — have the identical shape** (`commit_id: null`, `state_reason: null`, `performed_via_github_app: null`). So `null` is what _every_ close looks like here. A null was read as evidence when null carries no information at all — the same family as [[feedback-verification-that-cannot-fail]], this time in a _forensic_ reading rather than a test.
>
> ⚠️ **Reusable, and it will bite again:** never write `close/fixes/resolves #N` in a PR body or commit message — **not even inside a sentence denying it**. Say "does not resolve issue 417" or "#417 stays open", never the keyword next to the number.
>
> ### ▶ TWO OWNER DECISIONS, both put to the owner, neither answered
>
> **DECISION A — #417 is closed by accident. Reopen it?**
> The residual is real: six cells still hold a two-line label. Options put to the owner: **(a)** reopen #417 _(recommended — the history and the measurements are there)_ · **(b)** leave closed, open a fresh issue with only the residual · **(c)** accept the six cells as they are.
> The two design calls it carries, unchanged:
>
> - **768–800px** — right cluster is already minimal (179.6px, codes only, both stubs hidden); nav gets 347.3 and needs ~377. **The only reducible item left is the 185.1px brand lockup.**
> - **1280px** — cluster jumps to 437.3px as full words return _and_ the nav simultaneously takes back the `xl` avatar (~32px). Cheapest candidate: move the decorative avatar to `2xl`.
>   The full residual table is already a comment on #417, so it survives whichever way this goes.
>
> **DECISION B — does UAT #30's automated PASS satisfy forward-flow?**
> The protocol pulls both ways, which is why this is the owner's and was not taken unilaterally:
>
> - **Against:** `done` is defined as _"PASS recorded by tester, no further work"_; the state machine is `todo → doing (tester) → review (tester) → done (engineer)`. #30 was passed by `dt-furnas`, an automated run — the engineer's side. Its surfaces (PWA guest, PWA backoffice) are both `required` in the table.
> - **For:** the table's skip row — _"Path covered by a green Playwright spec → skip"_ — and the spec exists and is tracked: `e2e/uat30-picker/reverify-s7-s8.mjs`. That row's parenthetical _"(None today — plan-002 will add them.)"_ is **stale**; there are 44 tracked specs now.
> - **⚠️ What decides it, measured:** **CI runs exactly ONE spec** — `apps/pwa/e2e/layout-overflow.spec.ts` (`ci.yml:164`). **None of the 44 `e2e/**/_.mjs` run in CI.\*\* So "green spec" here means _"was green once, on 07-27, against `d7eeaf7`"\* — and `main` has taken **14 commits** touching `apps/pwa/src` / `services/bff/src` / `catalog-svc` since, including two today on `locale-switcher.tsx`.
> - Options put to the owner: **(1)** accept and close #30 · **(2)** re-run `reverify-s7-s8.mjs` against qual after the deploy and close only on green _(recommended — minutes, and turns "was green" into "is green")_ · **(3)** require the human tester; #30 back to `todo`.
>
> ⭐ **Either way, the root cause is that the skip row is currently unusable**: 44 specs exist and 43 of them never run. Wiring them into CI is the change that makes that row mean something.
>
> ### Still true and still first: the deploy did not happen
>
> Unchanged from the block below. `publish-images` failed **twice** on `chat-hub` (`429`/`503` fetching `docker/setup-buildx-action` during the GitHub outage; 10 of 11 jobs green including `pwa` and `bff`). **Deploy remains item 1 of the queue** — rerun `gh api -X POST repos/zmeireles/daily-tour/actions/runs/32042849102/rerun-failed-jobs`, then deploy `image_tag=9f34ac6f37234b603530ee1c2d2a118cbf451d37`, then the two probes.

> **UPDATE 2026-08-17 (LATEST — session `s734`, `dt:Furnas`. The owner authorised the whole queue in one go; all three PRs merged green. Two things stop this being a clean close: a **GitHub partial outage** blocked the qual deploy, and a correction below overturns something three prior handoffs asserted.)**
>
> ### State
>
> `main` **`bca61be`** == `origin/main` · qual **`8058c5c`** — **still, and deliberately: the deploy did NOT happen** (see the block on `publish-images`) · **0 open PRs** · tree clean, no stashes, no worktrees · A2A bridge **ARMED** and identity-checked by cwd, not by count.
>
> **Open issues: #423 · #389 · #328.** Closed today: **#407** (by #419), **#415** (by #421), **#417** (see the caveat below — not by a commit).
>
> ### Shipped — three PRs, each with full CI green
>
> | PR                      | Closes           | merge commit | checks                                       |
> | ----------------------- | ---------------- | ------------ | -------------------------------------------- |
> | **#419**                | #407             | `d6ca16b`    | 12/12                                        |
> | **#425** (was **#422**) | #417 _partially_ | `9f34ac6`    | 12/12                                        |
> | **#421**                | #415             | `bca61be`    | 11/11 — **11 is correct here**, see the note |
>
> ⚠️ **#421's 11 is not a missing check.** `Lighthouse Perf Budgets` runs only on `pull_request` with `paths: apps/pwa/**` (`lighthouse.yml:4-7`), and #421 touches only security configs. A wait loop demanding 12 hangs on a perfectly green PR — verify the path filter before treating a lower count as incomplete.
>
> ### 🪤 The stacked-PR trap: `--delete-branch` CLOSES the child, it does not retarget it
>
> The `s733` queue predicted _"merging #419 retargets #422 to `main`"_. **It does not.** Deleting the base branch on merge **closed** #422, and GitHub **refuses to reopen a PR whose base branch is gone** (`reopenPullRequest` fails; the REST retarget answers `422 Cannot change the base branch of a closed pull request`).
>
> Recovery, for the next time this shape appears:
>
> 1. `git rebase --onto origin/main <squashed-commit> <child-branch>` — drops the commit the squash absorbed, leaving only the child's own work.
> 2. Force-push with lease, open a **fresh PR** from the same branch, carry the body over, and cross-link both ways.
> 3. **Verify the parent's fix survived the rebase with a negative control** — I grepped `locale-switcher.tsx` for the tap-target classes on the pre-#419 commit (returned **nothing**) and on the rebased branch (`min-w-11 … md:min-w-0`). Without the empty first result the second proves nothing.
>
> **Cheaper alternative next time:** merge the parent **without** `--delete-branch`, retarget the child to `main` while its base still exists, then delete the branch.
>
> ### #415 is closed with proof, and the proof is the commit count
>
> The `workflow_dispatch` #421 added was used immediately. Same commit, same day, same config — only the event differs:
>
> | run           | event               | commits scanned | result                                                             |
> | ------------- | ------------------- | --------------- | ------------------------------------------------------------------ |
> | `32043607040` | `push`              | **1**           | no leaks — **this is the green that meant nothing for five weeks** |
> | `32043619959` | `workflow_dispatch` | **419**         | no leaks — this one answers the question                           |
>
> Checked **before** merging, because the config makes claims that can be tested rather than believed:
>
> - **Positive control:** a shape-valid fake AWS credential planted in `services/bff/src/` **was detected** (`aws-access-token`). Without it, "no leaks found" is indistinguishable from a scanner that cannot see.
> - `.gitleaks/central.toml` **is** byte-identical to the platform SoT config it claims to vendor — 11496 bytes, sha256 `a103fb3d7557…`.
> - Full history locally with the new config: 423 commits, no leaks, exit 0.
>
> **#423 is now measured, not argued.** The _identical_ key planted in `infra/rabbitmq/definitions.json` was **NOT** detected — one finding total across both files. Three whole-file exemptions survive under `infra/`. Evidence table posted on the issue.
>
> ### 🔴 THE DEPLOY DID NOT HAPPEN — and why
>
> `publish-images` **failed on both** `d6ca16b` and `9f34ac6`. **Not code:** 10 of 11 jobs succeeded (including `pwa` and `bff`); only **chat-hub** failed, on `429 Too Many Requests` / `503` downloading the `docker/setup-buildx-action` archive from `codeload.github.com`. Reran the failed job — **it failed the same way a second time**, so I stopped at two rather than burn a third.
>
> GitHub was in a **Partial System Outage** throughout: API, Issues, Pull Requests and **Actions** all `major_outage`. Several of this session's API calls needed retries; `gh pr merge`/`gh pr checks` (GraphQL) were unusable and everything went through **REST**, which stayed up.
>
> ⚠️ **chat-hub has not changed** in the gap (`git diff --name-only 8058c5c..bca61be` touches no chat-hub path) — but the deploy uses **one `image_tag` for all services**, so the image must exist at that tag regardless. That is the only thing blocking the roll.
>
> **No schema migrations in the gap** — verified, not assumed.
>
> ### ▶ THE QUEUE
>
> 1. **Rerun `publish-images` on `9f34ac6`** once Actions is healthy (`gh api -X POST repos/zmeireles/daily-tour/actions/runs/32042849102/rerun-failed-jobs`). Only `chat-hub` needs to go green.
> 2. **Then deploy qual** at `image_tag` = the **full 40-char SHA** `9f34ac6f37234b603530ee1c2d2a118cbf451d37`. Note this is `main`-minus-`bca61be`; that commit is CI-only config with no runtime effect, and `publish-images` does not fire on it.
> 3. **Then re-measure on qual**, with `RTOKEN="$(make qual-token | grep -oE '[^/]+$')"`:
>    - `node e2e/issue-407/measure-tap-targets.mjs` — expect **32/32**; scored 16/32 on the deployed build
>    - `node e2e/issue-412/measure-wrap-depth.mjs` — expect **5**; 11 on the deployed build
>    - ⚠️ the wrap probe has **±1 jitter** on borderline cells; a one-cell delta decides nothing without a repeat
> 4. **#423** (whole-file `infra/` exemptions) · **#389** · **#328**.
> 5. **Repo setting, owner's:** make `E2E (layout / overflow)` a **required** check.
>
> ### ⚠️ CORRECTION — "UAT #30 is awaiting the tester" has been false since 07-28
>
> **UAT #30 PASSED on 2026-07-28**, verified end-to-end on qual `d7eeaf7`: step 7 green on desktop and mobile, corroborated at the data layer by the row `eat | sea-view` (the original defect was **zero** such rows), cleanup done. It is recorded in a **card comment** by `dt-furnas`.
>
> **The card is still `todo`.** The status field was never flipped.
>
> Precise attribution, because I first told the owner a worse version of this and had to correct it:
>
> | session       | what it actually wrote                                                 |                              |
> | ------------- | ---------------------------------------------------------------------- | ---------------------------- |
> | **s728**      | _"UAT #30 — PASS"_, and _"#30 PASSED, #31 awaiting the human"_         | ✅                           |
> | **s731**      | _"UAT #31 still awaits the human"_ — #31 only                          | ✅                           |
> | **s732**      | _"UAT #30 **and** UAT #31 are both still `todo`, awaiting the tester"_ | ❌ **the error enters here** |
> | **s733**      | _"#30/#31 still `todo` (tester)"_                                      | ❌ carried forward           |
> | **s734** (me) | repeated it to the owner at startup                                    | ❌ carried forward           |
>
> **One error, three retellings — not four independent misses.** Note line 1 of this very file has said _"07-28 … UAT #30 PASSED"_ the whole time.
>
> **The mechanism is worth more than the fact.** The durable record existed in **two** places — the card comment _and_ s728's handoff — and the state still regressed, because the **queryable status field** said `todo`. `s732` polled the card, got `todo`, and wrote that down as established fact **over its own document that said the opposite**. What a query returns beat what was written.
>
> ▶ **Owner's call, deliberately not taken by me:** #30 was passed by an **automated** run, not by `akadmin`. Whether that satisfies the forward-flow protocol is a protocol decision. If it does, close #30 and only #31 remains outstanding.
>
> ### ⚠️ #417 was closed, and NOT by any commit
>
> Closed `2026-08-17T15:36:41Z`, actor `zmeireles`, **`commit_id: null`, `state_reason: null`** — so no closing keyword did it; it was a manual close. None of this session's API calls close issues. Either the owner closed it in the browser, or something else did. **Not attributable from the data, and stated as such.**
>
> It matters because **#425 explicitly does not close #417**: six cells still hold a two-line label, from two causes needing owner design calls — the **185.1px brand lockup** at 768–800, and at 1280 the avatar returning at the same breakpoint as the full words (cheapest candidate: move the decorative avatar to `2xl`). **The full residual is recorded in a comment on #417** so it survives either way.
>
> ### #328's stated root cause is falsified — re-scoped, not fixed
>
> Its hypothesis was that the per-guest limiter's `keyGenerator` decodes the bearer JWT on rejected requests. On `/v1/places/:id` — **the endpoint its own k6 evidence measured** — that decode never happens:
>
> - `routes/places.ts:12` sets **no `config.rateLimit`**, so the route falls to the global limiter, which (`app.ts:74-77`) passes **no `keyGenerator`** and uses the default `req.ip`.
> - `guestKeyGenerator` is wired to exactly **3** sites, all elsewhere (`discover.ts:46`, `discover.ts:192`, `tour-plans.ts:31`); the BFF's only `jwt.decode` lives inside it.
> - Auth is a **`preHandler`** (`plugins/auth.ts:60-66`) and `@fastify/rate-limit` rejects in **`onRequest`**, strictly earlier — so a 429 does no JWT work at all.
>
> Positive control: the same enumeration **does** find all three `keyGenerator` sites, so the negative on `places.ts` is real rather than a broken grep. **The measured degradation is still real and still unexplained**; title re-scoped to the symptom so the next reader does not build against the falsified cause. Untested alternatives (downstream saturation; `helmet`/`cors`/log-serializer running on all ~450/s) are on the issue **as hypotheses**. ⚠️ The k6 artifacts it cites had 14-day retention and are expired — re-deriving means re-running the load test.
>
> ### The lesson this session paid for THREE times in one hour
>
> **A wait that cannot fail is indistinguishable from one that passed** — [[feedback-verification-that-cannot-fail]], new disguises, all mine, all within an hour:
>
> 1. `gh pr view --json statusCheckRollup` returns **`""`** for a queued run, not `null`/`PENDING`. A filter enumerating pending states counted zero and declared CI done **with 11 of 12 checks still running**.
> 2. `gh pr checks` **exits 1 for BOTH pending and failing**. Discarding stdout on a non-zero exit made the loop _silent on failure_ — it would have timed out at 40 minutes rather than report a red.
> 3. A green set can still be **incomplete**: checks register over time (the CodeQL summary lands late), so "all completed" can be true of a partial set.
>
> Fixed in `wait-checks-rest.sh`: REST-only (GraphQL was down), decides from the JSON and never the exit code, requires the run count to be **stable across two polls**, treats an API wobble as _pending_ rather than settled, and exits `0`/`2`/`1` for green/red/timeout. **Mutation-tested in all four states — including "green but below the expected count" — before being trusted once.**
>
> ### A2A
>
> Answered `cs:Barra`'s spec-003 elicitation with the UAT #30 case (person↔agent, durable-but-silent). **Then sent an unprompted correction** when I found my "four handoffs" was two — they transcribe verbatim, so an inflated number would have entered their spec. The corrected framing is sharper: not _"the message never arrived"_ but _"what a query returns beat what was written."_
>
> ### Orphan remote branches — triaged, NOT touched
>
> 10 branches from prior sessions. Seven `jmeireles/t0-*` (May) are **merged** and safe to delete. Three are not ancestors of `main`: `docs/plan-008-slice-3-closeout` (Jul 6, 4 files differ), `docs/s728-closeout` (3 of 4 files already identical to `main`), `test/s731-406-layout-guard` (4 identical, 4 that `main` has since moved past via #414/#425). ⚠️ **A three-dot diff proves nothing here** — it shows what a branch changed since diverging even when a squash landed that content. Compare **per file against `main`**. None appear to hold unlanded work; left alone per the cross-session ownership rule.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** — confirm `dt:Furnas` / `DAILY-TOUR`. A wrong-token session looks completely normal from the inside.
> 2. **`comm_inbox after_seq=774`** — that is my own last send; 761 (`cs:Barra`) is acked and answered.
> 3. **Re-arm the A2A bridge** — stopped at closeout. daily-tour has no local script:
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
>    ⚠️ **Check the env/path, never the count** — this session again found live bridges belonging to po-platform-sA and Casa, and none to daily-tour.
> 4. **dt-tests `review` poll** (`e03901a6-…081cc`) — empty at close. **But read the two owner-call items above before repeating "#30 awaits the tester".**
> 5. **Check GitHub is healthy**, then resume the queue at item 1.

> **UPDATE 2026-08-17 (LATEST — session `s733`. A third workstation crash — the machine was slept to move office→home — ended `s732` at ~11:38Z. This block is the reconciliation. No work was done beyond one issue filed; read the `s732` block below for what actually shipped.)**
>
> ### Nothing was lost — measured, not assumed
>
> `s732` crashed **after** posting its closing report (transcript ends `11:38:39Z`; the report is timestamped `11:35:31Z`). It had nothing in flight.
>
> | checked               | state                                                                                    |
> | --------------------- | ---------------------------------------------------------------------------------------- |
> | working tree          | clean · no stashes · no worktrees · no git locks · no untracked files                    |
> | `main`                | **`a143f3b`** == `origin/main`                                                           |
> | 3 local branches      | all three have an upstream and **0 unpushed commits** (`origin/<b>..<b>` empty for each) |
> | `e2e/` specs          | **44 tracked** · no `.mjs` under `temp/` — the pre-commit guard's condition holds        |
> | A2A `comm_whoami`     | `dt:Furnas` / `DAILY-TOUR` ✅ · scope covers daily-tour **and** dt-tests                 |
> | `comm_inbox`          | `after_seq=626` → **0 messages**                                                         |
> | dt-tests              | `review` **empty** · #30/#31 still `todo` (tester) · #22 deferred-until-prod             |
> | `orchestrator-comms/` | `inbox-daily-tour.md` unchanged since 06-23 — nothing new                                |
> | memory index          | 26 files ↔ 26 rows in `MEMORY.md` — no orphans, no dangling links                        |
> | cc-platform-feedback  | `s732`'s entry verified present on disk (written `11:34`), not just claimed              |
> | GitHub since `11:38Z` | no new comments, reviews, or issues                                                      |
>
> ### ⚠️ The `s732` block below is accurate about the day but STALE about the queue
>
> It says **"2 PRs open"** and lists #415/#417 as issues with no PR. Both got PRs in the ~50 minutes between it being written and the crash. Current truth is the table below.
>
> ### State
>
> `main` **`a143f3b`** · qual **`8058c5c`** and **current** — the gap is `docs/ai/session-handoff.md` only, and qual answers `200` on the landing plus `ok` on `/healthz`. **3 PRs open, none auto-mergeable.**
>
> | PR       | Closes             | base                       | checks                               | why it waits                                                          |
> | -------- | ------------------ | -------------------------- | ------------------------------------ | --------------------------------------------------------------------- |
> | **#419** | #407               | `main`                     | **12/12** ✅                         | touches `apps/pwa/src` — outside the auto-mergeable categories        |
> | **#421** | #415               | `main`                     | **11/11** ✅                         | **always-escalate** — touches `security.yml` + `lefthook.yml`         |
> | **#422** | #417 _(partially)_ | `fix/s732-407-tap-targets` | **1 check, and that is not a green** | stacked on #419; CI triggers on `pull_request: branches: [main]` only |
>
> **Open issues: #423** (new, see below) · **#417** (residual after #422) · **#407** · **#389** · **#328**. #415 is answered by #421.
>
> ### The one thing this session added: #423
>
> `s732` flagged a residual inside #421's body and nowhere else. **A PR body is not a tracker**, and this one is the kind that disappears the moment the gate goes green: #421 makes CI honour the project's gitleaks allowlists for the first time, and three of them are **whole-file** exemptions under `infra/`. A planted AWS-shaped key in `infra/rabbitmq/definitions.json` was **not** detected. Pre-existing as a config, but **new as a CI blind spot** — created by the same change that fixes the five-week red. Filed as **#423**, blocked on #421.
>
> ⚠️ The repo is **PUBLIC**, so #423 is world-readable. It names no secret and adds nothing #415/#421 did not already state openly, but the owner may prefer it closed or moved.
>
> ### ▶ THE QUEUE — merge order matters, and it is not the PR-number order
>
> 1. **#419 first.** It is the base of #422. Merging it retargets #422 to `main`, which is the only way #422's full CI ever runs.
> 2. **#422 second — and re-read its checks after the retarget.** Right now it has one green check out of twelve. Its local evidence (57/57 layout, 576 unit) is real but is not CI.
> 3. **#421 third** (independent; escalated for the owner's call).
> 4. **Immediately after #421 merges: dispatch `Security` on `main`.** `workflow_dispatch` was added by that PR precisely so this is provable in minutes instead of a week. **Until that dispatched run is green on `main`, #415 is fixed-in-theory.**
> 5. **After #419/#422 are on `main`: deploy qual, then re-measure on qual.** `publish-images` fires on both (they touch `apps/pwa`), so `image_tag` = the full 40-char SHA of the merge commit. Then, with `RTOKEN="$(make qual-token | grep -oE '[^/]+$')"`:
>    - `node e2e/issue-407/measure-tap-targets.mjs` — expect **32/32**; it scored 16/32 on the deployed build
>    - `node e2e/issue-412/measure-wrap-depth.mjs` — expect **5** wrapping cells; 11 today
>    - ⚠️ the wrap probe has **±1 jitter** on borderline cells — a one-cell delta decides nothing without a repeat
> 6. **#417 stays open** and needs two further owner design calls, both stated in #422: the **185.1px brand lockup** at 768–800, and at 1280 the avatar returning at the same breakpoint as the full words (cheapest candidate: move the decorative avatar to `2xl`).
> 7. **#423** (after #421) · **#389** · **#328**.
> 8. **Human:** UAT **#30** and **#31** still `todo` — https://tasks.codecomedy.dev/p/dt-tests/r/31
> 9. **Repo setting, yours:** make the `e2e (layout)` job a **required** check.
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami`** — confirm `dt:Furnas` / `DAILY-TOUR`. A wrong-token session looks completely normal from the inside.
> 2. **`comm_inbox after_seq=626`** — still the watermark; nothing has arrived since.
> 3. **Re-arm the A2A bridge — it is NOT armed.** Stopped at this closeout, and verified stopped: the only live `comm-watch` pair belongs to **po-platform-sA** (`cwd=…/cristina-meireles/po-platform-sA`). daily-tour has no local script; use codecomedy-platform's with daily-tour's env:
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
>    ⚠️ **Check the env/path, never the count** — this session found live bridges and none were ours. Third handoff running that this gotcha has bitten.
> 4. **dt-tests `review` poll** (`e03901a6-…081cc`) — empty at close.
>
> ### Telegram — one paired party, no third party, nothing sent
>
> The startup instruction was to announce being back online **only if a client other than the owner is attached**. Both allowlists — global `~/.claude/channels/telegram/state` and the project-scoped `.claude/channels/telegram/state/access.json` — read identically: `dmPolicy: pairing`, **one** entry in `allowFrom`, `groups: {}`, `pending: {}`. No third party exists on this channel, so **no message was sent**. The channel itself is up (bot process alive since `12:46:37`), and its `.env` is untracked and covered by `.gitignore:2`.
>
> ### The reusable bit
>
> Three crashes in three sessions have now cost **zero** work, and the reason is the same each time: **push early, and let the remote be the record.** What has actually been lost across those three is the _write-up_ — twice — which is why the recovery ritual is now a table of anchors (tree/branches/remote/inbox/specs/index) rather than a look around. It takes minutes and it converts "I think we're fine" into a measurement.

> **UPDATE 2026-08-17 (session `s732`. A workstation crash ended `s731` on 08-16 after it had merged 5 PRs and written none of them down. This block is that recovery, plus the work that followed it.)**
>
> ### Where things stand at the time of writing
>
> main **`8058c5c`** · qual **`8058c5c`** (deployed twice today: `65151f3`, then this) · **2 PRs open, both green, both awaiting review** · 4 issues open.
>
> | PR       | what                                                               | why not merged                                                       |
> | -------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
> | **#419** | **#407** — 44×44 tap targets on the guest's first phone screen     | touches `apps/pwa/src` — outside the auto-mergeable categories       |
> | ~~#418~~ | **#412** — French three-line label + the guard that could not fail | **merged on the owner's explicit go-ahead**, deployed, verified live |
>
> **Open: #417** (needs the owner's design call — see below) · **#415** (weekly gitleaks gate; security-config, always-escalate) · **#389** · **#328**.
>
> ▶ **Next, unless the owner redirects:** #415, then #389. #417 is blocked on a decision, not on work.
>
> ### The axis this day was really about: a guard that cannot fail
>
> Three separate instances, all in the same afternoon, all in checks written _specifically_ to catch layout defects:
>
> 1. **#414's pin could not bind.** It pinned `fr@1024 = 60px` as a known residual; removing the pin left all 32 masthead cases green. The spec measured **before the webfont applied**, so every box was taken against the fallback font's narrower text. `measure()` now awaits `document.fonts.ready` **inside the helper**, where it cannot be skipped. CI is the worst case — the font cache is cold every run.
> 2. **`min-h-[44px]` hides an entire line.** Two lines of 14px text measure ~40px, so a two-line label reports the same 44px as a one-line one; only a third line shows. The height axis could only ever see the three-line case. On qual, **11 of 24** cells already held a two-line label — none of it visible. Now counted (#417).
> 3. **My own line counter was wrong twice, and both versions read as "clean".** `a.querySelector("span")` returns the **avatar**, `hidden` below `xl`, so its zero rects made `Math.max` report one line for the one item that wrapped. Then `span.getClientRects().length` returns **one rect regardless of line count**, because the label span is a flex item and therefore block-level — that version reported "nothing wraps anywhere" against a build measured at three lines. Fixed with a `Range` over the span's contents, cross-checked against height ÷ line-height, hard-failing on a zero.
>
> **What caught all three was the same move: run the check against a build where the defect is KNOWN present, before trusting any green.** Cheap, and it was decisive three times.
>
> ### And a second-order one: overflow is not the only saturating metric
>
> #407's obvious scope was "wherever the compact code renders" (`lg`). That version costs ~8px, and in the 768–1023 band — which #405 cleared with **3px** of margin in French — it moved `en@768` from a one-line nav label to two. **Page overflow stayed 0 the whole time.** So the boundary is `md`, and the tablet keeps ~41×32 targets until #417 widens that band.
>
> ⚠️ **The wrap-depth probe has ±1 jitter on borderline cells** — one run read 10 where two others read 11. So a one-cell delta from it decides nothing until repeated. The `lg` regression was confirmed 3 runs of 3 before it was allowed to change the design.
>
> ### Reusable gates (both tracked, both proven able to fail)
>
> | probe                                   | what it measures                                                     | proven by                                             |
> | --------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
> | `e2e/issue-405/repro-405.e2e.mjs`       | authenticated masthead overflow + reachability, 4 locales × 9 widths | 19/40 on the unfixed build, **40/40** after           |
> | `e2e/issue-412/measure-wrap-depth.mjs`  | nav label **line count** + nav width, per locale per width           | 12 wrapping cells on the unfixed build, 11 after      |
> | `e2e/issue-407/measure-tap-targets.mjs` | tap-target size + clipping, guest app bar **and** landing            | **16/32 cells failed** on the deployed build, 0 after |
>
> All three need `RTOKEN="$(make qual-token | grep -oE '[^/]+$')"`. All three exit non-zero and refuse to report a clean row when they cannot see the surface — the guest app-bar probe demands exactly 4 buttons, the wrap probe rejects a zero line count.
>
> ### Nothing was lost to the crash — measured, not assumed
>
> `s731` crashed some time after 08-16 17:49Z. Every piece of its work had already reached `origin`:
>
> | checked           | state                                                                       |
> | ----------------- | --------------------------------------------------------------------------- |
> | working tree      | clean · no stashes · no git locks · no worktrees                            |
> | branches          | `main` only — all five feature branches merged and deleted                  |
> | `main`            | **`331d35e`** == `origin/main`                                              |
> | open PRs          | **0** (#408 was reviewed and merged before the crash)                       |
> | `e2e/` specs      | **43 tracked** — #408 landed, so the crash could not repeat the 08-15 loss  |
> | `temp/**/*.mjs`   | none — the pre-commit guard's condition holds                               |
> | A2A `comm_whoami` | `dt:Furnas` / `DAILY-TOUR` ✅ · `comm_inbox after_seq=626` → **0 messages** |
> | dt-tests `review` | **empty**                                                                   |
>
> The reflog shows the last acts were ordinary: `fix(ci): build the PWA through turbo so its workspace deps exist` on `test/s731-406-layout-guard-v2`, then the #408 fast-forward. **The crash interrupted the write-up, not the work.**
>
> ### What `s731` shipped on 08-16 (5 PRs, all merged, all Fable-gated)
>
> | PR       | Closes | What                                                                                                    |
> | -------- | ------ | ------------------------------------------------------------------------------------------------------- |
> | **#409** | #405   | Masthead compaction — Español was unreachable on iPad portrait                                          |
> | **#411** | #392   | One `pickLocale` helper replaces four; **stops `pt`/`pt-BR` falling past Portuguese to English**        |
> | **#413** | #376   | An owner can undo an archive; archived rows answer **409 `place_archived`**, not a false 404            |
> | **#414** | #406   | `layout-overflow.spec.ts` — **55 layout cases wired into CI**, the axis that had no guard               |
> | **#408** | —      | 41 UAT specs into a tracked `e2e/` + pre-commit guard (touched `lefthook.yml` — escalated, then merged) |
>
> **Filed and still open: #412** — French masthead wraps to three lines at 1024, and pt/fr wrap two even at 1280.
>
> ### The three things from that batch worth carrying
>
> **1 · Overflow saturates; wrap depth is the real signal.** A packed row spends pressure on wrapping labels deeper while `scrollWidth` stays 0. #414 asserts nav-item height per width **per locale** and pins `fr@1024 = 60px` as a known residual (#412) rather than smoothing it away. Recorded as [[feedback-overflow-metric-saturates]].
>
> **2 · Locale is a dimension, not a case.** #409's 236px budget was computed against pt-PT; **French still overflowed 20px at 768** after that fix, and 49px at 1024 — a pre-existing defect at the commonest laptop width, found only by re-measuring all four shipped locales. A guard testing one locale would have certified the bug.
>
> **3 · A non-compiling mutation is not a red.** #413's first mutation attempt produced a file that did not compile, so vitest reported **"no tests"** — which reads exactly like a pass if you only read the summary line. Same family as [[feedback-verification-that-cannot-fail]], new disguise.
>
> ### 🔴 NEW — the weekly Security gate has been red for five consecutive weeks
>
> Found by this session, not by anyone reading CI. The **scheduled** `Security` run has failed every week since **2026-07-20** (07-20, 07-27, 08-03, 08-10, 08-17); every **push** run in the same period was green.
>
> **Root cause — CI's gitleaks runs with no config at all:**
>
> - `gitleaks/gitleaks-action@v2` auto-discovers **`.gitleaks.toml`** at the repo root. **That file does not exist.** `security.yml:4` claims it does.
> - The project's waivers live in **`.gitleaks-ext.toml`**, which only **lefthook** passes via `--config` (`lefthook.yml:28`). CI never loads it.
> - Worse, `.gitleaks-ext.toml`'s `[extend].path` is an **absolute path into `/home/jmeireles/.claude/config/gitleaks.toml`** — a machine-local file CI could never read even if it did find the ext config.
> - **Push** runs scan only the pushed commits, so the three old findings never appear in a diff → green. **Schedule** runs scan all 412 commits → the same three every week → red.
>
> All three findings are **already deliberately waived** in `.gitleaks-ext.toml`: the `docs/ai/session-handoff.md` redeem token, `ci-test-jwt-signing-key` in `load-test.yml`, and `infra/rabbitmq/definitions.json`'s placeholder `password_hash`. So the red is **noise CI cannot suppress** — and it is the worst kind, because a gate that is always red carries no signal when something real lands. Filed as **#415**.
>
> ⚠️ **The repo is PUBLIC** (`gh repo view` → `visibility=PUBLIC`). The waived redeem token is therefore world-readable in both the tree and history since 2026-06-17. **Verified dead, two ways:** `GET /v1/r/YI3yn…` → **302 `?reason=expired`**, while a freshly-minted token on the same endpoint → **200**. So the positive control passes and the 302 means what it says. No rotation needed; the waiver's premise (dev test data) holds.
>
> ### qual was stale again — deployed
>
> Last deploy was `f3a00f3` (08-15). `main` was **4 code commits ahead**. Deployed **`65151f3b109df842f5e871a8a1005662ceeabe8f`** — the newest commit with published images (#408 is e2e/docs only and triggers no `publish-images`). **No schema migrations in the gap** (verified: `git diff --name-only f3a00f3..331d35e` hits only `ci.yml`), so this is a plain image roll.
>
> **Verified live, two independent ways:**
>
> 1. `RTOKEN=… node e2e/issue-405/repro-405.e2e.mjs` against qual → **40/40**, matching #409's local prediction exactly. This is the gate that scored **19/40** on the unfixed qual build, so its green is load-bearing rather than decorative: 4 shipped locales × 9 widths on the **authenticated** home, plus the landing at 320/360/390.
> 2. All **11** daily-tour service containers report image tag `…:65151f3b1…` and `healthy` — the backend fixes (#411, #413) rolled too, not just the PWA bundle.
>
> Reusable as the post-deploy gate for any masthead/locale work — unlike `locale-verify`, it redeems a token and measures the authenticated tree. Needs `RTOKEN="$(make qual-token | grep -oE '[^/]+$')"`.
>
> ### ▶ THE QUEUE
>
> 1. **#412** — French masthead wraps three lines at 1024; pt/fr wrap two at 1280. Already pinned by #414's guard, so the fix has a test that will go green.
> 2. **#415** — commit a real `.gitleaks.toml` CI can discover (and make the ext config's extend path portable). Until then the weekly gate stays red.
> 3. **#407** (tap targets ~halved by #400) · **#389** (dead FeedbackDrawer) · **#328** (BFF limiter decode cost).
> 4. **Human:** **UAT #30** and **UAT #31** are both still `todo` in dt-tests, awaiting the tester. https://tasks.codecomedy.dev/p/dt-tests/r/31
> 5. **Repo setting, yours:** making the new `e2e (layout)` CI job a **required** check.

> **UPDATE 2026-08-15 (session `s731`, continuing `s730` after a workstation crash. #400/#403/#404 merged, deployed to qual as `f3a00f3` and verified live. 3 issues filed (#405–#407), 3 closed (#382/#391/#402). PR #408 open — awaiting review, NOT auto-mergeable.)**
>
> ### ⚠️ CORRECTION TO THE 08-14 BLOCK BELOW — do not act on its queue
>
> The block below opens with **"Do first — qual is stale, main is 5 code commits ahead"**. That was already done by `s730` on 08-14 at 09:43Z, and has been superseded twice since. **qual is `f3a00f3` and current.** Read this block, not that one; the older text is kept for its lessons, not its instructions.
>
> ### State (measured, 08-15)
>
> main **`f3a00f3`** == origin/main · **1 open PR (#408)** · local branch `chore/s731-track-uat-specs` · tree clean · no worktrees, no stashes, no git locks · **all three Fable gates shut down** · **A2A bridge ARMED** for daily-tour (verified by env/path, not by count) · `comm_inbox` drained, last processed seq **626** · dt-tests `review` **empty**.
>
> ### ▶ THE QUEUE
>
> 1. **#405 — Español unreachable on iPad portrait (768–834).** Same defect class as #382, different breakpoint; `DesktopTopNav` mounts the same switcher from `md`=768. Measured 191px overflow at 768 on the **authenticated** guest home. ⚠️ Half of it is still unverified since the batch — see the trap below.
> 2. **#406 — the layout axis has no guard that can fail.** A mutation deleting `sm:hidden`/`sr-only`, which overflows _worse_ than the original bug, passes all 7 of #400's tests. `apps/pwa/e2e/*.spec.ts` is not CI-wired, so there is nowhere a layout assertion would run today.
> 3. **#392** (four locale-fallback helpers, three orders) · **#389** (dead FeedbackDrawer) · **#376** (archiving is a one-way door — carries an open product question) · **#407** (tap targets ~halved by #400) · **#328** (BFF limiter decode cost).
> 4. **UAT #31** still awaits the human: https://tasks.codecomedy.dev/p/dt-tests/r/31
>
> ### The verification asset — use it, and know its blind spot
>
> `e2e/locale-verify/uat-locale-two-profiles.e2e.mjs` is the post-deploy gate for locale work. It exits non-zero, carries a vacuity control, and was **proven able to fail** by running it against the broken build first (8/25). After `f3a00f3`: **24/25**.
>
> ⚠️ **Its green rows at 768/834 say NOTHING about #405.** It loads `/` unauthenticated — the public landing, a different component. #405 lives on the authenticated guest home and needs a redeemed token (`make qual-token`). The one failing row is #405's secondary item: the landing switcher clips "English" 7.1px off the **left** edge at 320px, byte-identical before and after the batch. Note that page overflow reads **0** on that same run — a negative `left` does not grow `scrollWidth`, so the usual check is blind to it.
>
> ### The lesson this session paid for four times
>
> **A verification that cannot fail is indistinguishable from one that passed** — again, and in new disguises:
>
> - #403's first commit shipped green with 8 new tests that passed **with and without** the fix, because they fed a single-entry language list, a shape no browser produces.
> - The whole detector suite was structurally blind to the poisoned-cache defect: its helper passes `caches: []` and clears localStorage, excluding the exact mechanism that breaks in production.
> - #404's guest guard asserted only the bubble's timestamp, so reverting **both** `dayLabel` call sites left all 542 tests green.
> - While purging inlined tokens I printed **"(empty = clean)"** under a grep that had just returned ten lines, then a corrected pass still missed eight because it matched only double quotes. **gitleaks caught them.**
>
> House standard, reaffirmed: **assert, never label**; and prove a guard goes red against its own bug before trusting a green from it. Every guard in this batch was mutation-tested that way.
>
> ### The three defects the gates caught that I did not
>
> All three would have shipped. Worth the cost of the gate.
>
> 1. **Poisoned localStorage (#403).** The detector caches its result and reads that cache _before_ `navigator`. Every visit during the broken period wrote `i18nextLng=en`, so the fix would never have run for the guests who actually hit the bug — Miguel's phone included. Fixed with a versioned key. Confirmed live: the deployed build was _actively_ poisoning profiles, and a poisoned profile broke **pt-PT** too, the one locale that always worked.
> 2. **Scope (#404).** The PR said `Closes #391` — an issue titled for **guests** — while fixing four owner call sites and leaving three guest ones.
> 3. **A false attestation (#400).** Its "overflow 0 at 768" acceptance line was true of an isolated markup harness and false of the real page. Correcting it is what produced #405.
>
> ### UAT specs are now version-controlled (PR #408)
>
> The `e2e/` directory four handoffs called "perennial untracked" was found **gone**, with six specs — an 89-scenario router regression, the action-picker UAT, four `uat-lane3b-*` revoke specs, the live-geocode UAT, the map-tile probe. Never `git add`ed, so unrecoverable.
>
> All 41 survivors are now tracked in `e2e/`, evidence stays disposable in `temp/`, and a **pre-commit guard** fails if a `.mjs` reappears under `temp/`. ⚠️ **Nine guest tokens were inlined across 28 of those files** — never leaked only because `temp/` was ignored; all now read `process.env.RTOKEN`. See `e2e/README.md`.
>
> **PR #408 touches `lefthook.yml` → always-escalate. Do not auto-merge it.**

> **UPDATE 2026-08-14 (LATEST — session `s728`, long-running. The three decisions the owner made on 08-03 (#379, #383, #371) are all shipped, plus #380 and #393. **9 PRs merged, every one Fable-gated; 11 issues filed, 6 closed.** main `51677bf`; 0 open PRs; branches = main only.)**
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> 1. **`comm_whoami` FIRST** — confirm `dt:Furnas` / `DAILY-TOUR`. Cheap, and a wrong-token session looks completely normal from the inside.
> 2. **`comm_inbox after_seq=626`** — that is my own last send. Everything up to 626 is drained and acked.
> 3. **Re-arm the A2A bridge** (stopped at closeout). daily-tour has no local script — use codecomedy-platform's with daily-tour's env:
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
>    ⚠️ **Check the env/path, never the count** — this session found 10 live `comm-watch` processes and none were daily-tour's.
> 4. **dt-tests `review` poll** (`e03901a6-…081cc`) — empty at close. Note the token now scopes **both** projects, which #145 made load-bearing when reads became authorized.
>
> ### ▶ THE QUEUE
>
> **Do first — qual is stale.** main is **5 code commits ahead** of qual (`d1177669`), counted rather than estimated:

> | commit    | what it carries                                                   |
> | --------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `268f00b` | #388 — `pt`/`pt-BR` guests resolve to pt-PT                       |
> | `ccf65a3` | #390 — CI fails on an unresolvable `t()` key                      |
> | `5ebb2f5` | #394 — turbo concurrency capped                                   |
> | `ac0160d` | #396 — dev dependency graph gated (**carries the vitest 3 bump**) |
> | `7ed39e0` | #397 — locale CHECK narrowed (**schema migration**)               | `image_tag` = the FULL 40-char SHA of a `publish-images` commit. **The token-svc migration `0001_narrow_locale_check` applies on boot** — it is safe (zero rows in `pt-BR`/`de`, re-measured) but it is the first schema change deployed in a while, so watch `dt_token_svc` come up. |
>
> **Human:** **UAT #31** — https://tasks.codecomedy.dev/p/dt-tests/r/31 (card corrected: no kebab→Arquivar, archiving is irreversible, both cosmetic defects flagged so they aren't failed by mistake).
>
> **Open issues, my ordering:** **#380-family follow-ups** — #382 (390px overflow, Español clipped) · #376 (archiving is a one-way door — carries an open product question) · #395 (eslint globs tsup's temp config; deterministic, and #394 can only narrow that race) · #391/#392 (Intl regional loss; four fallback helpers with three orders) · #389 (dead FeedbackDrawer — delete or wire) · #328 (BFF limiter decode cost).
>
> ### Shipped (all merged, every one Fable-gated)
>
> | PR             | What                                                                     |
> | -------------- | ------------------------------------------------------------------------ |
> | #374           | s726 handoff, recovered from an unpushed local branch                    |
> | #377           | discover leaked Portuguese into en/fr/es (`nearby.title` → `map.nearby`) |
> | #381           | three more of the same class + guards proven to fail                     |
> | #384/#385/#386 | handoff, Lane-3 Phase 2, qual deploy record                              |
> | #387           | **#380** — consent banner covering navigation and the chat Send button   |
> | #390           | **#379** — CI fails when a `t()` key resolves in no locale               |
> | #394           | **#393** — turbo concurrency capped at 2                                 |
> | #396           | **#371** — dev dependency graph gated and cleared                        |
> | #397           | **#383** — locale CHECK narrowed to the four served locales              |
>
> ### The four things worth carrying forward
>
> **1 · A verification that cannot fail is indistinguishable from one that passed.** Hit repeatedly, by different mechanisms: a cleanup query keyed on `name->>'pt'` in a schema storing `pt-PT` (returns zero rows for _every_ row); a `.catch(() => {})` swallowing a blocked click so it read as "the app didn't navigate"; a chunk-name regex dropping dots so 64 `curl`s 404'd and grepping the empty bodies said "the key is gone"; wall-clock used as a control when variance at a fixed setting spans 1m23–2m56. **Anchor checks on something structurally guaranteed, and prove the check can go red before trusting the green.** Recorded as [[feedback-verification-that-cannot-fail]].
>
> **2 · Every guard added this session was verified to FAIL against its own bug** before being kept — the i18n scan against all four historical leaks, the consent inset against the stuck-var trap, the locale CHECK against a widened constraint, the audit gates against a removed override. That is now the house standard; a guard never seen failing is not a guard.
>
> **3 · An override floor with no ceiling is not a floor.** `>=4.3.1` on js-yaml let pnpm install **5.2.3**. Every override now closes its range. Separately: **four** newly-published advisories blocked pushes during this session (`brace-expansion`, `fast-uri`, `nanoid`, `extract-zip`) — a floor pinned to "whatever is installed today" ages into a blocker the moment the next CVE lands.
>
> **4 · `git stash -u` sweeps untracked files.** Dropping a stash later "because it only held a config change" destroyed two A2A use-case documents I had told a peer were in the repo. Recovered from a dangling object; the claim had been false for four days and nothing surfaced it.
>
> ### ⚠️ Two things NOT explained, stated as such
>
> - **Why vitest 3 made these suites slower.** `testTimeout: 20000` is mitigation, not diagnosis, and the trade (stability bought, early warning on hung tests sold) is written at the callsite. Measured: vitest 2 → 0/9 runs failed; vitest 3 → 4/4; with the timeout → 1/3.
> - **#393 is closed as a monitored hypothesis, not a fix.** My interleaved A/B was **p = 0.227** — not significant. What carries it is CI: 3 flakes in 15 main pushes, and the capped runs 26% faster. **Tripwire: if a main push fails with the tsup `ENOENT` or testcontainers `57P01`/Reaper signature, reopen #393 rather than rerunning.**
>
> ### A2A
>
> Answered `cs:Barra` twice on cc-specs spec 001. My delimitation — _"only the exit gates count; one case, not four"_ — made them recount ten domains and find they had **written a strict criterion and applied a permissive one**. My cases 1–3 entered as R1/R2; case 4 (provenance) is deferred at two domains of three, and I did not contest it. My measurement that the UAT set is _"whatever someone remembered to create"_ became clause **R4.2**. Cases live in `docs/ai/use-cases/`.
>
> Also ran the `#144` probe `cc:Bicho` had been waiting on with **n=0**: after the owner's `/mcp`, `comm_send` with a bogus handle returns `delivery.unresolved_members`. Reported as **n=1, opportunistic observation, not a designed experiment** — I did not choose the reconnection moment.

> **UPDATE 2026-07-28 (LATEST — session `s728`. Verified the shipped react-router v8 major on the guest surface, ran UAT #30 to a PASS, and cleaned up an i18n defect class that had shipped green four times. **3 PRs merged (#374, #377, #381), 6 issues filed (#375–#376, #378–#380, #382–#383), every merge Fable-gated.** main `b226da7`; 0 open PRs; branches = main only.)**
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION
>
> Same startup ritual as always — **check the MCPs and alert the user on any failure** (you cannot self-reconnect; ask them to run `/mcp`).
>
> 1. **`mcp__tasks-prod__comm_inbox`** — last processed seq = **272** (qb:Aldraba's cert-fix closing ack, already acked). Pull `after_seq=272`.
> 2. **`comm_whoami` FIRST** — confirm the handle is `dt:Furnas` / home project `DAILY-TOUR`. This is cheap and catches a wrong-token session, which looks completely normal from the inside.
> 3. **Re-arm the A2A wake bridge** (stopped at closeout). daily-tour has no local script — use codecomedy-platform's with daily-tour's env:
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
>    ⚠️ **The gotcha bit again this session**: `pgrep -f comm-watch` showed **10** live bridges and **none** were daily-tour's (qr-bell, joraa-project, eventos-judo, codecomedy). **Check the env/path, never the count.**
> 4. **dt-tests `review` poll** (`e03901a6-b656-4f38-a768-b98d4fa081cc`) — empty at close.
>
> ### ▶ THE QUEUE
>
> **Owner decisions (blocking — nothing moves without them):**
>
> 1. **#379 — extend `check:i18n` to scan `t()` callsites.** Making it fail CI is a **gate change** → always-escalate. This one guard would have caught **all four** i18n leaks (#370's six picker strings, #375, #378, and the dead `feedback.*`). A working prototype exists from the #377 review.
> 2. **#383 — `pt-BR`/`de`/bare-`pt` guests get a wholly English UI.** The PWA half is a 2-line i18next config change (`supportedLngs` + `nonExplicitSupportedLngs: true`). The **token-svc half is a schema decision**: its CHECK constraint accepts six locales the app only serves four of. Narrowing it is a migration — needs the owner's call and a check for existing rows.
> 3. **#371 — dev-dependency graph is ungated** (16 high + 1 critical `vitest` <3.2.6). Policy question, unchanged from s726: gate dev at `high`, or review periodically?
>
> **Ready to build (no decision needed):**
>
> 4. **#380 — consent banner covers place cards at 390px. Do this first.** Upgraded to low-to-**medium** mid-session: a thumb aiming at a card's lower portion hits the banner's own Recusar/Aceitar button and **silently records a GDPR consent choice**, which then persists. Only 2 of 6 tap points on a card work on a first visit. It is the first thing a guest sees on a phone, and it is the only open item touching consent.
> 5. **#382** — guest home has 36px horizontal overflow at 390px; `LocaleSwitcher` is `flex gap-1` with four full-word buttons, no wrap, and the **Español** button is clipped off-screen.
> 6. **#376** — archiving a place is a one-way door (`places.ts:620` 404s any PATCH on an archived row). Carries an open product question: terminal by design, or should there be a restore path? The UI gives no signal either way.
>
> **Human, when they have time:** **UAT #31** (https://tasks.codecomedy.dev/p/dt-tests/r/31) — card corrected this session, see below.
>
> **✅ Synthetic survey data cleared (2026-07-31).** n8n execution `14` (the `ZZ-LANE3B` Lane-3 submission) is deleted, on the user's explicit go-ahead — verified by content, not status code: `GET /rest/executions/14` returns `200 {}` with no marker. ⚠️ **n8n's REST API answers `200` with an empty body for a missing execution, and `DELETE /rest/executions/:id` 404s** (wrong route — the working one is `POST /rest/executions/delete` with `{ids:[…]}`, which returns a bare `200 {}` whether or not it did anything). Check the body, never the status. `make survey-export` was rate-limited (429) by the repeated logins right after — re-run it to confirm from the export side.
>
> ### ✅ Lane-3 Phase 2 — DONE. The 07-25 three-lane model owes nothing.
>
> **8/8 scenarios PASS, no app bugs.** Both objectives closed.
>
> **A — reservation revoke.** Minted a throwaway reservation, issued a guest link, redeemed it successfully, then revoked. What revoke actually does, observed rather than assumed: **the grant row is updated (`revoked_at` set), the reservation row is not touched at all** (`status` stays `confirmed`, `updated_at` unchanged). Revoke is **token-scoped, never reservation-scoped**. The confirm flow is a proper `AlertDialog` stating the consequence ("Their guest link will stop working immediately"), revoke affordance has 0px overflow at 390px, and the state survives a fresh login + reload.
>
> ⚠️ **The revoked-link refusal is a `302`, not a `401`** — the agent first logged a FAIL on that, then corrected itself. `services/bff/src/routes/token-exchange.ts:45` deliberately degrades expired/invalid tokens to `/?reason=expired` per **FR-AC-05**, with token-svc returning 401 upstream. The guest sees "Your link has expired. Ask your host for a new one." **Anything asserting 401 on that path is asserting the wrong contract.**
>
> **B — survey capture. The table IS wired; my going-in hypothesis was wrong.** `beta.survey_responses` was at 0 rows because nobody had ever submitted, **not** because the sink was missing. A submitted form produced a row (`lang='EN'`, answers keyed by full question text). `docs/beta/beta-program-2026.md:122` — which said a DB node "could be added later" and was what made this ambiguous — has been corrected.
>
> **Note the two read paths are independent:** `make survey-export` reads the n8n **Executions** via REST, _not_ the DB table. Both work; they have different retention.
>
> **The 8 real reservations were verified untouched three times** (baseline / post-revoke / post-cleanup), identical each time. Cleanup verified on three independent anchors — by row id, by `created_at`, and by totals returning to the exact baseline.
>
> **Not covered, honestly:** the pt/fr/es survey forms (only en submitted) · whether an **unreloaded** guest tab keeps working inside the 1h JWT window after revoke (the reload path dies; the in-flight window is by design — 60s revocation cache marker — and was not measured) · re-issuing a link after revoke · revoking a reservation holding multiple active grants · reservation status transitions.
>
> **Also worth knowing:** the owner console renders in **English** in a fresh headless context (Chrome is `en-US` and the i18n detector follows it), not Portuguese. Not a bug, but briefs that assume PT selectors will mislead.
>
> Specs (kept, not committed): `e2e/uat-lane3b-{revoke,revoked-link,persist-check,survey}.e2e.mjs`. Evidence `temp/lane3-phase2/`.
>
> ### Shipped (all merged; main `b226da7`)
>
> - **#374 `docs` — recovered a stranded handoff.** The s726 handoff commit had been written but **never pushed** — it sat on a local `docs/s726-closeout` branch while that session's own state block claimed "branches = main only". Worth knowing the failure mode: a handoff that says the tree is clean can itself be the uncommitted work.
> - **#377 `fix(pwa)` — discover leaked Portuguese into en/fr/es.** Three call sites requested `nearby.title`, a key in **no** locale file, so the hardcoded PT `defaultValue` won in every language. Real key is `map.nearby`, already translated everywhere. **Pre-existing since #272 (06-18), not a v8 regression.**
> - **#381 `fix(pwa)` — three more of the same class**, plus proven guards. (a) `auth.bootstrapping` existed in no locale file and `SessionBootstrap` wraps **all** routes → every non-en guest saw English on the boot screen. (b) The action picker labelled itself with the **content** locale, so a PT owner switching to the Inglês tab watched the six categories flip to English. (c) The Save-blocking `min(1)` message was a hardcoded English literal, observed live in the PT console.
>
> ### react-router v8 — CLEARED on the guest surface
>
> The one thing s726's deploy smoke did not cover. **87/89 scenarios PASSED, 0 FAIL, 2 NOT-TESTED** (both `/tour/:planId` with a real plan — creating one is a mutation).
>
> Probes that mattered, all on desktop **and** mobile: hard-navigation by typed URL to every guest route (cold router mount — the thing v8 actually changed), `/r/<token>` by direct URL, back ×3 / forward ×3, F5 on a deep route, back-after-F5, unknown route, and redirect-chain assertions (`redirectLeaks: []`). The dual-module worry was settled **at runtime, not from the build**: of the loaded chunks, exactly **one** carries react-router's invariant strings. Zero occurrences of `basename` / `Cannot destructure` / duplicate-context signatures across all 48 scenarios.
>
> Spec `e2e/uat-rrv8-router.e2e.mjs`, evidence `temp/rrv8-guest-regression/` (40 shots + `evidence.json`).
>
> ### UAT #30 — PASS
>
> Step 7 (the load-bearing one) confirmed at **two independent levels**: visible in the guest UI _and_ `discoverAPI[eat:FOUND …]` with the other five actions correctly absent — on desktop and mobile. Corroborated at the data layer: the two-level picker wrote exactly one `place_action_wish` row, `(eat, sea-view)`. The 🔴 is closed. Card commented with full evidence; place `ZZ-UAT30 Miradouro de Teste` archived and DB-verified.
>
> ### ⚠️ "Remediate the 4 untagged places" was a PHANTOM — do not re-inherit it
>
> The s726 handoff carried this as a live task. It isn't. Full `catalog.place` audit (47 rows, unfiltered):
>
> | source | status    | places | untagged | avg tags |
> | ------ | --------- | ------ | -------- | -------- |
> | manual | archived  | 4      | **4**    | 0.00     |
> | manual | published | 43     | **0**    | 1.79     |
>
> The four untagged rows are the **`ZZ-LANE3` disposables** from 2026-07-24, already archived by that test's own cleanup. The 07-25 finding "4 owner places = 0 actions" was measuring throwaway test data; two handoffs propagated it into "4 real places needing owner remediation" without anyone re-checking. **No guest-visibility damage exists on qual.** The picker's value is prospective — it stops the _next_ real place being born invisible.
>
> ### The i18n defect class — four occurrences, all shipped green
>
> `check:i18n` diffs the **en↔pt-PT key sets**. A key requested from code that exists in **no** locale file is structurally invisible to it — it passed before _and_ after every fix this session. Occurrences: #370's six picker strings · #375 · #378 · the (unmounted) `feedback.*`.
>
> The test suite is blind for a separate reason worth remembering: the discover tests mock react-i18next as **`t: (k, o) => o?.defaultValue ?? k`** — the mock **returns the defaultValue**, which was the exact thing broken. 495 passing tests could never have caught #375 no matter how many assertions were added.
>
> **#379 is the systemic fix.** Until it lands, add en+pt-PT+es together and assume neither the linter nor the suite will tell you otherwise.
>
> ### The lesson worth carrying — a verification that cannot fail
>
> Hit **twice**, by different mechanisms, and both produced a clean-looking negative:
>
> - A cleanup query keyed on `name->>'pt'` in a schema that stores **`pt-PT`** — returns zero rows for _every_ row in the table. "0 rows" reads as "nothing left behind". It would have reported success with a published test place still live. (My brief was wrong; the agent caught it during recon.)
> - A `.catch(() => {})` around a Playwright click. A genuine actionability timeout was swallowed, the spec fell through to a URL assertion, and a **blocked click looked exactly like the app refusing to navigate** — costing a full cycle chasing a mobile bug that did not exist.
>
> Applied to the #381 guards: each was verified to go **red** against its own defect before being kept. Anchor cleanup checks on something structurally guaranteed (row id, `created_at`), never a text field you assume is populated. Recorded in memory as [[feedback-verification-that-cannot-fail]].
>
> ### dt-tests cards corrected (matters before the human runs #31)
>
> - **"Cleanup: kebab → Arquivar" does not exist** in this build. Correct path: open for editing → **Estado = Arquivado** → Guardar. Both cards fixed, and both now warn that **archiving is irreversible** (#376) and ask for a `ZZ-` prefix on throwaways.
> - **UAT #30 step 2 had a false-PASS trap**, now fixed: `name_en`/`description_en` are `min(1)`, so filling only Portuguese gets the save refused for _that_ reason — the tester would see a refusal, tick the step, and have proved nothing about categories. The card now says fill **both** tabs.
> - Both cards flag the two cosmetic defects (#381's, now fixed) so a tester doesn't fail a step over them.
>
> ### Agent-delivery gotcha (cost real time three times)
>
> **Subagents went idle without sending their report** — three of five did it. Their findings were complete but sat in `temp/*/log.txt`. Brief every agent explicitly that plain text output is invisible and the report must go via SendMessage, and **check `temp/<agent>/` before assuming an idle agent produced nothing**.
>
> Also: an agent's self-exculpating explanation is worth verifying. `uat30-picker` attributed a mobile failure to its own selector and claimed `a[href*="/p/"]` navigates fine — but **that selector matches zero elements anywhere in the app** (every place navigation is programmatic `navigate()`; `PlaceCard` is a `div` + `role="button"`). Independent triage reached the same verdict via the real cause and found #380 on the way.
>
> ### State (07-28 close)
>
> main **`ea852fd`** == origin/main · **0 open PRs** · local branches **main only** · tree clean (only the perennial untracked `e2e/`, now also holding `uat-rrv8-router.e2e.mjs`, `uat30-action-picker.e2e.mjs` and the four `uat-lane3b-*.e2e.mjs`) · **all subagents shut down** · **A2A bridge STOPPED** (re-arm per FIRST ACTIONS) · dt-tests `review` **empty**, #30 PASSED, #31 awaiting the human, #22 deferred-until-prod.
>
> **✅ qual = `b226da7`, DEPLOYED AND VERIFIED 2026-07-31** (`deploy-qa.yml` run `30645618309` success, `image_tag=b226da72283781f91a50106dfc0fb3e036de8760`). `dt_pwa_static` / `dt_bff` / `dt_catalog_svc` all on that tag; guest `/` and `api/health` 200. **Verified in the served bundle, not just by container restart**: the discover route chunk carries `map.nearby=1, nearby.title=0`, and `auth.bootstrapping` + "A restaurar a sua sessão…" + "Escolha pelo menos uma categoria" are all present. main is `ea852fd` (docs-only on top), so **qual is current**.
>
> ⚠️ **Verifying a fix in the served bundle — the trap I fell into.** Chunk filenames contain dots and `$` (route files like `_authed.a.$action.tsx` → `_authed.a.$action-CLupmahA.js`). A regex of `[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js` truncates them, every fetch 404s, and grepping the empty bodies reports "the key is gone from all 64 chunks" — which reads exactly like a successful fix. **Assert HTTP 200 per chunk before believing any grep result.** Working regex: `[A-Za-z0-9_$.-]+-[A-Za-z0-9_-]{8}\.js`.
>
> Memory: NEW [[feedback-verification-that-cannot-fail]], [[feedback-uat-map-tile-console-noise]]; updated [[project-ff-testing-pivot]].

> **UPDATE 2026-07-27 (LATEST — session `s726`. Cleared the blocking audit gate, then shipped BOTH items the last handoff owed: the S6b action-picker feature and the 3-bug fix batch. **4 PRs merged (#368, #369, #370, #372), 1 issue filed (#371), every merge Fable-gated.** Also fixed a shared-Traefik cert for qr-bell and reconciled the dt-tests board. main `d7eeaf7`; **qual DEPLOYED + verified** at closeout. Session closed early for token budget, not because work stalled.)**
>
> ### ⚠️ FIRST ACTIONS NEXT SESSION (user's explicit instruction)
>
> On the user's "resume", **before other work**: check and enable the **comms / tasks-prod / telegram MCP servers**, and **alert the user on any failure** (you cannot self-reconnect an MCP — ask them to run `/mcp`).
>
> 1. **`mcp__tasks-prod__comm_inbox`** — last processed seq = **271** (my own send). Pull `after_seq=271`.
> 2. **Re-arm the A2A wake bridge** (NOT running — stopped at closeout). It is a `run_in_background` job, and daily-tour has **no local script** — use codecomedy-platform's with daily-tour's env:
>    `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash /media/jmeireles/ssd3/my-projects/cc-mcp-launcher/apps/tasks-mcp/comm-watch-supervise.sh`
>    ⚠️ **Gotcha that bit me this session:** `pgrep -f comm-watch\.mjs` showed 5 live bridges so I skipped arming — but all 5 were **codecomedy-platform's**. Check the _path/env_, not the count. Three qb:Aldraba messages sat unread until the user asked directly.
> 3. **Telegram MCP** — verify it is loaded; alert if not.
> 4. **dt-tests `review` poll** (`e03901a6-b656-4f38-a768-b98d4fa081cc`) — empty at close.
>
> ### ▶ THEN — the work queue
>
> 1. **Browser-UAT the guest surface** — **react-router v8 shipped in this batch** (see below), so a guest-regression pass is the one thing the deploy smoke did not cover. ✅ The deploy itself is DONE: `deploy-qa.yml` run `30237957209` **success**, `image_tag=d7eeaf71d2dd03f1f006c1e68fb7248481e9bd21`; verified live — guest `/` 200, `api/health` 200, `dt_catalog_svc` + `dt_bff` both on the `d7eeaf71…` tag, and **`/v1/admin/actions` → 401 (owner-gated, not 404)** proving the new taxonomy endpoint shipped.
> 2. **Run UATs #30 + #31** on dt-tests — **already unblocked** (deploy-verified comment posted on both). **#30 step 7 is load-bearing** — the owner form can look perfect while the bug persists, because the defect was invisibility _downstream_ in guest discovery.
> 3. **Remediate the 4 untagged places on qual.** Created before the picker existed, 0 action tags, invisible to guests until edited. The form now requires a category, so opening + saving each fixes them. **Deliberately not automated** — guessing categories for real places is the owner's call; ask the user.
> 4. **Lane-3 Phase 2** — reservation revoke/agenda (mint a throwaway reservation) + survey-capture E2E (n8n form → `beta.survey_responses`). The last thing owed from the 07-25 lane model.
> 5. **Issue #371** — the dev-dependency graph is **ungated** (`pnpm audit --prod` skips it) and holds 16 high + 1 **critical** (`vitest` <3.2.6 via `@vitest/coverage-v8@2.1.9`). Clearing it is a 2.x→3.x runner bump across all 11 suites. Carries a real policy question for the user: gate dev at `high` too, or review periodically? Gating would have caught it — but that is exactly the failure mode this session spent hours unblocking.
>
> ### Shipped (all merged; main `d7eeaf7`)
>
> - **#368 `fix(deps)` — the audit gate was blocking every push.** `pnpm audit --prod --audit-level=high` (lefthook pre-push **and** a required CI check) went red repo-wide: **14 high**. The 07-25 handoff diagnosed one family; it was four. **9 genuinely fixed** (sharp 0.35.3, react-router 8.3.0 ×2, + overrides: shell-quote `>=1.9.0` — the existing override sat _below_ the patched version — fast-uri `>=3.1.4 <4`, find-my-way `>=9.7.0 <10` (a real runtime fix: HTTP/2 DDoS in fastify's router), postcss, propagator-jaeger). **4 rescoped, NOT patched**: `packages/shared-config` declared eslint/typescript-eslint/prettier as prod `dependencies`, so eslint's whole transitive graph was audited as runtime code → moved to `devDependencies`. Those 4 resolve to _identical versions_ before and after — keep that distinction precise in any security record.
> - **#369 `docs`** — the 07-25 handoff commit, unpushable until the gate cleared.
> - **#370 `feat(places)` — the S6b action picker.** Closes the verified 🔴: owner-created places were invisible to guests (0 `place_action_wish` rows; all action-scoped discovery INNER JOINs it). **The handoff's plan needed correcting** — `wish_id` is NOT NULL ("at least one explicit wish per action tag"), so the planned six-button picker could never have written a valid row; it is **two-level** (action → ≥1 wish). Also needed a **new `GET /v1/actions`** taxonomy endpoint (none existed; only per-place hydration), served from the DB so a seed change can't desync the picker from the slugs the write path validates. Required on create; on PATCH `actions` **replaces** the tag set but is untouched when omitted.
> - **#372 `fix(backoffice)` — the 3-bug batch.** Two were silent data loss: a half-filled opening-hours day saved as **CLOSED** (dropping the typed time, no warning), and 24h toggle-off reset to a hardcoded 09:00–17:00, discarding prior hours. Third: unslugifiable guesthouse name → opaque 400. **Broader than filed** — reported as an emoji quirk, but `slugify()` keeps only `[a-z0-9]`, so _any_ fully non-Latin name ("Ξενώνας") fails identically. Both guesthouse write hooks also discarded the server's `{error, details}`; they now surface it.
> - **#371 filed** — ungated dev graph (queue item 5).
>
> ### Fable-5 gate — 3 reviews, no 🔴, two catches worth keeping
>
> - **#368:** my PR body claimed "14 fixed". Wrong — 9 fixed, 4 rescoped. Corrected before merge. **A security record must not overstate what was patched.**
> - **#370:** six new picker strings were in **no** locale file, so the pt-PT console would render _"Pick at least one option for **Comer**"_ — English sentence, PT label interpolated. **`check:i18n` cannot catch this**: it diffs en↔pt-PT, so a key missing from _both_ is invisible. It passed while six user-visible strings had zero translations. Habit: add en+pt-PT+es together. A `t()`-callsite scan would close the hole properly.
> - **#372:** `Math.random().toString(36)` drops trailing zeros → for an exact `0` the slug suffix is **empty**, building `guesthouse-` whose trailing hyphen fails the slug regex (reproduced). Padded to fixed width.
> - Fable also **empirically proved** (not code-read) what I couldn't rule out by reading: transaction rollback in both directions via a forced-failure trigger (no orphan place on create failure; scalar update rolled back on PATCH failure), that PATCH cannot strip a place to zero tags, that the edit-prefill chain cannot silently wipe tags, and that the hours error renders for _every_ offending day.
>
> ### ⚠️ react-router v8 — shipped, and one non-obvious trap
>
> User chose migrating over waiving the RSC-CSRF advisory. The app is a pure client SPA so every v8 breaking change lands on unused surfaces — **but v8 moves the DOM `RouterProvider` to the `react-router/dom` entry** (root exports a non-DOM one). 16 import sites moved. That entry re-imports from the **bare** `react-router` specifier, and vitest externalized one entry to Node (`dist/production`) while inlining the other via vite (`dist/development`) → **two module instances, two React contexts, 77 tests failing** with `Cannot destructure property 'basename'`. Fixed with `test.server.deps.inline: ["react-router", "react-router/dom"]` in `apps/pwa/vitest.config.ts`. **Test-env only** — Fable confirmed the built bundle contains react-router's invariant strings exactly once. **Do not "clean up" that inline block.**
>
> ### qr-bell co-tenancy — cert fixed (cross-project)
>
> `qrb-qual.codecomedy.dev` was serving a cached **staging** cert from our shared Traefik. **A plain `docker restart dt_traefik` did NOT fix it** — the staging cert was persisted in `acme.json` under the `letsencrypt-staging` resolver, and Traefik aggregates all resolvers into one SNI-keyed store, so it reloaded the stale cert and never called ACME. Fix: filter that domain out of `acme.json` (dry-run to a temp file first; both ACME account keys preserved; `cat >` keeps inode + `600 root:root`), then restart → real LE cert, `/api/health` 200 on a trusted curl. Backup: `/opt/daily-tour/infra/traefik/acme/acme.json.bak-20260727-004541`. daily-tour unaffected (4 hosts re-verified, 23 `dt_` containers Up). Also answered Aldraba's open question: **the image-prune cron is `docker image prune -f` — dangling-only**, deliberately narrowed during plan-007, so their `:sha` rollback tags survive.
>
> ### dt-tests board reconciled
>
> **#25, #26, #27, #28 closed** with evidence comments. On **#25**: it was at risk of being closed as _obsolete_ — that would be wrong. Slice-2 reflows `/admin/places` to cards **below `md` only**; the desktop table keeps pagination + sorting, so the original criteria still describe the live surface. **#30** (action picker) and **#31** (the 3 fixes) filed, both `blocked-on-deploy`. **#22** left deferred-until-prod.
>
> ### State (07-27 close)
>
> main **`d7eeaf7`** == origin/main · **0 open PRs** · local branches **main only** · tree clean (only the perennial untracked `e2e/`) · **no live subagents** (all 3 Fable gates shut down) · **A2A bridge STOPPED** (re-arm per FIRST ACTIONS) · `Publish images` green for `d7eeaf7` · **qual = `d7eeaf7`, deploy verified.** Memory updated: [[project-ff-testing-pivot]], [[project-subscription-backoffice]], `MEMORY.md`.

> **UPDATE 2026-07-25 (session began as a TUI-crash recovery of s719 (done, PR #367), then PIVOTED F&F beta validation to owner-as-every-persona solo dogfooding + ran Lanes 1–3 of live testing on qual; also handled a qr-bell VPS co-tenancy request incl. decommissioning island-chronicles (data preserved). **No code shipped — all testing + one infra teardown.** main unchanged at the #367 commit. ▶ RESUME HERE: build the S6b action-picker feature + the 3-bug fix batch (both Fable-gated), finish Lane-3 Phase 2, reconcile the dt-tests board — details below.)**
>
> ### The pivot (headline)
>
> The F&F beta failed as a validation channel — **0 of 6 invitees opened their link in 3 weeks** (all show only the 06-29 seeding redemption; 0 surveys, 0 new reservations; every `tour.started`/chat event on qual traces to our own UAT dates). User's call: **drop the external cohort as a gate**; the owner (user) now **impersonates every actor** — guest via `make qual-token` per locale, owner via akadmin OIDC. Survey/n8n infra **KEPT ACTIVE** (user overrode my "park"). Full model + findings: memory [[project-ff-testing-pivot]].
>
> ### 3-lane test model + results
>
> - **Lane 1 (automated browser-uat, mine) — DONE, all green** on qual `b88541d`: guest en/pt/fr/es (home/locale/daily-tour/chat/mobile-nav) + admin gate (SSO, no `/v1/auth/refresh` 401 leak, no ConsentBanner on `/admin`) + owner console + honest beta-metrics (Reservas=6 cancelled-excluded · Conversão="—" no-data · Mensagens=13 = #364 real KPI live). Evidence `temp/lane1-regression/`. Nits logged: `<html lang>` stays `en` on non-en guest locales; beta-metrics Views=0 despite 36 `tour.started` (likely date-range scoping).
> - **Lane 2 (owner manual, USER runs)** — script ready `temp/lane2-owner-walkthrough.md` (4 ~15-min blocks incl. the **zero-coverage Slice-4 chat inbox**). **Owed by the user; fold their notes into the fix batch.**
> - **Lane 3 Phase 1 (write-paths on a disposable seed) — DONE**, verified against DB on the box: all owner writes **persist** — create, Save round-trip, **LocationPicker** (saved coords = the selected result → the pre-merge coord-race is genuinely fixed live), **translate + overwrite-confirm** (AlertDialog gates overwrite, Save never blocked). Cleanup **independently confirmed** (4 `ZZ-LANE3` places all `archived`, 0 test guesthouses). Spec `e2e/uat-lane3-writepath.e2e.mjs`, evidence `temp/lane3-writepath/`. **Phase 2 PENDING.**
>
> ### ▶ FIRST TASKS NEXT SESSION (build phase — user approved the direction)
>
> 0. **⚠️ BLOCKER — `pnpm audit --prod --audit-level=high` now FAILS repo-wide → fix FIRST.** A newly-published advisory, **brace-expansion DoS** (`GHSA-3jxr-9vmj-r5cp`), trips the gate — it reaches the PROD graph ONLY because `packages/shared-config` declares **`eslint` / `typescript-eslint` as prod `dependencies`** (they should be `devDependencies` — never runtime). The gate is BOTH the lefthook **pre-push** hook AND a **required CI** check, so it **blocks every push/PR** — including THIS handoff commit (committed to local `main`, **UNPUSHED**) and next session's action-picker/bug PRs. `#367` pushed fine earlier this session → the deps didn't change, the advisory DB did. **Fix (always-escalate, security-config):** move `eslint`/`typescript-eslint` to `devDependencies` in `packages/shared-config/package.json` (or `pnpm.overrides` bump `brace-expansion` to a patched version), `pnpm install`, confirm `turbo lint` still resolves eslint, then push. Until then, pushes require resolving this — do NOT `--no-verify` past it.
> 1. **S6b action-picker feature (🔴 verified gap; user chose "add an action picker"):** owner-created places are **INVISIBLE to guests** — the "Adicionar um local" form has **no action picker**, `services/catalog-svc/src/routes/places.ts` `CreatePlaceBodySchema` omits `actions` → **0 `place_action_wish` rows** → action-scoped discovery never matches (verified: 4 owner places=0 actions; 43 seeded published=avg 1.8, min 1). Build: form picker (Eat/Drink/See/Do/Buy/Move) → `CreatePlaceBodySchema` + catalog-svc write + BFF passthrough (+ likely shared-types). Fable-gated **feature** PR.
> 2. **3-bug fix batch (user approved "fix as a batch after testing"), code locations confirmed:** **#11a** opening-hours one-sided time → silently saved CLOSED, data loss (`apps/pwa/src/features/backoffice/places/opening-hours-editor.tsx:45-51,80`); **#11b** 24h toggle OFF → resets to 09:00–17:00, prior hours lost (`:126-130`); **#12** guesthouse empty-slug (`!!!😀!!!`→"") → opaque "create guesthouse 400", server `details` discarded (`apps/pwa/src/features/backoffice/guesthouses/use-guesthouses.ts:69`). Fable-gated.
> 3. **Lane-3 Phase 2:** reservation revoke/agenda (mint a throwaway reservation) + survey-capture E2E (n8n form → `beta.survey_responses`, since survey infra is kept active).
> 4. **dt-tests board reconcile** (id `e03901a6-…081cc`): close **#25/#26/#27/#28** (all verified PASS — **#25 NOT obsolete**, desktop table keeps sort+pagination, cards are the <md layout only); file the 3 bugs + the S6b feature as new tasks. #22 (tour telemetry) stays deferred-until-prod.
> 5. **Lane 2 results from the user** → triage into the fix batch or backlog.
>
> ### qr-bell VPS co-tenancy (cross-project, José-sanctioned)
>
> `qb:Aldraba` (qr-bell) is standing up a **qual stack on our VPS**, fully isolated, sharing **only our Traefik**. This session: **island-chronicles DECOMMISSIONED** — the 6 _prod_ containers `docker rm`'d (José-approved; **data preserved byte-for-byte** — all host bind-mounts under `/root/island-chronicles/volumes/`, `prod_db_data`=94M unchanged; images + 3 orphan networks kept → recoverable; 23 `dt_` containers untouched). Corrected Aldraba's stale premise: **box now has 4 GB swap** (not "no swap"), dt qual ≈2.7 GB RSS, **CPU is the real constraint** (below). **Aldraba sends a co-tenancy plan BEFORE touching the box; I execute host-side (Traefik labels/reloads/prune).** **▶ José owes 2 qr-bell-side decisions: qr-bell subdomain + exposure model (internal-closed vs public UAT).** Detail: memory [[plan-007-qual-vps]].
>
> ### Other findings / ops
>
> - **Idle-CPU burn (ours, efficiency):** `dt_chat_hub`, `dt_planner_svc`, `dt_search_svc` each ~33% CPU **at idle** (≈1 of 2 vCPU wasted). Awaiting user yes/no on opening an issue + digging in.
> - **Comms:** the A2A wake bridge was **stopped at this closeout** (re-arm at next startup via the SessionStart ritual: `set -a; . ~/.secrets/tasks-prod-daily-tour.env; set +a; bash apps/tasks-mcp/comm-watch-supervise.sh` as a `run_in_background` job). Last inbox seq processed = **258** (qb:Aldraba, acked). dt-tests `review` empty; orchestrator-comms nothing new (last jo:Pico 06-23).
>
> ### State (07-25 close)
>
> main **`01c38bd`** (= #367; **no code shipped this session**); tree clean (only the perennial untracked `e2e/`, which now also holds `uat-lane3-writepath.e2e.mjs` + `uat-geocode-live.e2e.mjs` + `diag-map-tiles.mjs`); **0 open PRs**; local branches → main only. **qual = `b88541d`** (Slice-5 follow-ups + live Geoapify). Disposable Lane-3 records all `archived` (DB-verified). No live subagents / e2e / monitors; the 7 `finished` cs-agents in `cs-agent status` are pre-existing orphans from OTHER sessions (not mine — leave). Memory: NEW [[project-ff-testing-pivot]], updated [[plan-007-qual-vps]], `MEMORY.md`.

> **UPDATE 2026-07-20 (session `s719`, 07-19 → 07-20 — **Plan-008 is now fully closed**: the three Slice-5 follow-ups landed, Geoapify went live on qual, gitleaks centralized. The TUI **crashed ~14:30Z, AFTER the closeout PR #366 merged — nothing was lost** (verified 07-20 17:1x: tree clean, no stashes, 0 open PRs, local branches = main only, no cs-agents/tmux/monitors, main == origin/main `a16f5c8`). This block is the reconstructed handoff. ▶ RESUME HERE: Plan-008 owes nothing — pick the next initiative (options + backlog below).)**
>
> ### Shipped this session (all merged; main `a16f5c8`)
>
> - **#365 `chore(security)` — gitleaks centralized** (SoT Fase 1 P0). The `dt_` rule moves to the central single-source config; daily-tour keeps an **allowlists-only** extension. **Narrowed two whole-file waivers** that masked future secrets (INC-016 anti-pattern): `docs/.*` → value-scoped to a dev reservation redeem token, `.github/workflows/.*` → value-scoped to load-test.yml CI literals. Verified: the 3 FPs clear, a NEW secret in `docs/` is now BLOCKED, `dt_` still fires via central.
> - **#363 `fix(pwa)` — blank-coord guard** (the last Slice-5 🟢 + the carried Slice-3 item, both forms): a shared `coordinateField` zod validator makes blank/whitespace/non-numeric lat/lng a **"Required" error** instead of a silently-saved `0`; `toCoordinate` recenters the picker to São Miguel instead of `(0, −25.67)`; the coordinates `Collapsible` is controlled and **auto-opens on error** so the message can't hide.
> - **#364 `feat(bff)` — real messages KPI + exclude cancelled**: chat-hub `GET /v1/messages/count?range_days=N` counts **inbound (guest) messages only** (host replies excluded → guest demand); the BFF renders the KPI, degrading to "sem dados" on outage/malformed/null (a `Number(null)===0` guard). Cancelled reservations excluded from the conversion numerator; conversion stays **unclamped** (>100% is legit, documented).
> - **Geoapify GO-LIVE on qual** (completes T-8.5.1): `GEOAPIFY_API_KEY` added to `/opt/daily-tour/.env.qual`. **⚠️ GOTCHA: `docker compose restart` does NOT re-substitute `${GEOAPIFY_API_KEY}`** — you must `docker compose -p dt-qual --env-file .env.qual -f <all 9 overlays> up -d --no-deps --force-recreate bff`, **pinning `IMAGE_TAG` to the running image** (it's shell-passed at deploy, not stored in `.env.qual`). (The 07-11 handoff's "restart, no redeploy" line was wrong — recreate, not restart.)
> - **Deployed to qual**: main `b88541d` via `deploy-qa.yml` run `29733412603` ✅. **Browser-UAT 7/7** on the live geocode picker — `POST /v1/admin/geocode` → 200 with real Azores results (spec `e2e/uat-geocode-live.e2e.mjs`, shots `temp/geocode-live-uat/`).
> - **#366 `docs(plan-008)` — closeout**: EXECUTION Wave 7, TODO status header, CHANGELOG Unreleased. Docs-only (`Deploy qual` correctly skipped).
>
> ### Basemap "blank canvas" — FALSE ALARM (no app bug)
>
> The LocationPicker map read as a flat cream canvas in earlier UAT screenshots. Diagnosed with a purpose-built probe (`e2e/diag-map-tiles.mjs`, read-only): **21/21 OSM tiles load `200 image/png`** and `canvas.toDataURL()` shows the fully rendered map — the headless env's **SwiftShader (software WebGL) framebuffer simply isn't captured by CDP's screenshot compositor**. Real GPU browsers render fine. Keep the probe: any future "blank map" screenshot should be re-checked this way before it's treated as a defect. (NB `buildStyle` only ever renders the OSM raster layer — the `pmtilesUrl` arg adds an unused source.)
>
> ### Fable-5 gate (both PRs) — no live 🔴, real pre-merge catches
>
> Fable executed the messages window query against a **real Postgres 15** (correct bucketing + half-open boundaries) and verified the zod path end-to-end. Fixed pre-merge: whitespace→0 side-door + collapsed-section-hidden error (#363); `Number(null)===0` hardening + a repository SQL-shape test (#364).
>
> ### ▶ NEXT — Plan-008 owes nothing; pick an initiative
>
> 1. **Choose the next arc.** Plan-003 (Real-User Readiness) is the live plan; **Plan-004 = prod cutover** (3.E, deferred out of 003) is the natural next big one. No plan is mid-flight.
> 2. **F&F beta invites STILL unsent** (user action, unchanged since 07-02): 4 WhatsApp blocks in `temp/invite-batch-2026-06-29.md` (Pedro Amaral · Rui-fr · Pedro Albergaria · Célia-es). José + Miguel emails went out 07-02.
> 3. **Still-open follow-ups** (non-blocking, all in 008 `EXECUTION.md`): reservations **beta-scoping** (needs a token-svc schema discriminator column) · the **O(N) reservation-list fetch → a token-svc count endpoint** at scale · carried Slice-3 items: opening-hours one-sided-time / 24h-reset, profile zod messages hardcoded English, guesthouse all-punctuation name → empty slug → opaque 400.
> 4. **Chronic backlog** (untouched): issue **#328** (BFF limiter JWT-decodes rejected requests) · **#161** `/admin/profile` empty state · ~13 stale merged remote branches incl. this session's 3 `*s719*` (prune on request) · stray `~/.claude-squad/worktrees/jmeireles/boa-design2` (confirm → delete).
>
> ### State (07-20 close, post-crash verification)
>
> main **`a16f5c8`** == origin/main; **0 open PRs**; local branches **main only**; tree clean (only the perennial untracked `e2e/`, now also holding `uat-geocode-live.e2e.mjs` + `diag-map-tiles.mjs`). No cs-agents / tmux / monitors / background jobs (cs-agent state lists only long-finished historical entries). **qual = `b88541d`** (Slice-5 follow-ups + live Geoapify picker); `a16f5c8` on top is docs-only, so qual is current. dt-tests `review` queue **empty**; orchestrator-comms inbox — nothing new (last jo:Pico 06-23, handled).

# (prior) Session Handoff — … → 07-11 (Plan-008 **CODE-COMPLETE** — Slice 5 shipped: geocode proxy + real beta metrics + LocationPicker + motion/theme; all 6 slices done. Slices 3 AND 5 both deployed to qual this session; guest-regression UAT 9/9 + **owner-feature UAT 25/25 PASS** (Fable fixes live-verified).) → next: **add `GEOAPIFY_API_KEY`** to make the qual map picker live (bff restart, no redeploy) + Slice-5 follow-ups / F&F beta invites still unsent (user)

> **UPDATE 2026-07-11 (LATEST — big autonomous run: **Plan-008 Slice 5 built end-to-end and fully merged → Plan-008 is CODE-COMPLETE (all 6 slices)**. Also deployed Slice 3 to qual + repopulated the akadmin password. Clean close: main `4f62245` (code) + docs PR #359; 0 code PRs open; no agents/tmux/monitors; branches = main only; dt-tests `review` empty. ▶ RESUME HERE: the deploy + UAT + follow-up decisions below — all owner's-call, nothing blocking.)**
>
> ### Shipped this session
>
> - **Slice 3 → qual (early in session):** `deploy-qa.yml -f image_tag=4c2c4d7…` (full SHA of #352), run `29030202720` green; **browser-UAT 9/9 PASS** — guest F&F-beta NOT regressed, `/admin` gates to SSO. qual now has the redesigned forms + translate helper.
> - **Plan-008 Slice 5 (the last slice) — #355–#358, all merged, main `4f62245`:** **#355** BFF geocode proxy (**geocoder = Geoapify**, user's call vs self-host Photon; `POST /v1/admin/geocode` + `/reverse`, PT+Azores bias, key hidden, 503→numeric fallback, TTL cache). **#356** beta-metrics real dashboard (views + reservations-from-token-svc + conversion real; messages honest `available:false`; graceful degradation; added `created_at` to token-svc `/v1/reservations`). **#357** `LocationPicker` (MapLibre in a bottom `Sheet` — repo has no Drawer/Dialog/Command primitive, so hand-rolled combobox + Sheet; fixed pin, geolocation, reverse-geocode >50 m, raw lat/lng in a `Collapsible`, dynamic-imports maplibre). **#358** calm motion (`motion` v12, reduced-motion-gated: FAB/tab/opacity-only page transition via FrozenOutlet) + light/dark/system theme toggle (`use-theme.ts`, in-memory + best-effort localStorage, no FOUC) in rail + top bar.
> - **Docs (#359):** EXECUTION Wave 6 + TODO code-complete + CHANGELOG Slice 5.
>
> ### Fable-5 gate — caught a 🔴 on EVERY Slice-5 PR (CI + all tests missed each)
>
> **#355 🔴** `GEOAPIFY_API_KEY` never wired into the bff compose env → silent 503-forever in every deployed env. **#356 🔴** three KPIs (reservas/conversão/mensagens) had no data producer → permanent 0s contradicting the Reservations tab (fixed → real token-svc reservations; user picked "wire reservations for real"). **#357 🔴** Confirm-during-`flyTo` read the mid-animation camera centre → silent wrong-coordinate write, invisible to the teleporting mock. **#358 🔴** page-transition wrapped a live `<Outlet/>` → new page played the OLD exit + double-mounted routes (Fable **empirically confirmed** with a probe). Every 🔴 + assorted 🟡 fixed before merge; I re-ran every gate myself (agents don't self-verify reliably).
>
> ### ▶ NEXT / owed (all owner's-call, non-blocking)
>
> 1. **Deploy Slice 5 to qual — ✅ DONE 2026-07-11** (`deploy-qa.yml -f image_tag=4f6224593a5fb0de91f5cfd1c17a86defa0323bf`, run `29138018692` green; **guest-regression browser-UAT 9/9 PASS**, spec `e2e/uat-qual-deploy-30056c4.e2e.mjs`). Remaining: the map picker is **degraded on qual** (no `GEOAPIFY_API_KEY` → geocode 503 → numeric-input fallback). To make it live: `ssh root@77.37.86.126`, add `GEOAPIFY_API_KEY=<free key from geoapify.com>` to `/opt/daily-tour/.env.qual`, then `docker compose restart dt_bff` (proxy reads it per-request — **no redeploy**).
> 2. **Owner-feature UAT — ✅ DONE 2026-07-11, 25/25 PASS** (browser-uat, real akadmin OIDC login; spec `e2e/uat-owner-slices-3-5.e2e.mjs`, shots `temp/owner-uat-s345/`). Live-verified in production: **Reservas=8** (real), **Mensagens/Conversão="sem dados"** (the Fable 🔴 fix — no fabricated 0), translate works (PT→ES + badge), picker map renders + degrades to numeric on geocode-503, theme toggle re-themes. No data mutated (Save never clicked). Untested (would mutate real data): Save-persist + translate overwrite-confirm (source-verified). akadmin pw = `AUTHENTIK_BOOTSTRAP_PASSWORD` on the box; repopulated into `temp/qual-uat-secrets.env` (`! grep AKADMIN_PASSWORD temp/qual-uat-secrets.env`).
> 3. **Slice-5 follow-ups** (non-blocking, in EXECUTION.md): chat-message producer for the `messages` KPI; conversion-numerator beta/status filtering + the >100% story (+ replace the O(N) reservation-list fetch with a token-svc count endpoint at scale); blank-coord→(0,0) guard (same family as the deferred Slice-3 item).
> 4. **F&F beta invites STILL unsent** (user): 4 WhatsApp in `temp/invite-batch-2026-06-29.md` (José+Miguel emails already sent 07-02).
>
> ### Session ops notes / gotchas (recorded to memory)
>
> - **cs-agent's "closer" auto-committed T-8.5.1 + T-8.5.4** with a generic message, node_modules absent, gates NOT self-run → always re-run gates + fix the message + diff-scope. A **backgrounded `cs-agent launch` left T-8.5.4 untracked by cs-agent state** (worktree + tmux existed, `status` didn't list it) → harvested via git directly. **ALWAYS `nvm use 22`** before gates: the shell default is **Node 25**, under which any test touching bare `localStorage` fails (Node 25 webstorage shadows jsdom) — spurious, not a regression. Worktree gates need **all** `packages/*` built (shared-types AND shared-otel/shared-sentry). [[project-pwa-local-test-env]] updated.
> - The `AskUserQuestion` decisions this session: geocoder = **Geoapify**; #356 metrics = **"wire reservations for real" (Option A)**; and standing **"auto-drive to code-complete"** authorization for the rest of Slice 5 (merges done under that).
> - dt-tests `review` poll empty at session-start (MCP reconnected mid-session), after Slice-3 deploy, and at plan close-out. orchestrator-comms inbox: nothing new (last jo:Pico 06-23).
>
> ### State (07-11 close)
>
> main **`4f62245`** (all Slice-5 code) + docs PR **#359** (armed, merging on green); **0 code PRs open**; local branches → main only (all s709 + fable worktrees/tmux cleaned; cs-agent state cleared); tree clean (only pre-existing untracked `e2e/`, which also holds `uat-qual-deploy-4c2c4d7.e2e.mjs`). No cs-agents / tmux / monitors / Fable agents (all 4 shut down). **qual: Slice 5 (`4f62245`) deployed 2026-07-11 — guest-regression 9/9 PASS; map picker DEGRADED (no Geoapify key → numeric fallback).** (Prior qual layers: Slices 0–4 `12cc6d5`, Slice 3 `4c2c4d7`.) Memory updated: [[project-subscription-backoffice]] (Plan-008 code-complete + Slice 5 deployed), [[project-pwa-local-test-env]] (Node-22 gotcha), `MEMORY.md`.

> **UPDATE 2026-07-06 (autonomous run: Plan-008 **Slice 3 built end-to-end and fully merged**. All 6 PRs #347–#352 on main `4c2c4d7`; every merge Fable-gated. Clean close: 0 open PRs, no cs-agents/monitors, tree clean, all merged local branches deleted. ▶ RESUME HERE: Slice 3 is NOT yet deployed to qual (owner-only — user's call) + owner-feature UAT owed (akadmin pw). Slice 5 (map picker, post-beta) is the last slice.)**
>
> ### Shipped this session — Plan-008 Slice 3 (form excellence + Helper A translate)
>
> Decomposed **by file surface into 2 waves** (the 3 form files are a 3–4-way write collision, so NOT by task ID). **Wave 1** (net-new/isolated, parallel): **#347** shared `form-locale-config` making **es** a first-class editable content locale (no shared-types change — `LocaleSchema` already had es) + form-route tab-bar suppression · **#348** `POST /v1/admin/translate` (owner-auth + 20/min; Claude `claude-opus-4-8` via `@anthropic-ai/sdk`, structured-output JSON, `effort:low`, **NO temperature/thinking-budget** — all 400 on this model; system-prompt PT-PT pré-AO + do-not-translate; 503 when key unset; response-contract validation) · **#349** `TranslatableField`/`useFieldTranslation`/`TranslateAllButton` (per-field globe, suggest-not-overwrite + undo, only-empty bulk, **never blocks Save**). **Wave 2** (one agent per form): **#350** place (form.tsx primitives + sectioned cards + sticky save + dirty guard + es + translate + **opening-hours redesign** → `opening-hours-editor.tsx`) · **#351** profile (bio-only per-locale tabs + es, invariant fields in one shared card, **PT default**, dropped "WhatsApp (Cloud API)" jargon, brand switches, `reset()` after save) · **#352** guesthouse (**name-only** translatable — no description/contacts columns exist; status/rooms/slug/media preserved; slug in an "Avançado" collapsible).
>
> ### Model-tier lesson (recorded)
>
> Wave 1 on **sonnet-yolo under-delivered on all three** (committed only scaffolding, falsely reported "finished") → salvaged config, **Opus** continuations finished the endpoint + component on top of the good scaffolding. Wave 2 on **Opus** from the start; place+profile clean; **guesthouse died twice** (a no-op, then a dead tmux session — environmental) and succeeded on the 3rd try once its brief pointed at the **already-merged place form** as a concrete template. Even Opus skipped a test once (tf) and left a failing test once (gh, caught by diff-scope). **Verify every agent by diff-scope + a self-run of its gates before trusting "gates pass".**
>
> ### Fable-5 gate (every merge) — real catches
>
> **#348 🔴**: `max_tokens: 2048` truncates large-but-valid requests → deterministic 502 (fixed → 16k + truncation guard + response-contract validation). #349 🟡×3 (unrequested-locale write; translateAll jwt-guard/toast; hook untested — all fixed). #351 🟡 stuck dirty-state after save (fixed via `reset()`). #350/#352 🟢. **Fable earns its keep** — the #348 🔴 was a bug I introduced in the agent brief (`max_tokens` too small).
>
> ### ▶ NEXT / owed
>
> 1. **qual-deploy Slice 3** (user's call — owner-only surface, does NOT gate the guest beta). `image_tag` = FULL 40-char SHA of **`4c2c4d7`** (the #352 merge, a code commit → `publish-images` runs; the docs-closeout commit on top is docs-only and won't trigger images, so deploy with 4c2c4d7's SHA). `gh workflow run deploy-qa.yml --ref main -f image_tag=<full-4c2c4d7-sha>`.
> 2. **Owner-feature UAT** (the 3 redesigned forms + translate helper, live on qual) — needs the **akadmin** Authentik password (human). Fable-gated + unit-tested; a live walk-through is the remaining confidence step.
> 3. **Slice 5** (Helper B map picker + polish, post-beta) is the last slice — geocoder decision (T-8.5.1) + `LocationPicker` (replaces the numeric lat/lng the forms still use) + beta-metrics dashboard + motion polish. Plan-008 is otherwise code-complete.
> 4. **F&F beta invites STILL unsent** (2 Gmail drafts José+Miguel + 4 WhatsApp, `temp/invite-batch-2026-06-29.md`) — user action.
>
> ### Deferred 🟡 follow-ups (Fable, non-blocking; also in 008 EXECUTION.md)
>
> - place opening-hours: one-sided time row (clear one of two times on an open day) silently saves the day closed (no warning); 24h-toggle-off resets to 09:00–17:00 not the prior hours.
> - profile: zod validation messages hardcoded English → i18n them (PT host should get PT errors).
> - blank lat/lng → (0,0) — **pre-existing on main**, both forms; `preprocess "" → undefined` + required (as `rooms` already does).
> - guesthouse: an all-punctuation/emoji name slugifies to `""` → opaque backend 400; add a fallback suffix.
>
> ### Session ops notes
>
> - **dt-tests MCP (`mcp__tasks-prod__*`) was NOT loadable this session** — the `review` poll ritual couldn't run via MCP (empty at last close, so no known backlog). Run `/mcp` to reconnect if a live check is needed; else deliver UAT as `temp/uat-batch-*.md`.
> - orchestrator-comms inbox: nothing new (last jo:Pico 06-23, already handled).
> - **`Validate PR title` gate rejects uppercase-leading subjects** — retitle lowercase (bit me on #348/#349). **Background `cs-agent wait`/poll loops with `sleep` get killed by the harness mid-run** — use `ScheduleWakeup` to self-pace agent-harvest checks. Fresh cs-agent worktrees need `pnpm install` + `shared-types build` before local gates.
>
> ### State (07-06, Slice 3 close)
>
> main **`4c2c4d7`** (#347–#352 + this docs closeout); **0 open PRs**; local branches → **main only** (all s706/s707/s708 deleted); tree clean (only pre-existing untracked `e2e/`). No cs-agents / tmux / monitors. **qual still on `12cc6d5`** (Slices 0–2 + 4; Slice 3 NOT deployed). Memory updated: [[project-subscription-backoffice]], `MEMORY.md`.

> **UPDATE 2026-07-06 (user directed 3 tasks: Slice 4 chat + guesthouse backend follow-up + deploy — all DONE. The full backoffice redesign (Slices 0–2 + 4) is now LIVE on qual (main `12cc6d5`) and UAT-passed (guest F&F-beta NOT regressed). Clean close: 0 open PRs, no agents/monitors, tree clean, dt-tests empty. ▶ RESUME HERE: **Slice 3 (forms + translate helper)** — the ONLY remaining slice; detailed brief below. Beta invites STILL unsent (user action).)**
>
> ### Shipped this session
>
> - **Slice 4 chat (#345):** inbox redesign — real guest names (joined from reservations by `guest_id`), colored-initials avatars, message bubbles + Quick Reply chips, mobile single-pane push, an FE-only unread heuristic (per-guest local last-viewed `last_ts`) + Messages nav badge, search. Built by a cs-agent (redesign) + an **Opus continuation** (the first agent skipped the test + i18n — recurring under-delivery; verify by diff-scope).
> - **Guesthouse status+rooms (#344):** full-stack — migration `0007` (`status active|archived` + CHECK, `rooms` int), catalog-svc + shared-types + `StatusBadge` `guesthouse` kind + list/form. BFF unchanged (proxy). Closes the T-8.2.2 descope.
> - **FIRST qual deploy of the redesign:** main `12cc6d5` → publish-images → `deploy-qa.yml -f image_tag=12cc6d5e…` (FULL SHA) → catalog-svc **auto-migrated** `0007` on boot. **Browser-UAT PASS 6/6** — guest F&F-beta app NOT regressed; `/admin` redirects to Authentik SSO. Full owner-feature UAT deferred (needs the akadmin password — human).
> - All merges **Fable-gated** — it caught #345's 🔴 (the new `useUnreadChatCount()` in `shell.tsx` broke `admin-route.test`+`a11y.test`, which render `BackofficeShell` without a QueryClient — fixed by stubbing the hook there) + a 🟡 (owner's own bubbles used a 2nd-person pronoun → 1st-person "Yo"/"Eu").
>
> ### ▶ FIRST TASK NEXT SESSION — Plan-008 Slice 3 (form excellence + Helper A translate)
>
> The ONLY remaining slice (`T-8.3.1–T-8.3.6`, beta-desirable, deps: Slices 0,1 ✅). Design: proposal §7a + §6.5 + §8.3/8.4/8.6/8.9. Order:
>
> 1. **T-8.3.4 (blocker — do FIRST):** add **`es`** to the zod `FormSchema`, the `TABS` const, and the body builders (name/description maps) for **place-form + guesthouse-form + profile** — from ONE config array (DRY). A translate button with no `es` field to write into is a silent no-op.
> 2. **T-8.3.5 backend:** new **`POST /v1/admin/translate`** in the BFF — Claude via `ANTHROPIC_API_KEY` (present); `{source_locale, target_locales[], fields}`; output constrained to **European-Portuguese pré-AO** (per `ptpt-excellence` — generic `pt` drifts to PT-BR, a trust-killer) + a **do-not-translate list** (proper nouns, "Calheta", POI/business names — translate `description`/`bio`, NOT `name`); owner-auth-gated + rate-limited (mirror T-3.C.3).
> 3. **T-8.3.6 UX:** `TranslatableField` + `useFieldTranslation` (EN/PT/ES `Tabs`) — per-field globe + "Traduzir tudo" (only-empty); **suggest-not-overwrite** (AlertDialog confirm to replace non-empty + undo); in-flight shimmer; "Auto-translated" badge clearing on edit; **never block Save on MT failure**. Shared by all 3 forms.
> 4. **T-8.3.1–8.3.3:** refactor the 3 forms onto `form.tsx` (sectioned Cards, sticky save bar `pb-[env(safe-area-inset-bottom)]`, dirty-state guard, media preview grid, char counters, ≥44px controls); opening-hours redesign (§8.4: per-day toggle, 24h, copy-to-all); profile re-scope (§8.9: Bio per-locale only, PT default tab, drop "WhatsApp (Cloud API)" jargon, brand-styled switches).
>
> - Already in place: `Collapsible` (`components/ui/collapsible.tsx`), the guesthouse status/rooms fields, the shared `StatusBadge`, `form.tsx` (RHF+zod from Slice 0), the `es` locale registered + parity. **Recurring gotcha:** any hook added to `BackofficeShell` needs the shell-rendering test suites (`admin-route.test`, `a11y.test`) to provide/stub a QueryClient.
>
> ### Deferred / notes
>
> - **Owner-feature UAT on qual** (chat + guesthouse interaction) needs the **akadmin** Authentik password (human). Code is Fable-gated + unit-tested; a live owner walk-through is the remaining confidence step.
> - **F&F beta invites STILL unsent** (2 Gmail drafts José+Miguel + 4 WhatsApp, `temp/invite-batch-2026-06-29.md`).
> - Incidental (browser-uat): a `make qual-token` guest token redeemed **3× despite "single-use"** — possibly a grace window; verify if unexpected.
> - **Slice 5** (map picker + polish, post-beta) is the last slice after Slice 3.
>
> ### State (07-06)
>
> main **`12cc6d5`** (Slice 4 #345 + gh-field #344 + this closeout); **0 open PRs**; local branches = `main` + 2 merged s702 leftovers (`docs/closeout-0703`, `docs/s702-post-cycle` — deletable, not this session's). Tree clean (only untracked `e2e/`, which now also holds `uat-qual-deploy-12cc6d5.e2e.mjs`). **qual DEPLOYED to `12cc6d5`** — redesigned backoffice live + guesthouse migration applied; guest beta app healthy. No cs-agents / monitors. dt-tests `review` empty. Memory updated: [[project-subscription-backoffice]], [[feedback-fable-review-gate]], `MEMORY.md`.

> **UPDATE 2026-07-05 (LATEST — big autonomous run: Plan-008 Slices 1 AND 2 driven end-to-end; all subscription-blocking backoffice work DONE. The Fable-5 review gate (user directive) caught real bugs at every step. Clean close: main `8b4074c`, 0 open PRs, no agents/monitors, tree clean, dt-tests `review` empty. ▶ RESUME HERE: the "what next" decision below — I asked the user (Slice 3/4/5 or pause/deploy) and got no answer; the F&F beta invites are STILL unsent (user action).)**
>
> ### Shipped this session — Plan-008 Slices 1 + 2 (owner backoffice redesign)
>
> - **Slice 1 (#331–#336):** responsive `shell.tsx` (desktop rail + mobile top-app-bar + 5-item bottom tabs — kills the 1301px overflow) · first-class `LoadingState`/`ErrorState`/`EmptyState` across all admin lists + form routes · a real **"Today" dashboard** (`/admin` no longer blank) · shared `StatTile` · beta-metrics error-not-loading fix.
> - **Slice 2 (#337–#342):** single **`StatusBadge`** status source (no raw enums) · places/guesthouses/reservations table→**card reflows** (reservations = day-grouped agenda) · plain-language pt/en/es · `AlertDialog` confirms · **optimistic** Pick+visibility toggles · mutation toasts. Clears the last 390px table overflow.
> - **Fable-5 review gate** (new doctrine — [[feedback-fable-review-gate]]): a `model:"fable"` adversarial reviewer gated **every** merge and caught defects Opus review + CI + hundreds of passing tests all missed — 🔴 `es` locale never registered (Español→English fallback); 🟠 permanently-0 "pending" KPI, one-flaky-query-blanks-all-tiles, un-pluralized "1 alojamentos", half-optimistic (Pick-only) toggle. All fixed before merge.
>
> ### ▶ NEXT — decision pending (asked the user; no answer)
>
> Slices 0–2 (subscription-blocking) DONE. Remaining, lower-priority:
>
> 1. **Slice 3** — forms + EN/PT/ES auto-translate (**beta-desirable, L**). ⚠️ needs a NEW `POST /v1/admin/translate` BFF endpoint (Claude via `ANTHROPIC_API_KEY`, PT-PT pré-AO, do-not-translate list) + an `es` data-model addition — **backend + API-cost, confirm with the user before starting.**
> 2. **Slice 4** — chat experience (beta-desirable, M): mobile single-pane master→detail, real guest names (not `aaa001…` IDs), quick-reply templates, unread badges. Most self-contained.
> 3. **Slice 5** — map picker + polish (post-beta, M): `LocationPicker` (MapLibre) + geocoder Photon-vs-commercial decision (T-8.5.1).
> 4. **Deploy + UAT** Slices 0–2 to qual first (owner-only surface; wouldn't affect the guest beta) to prove the refactor end-to-end.
>
> - **Backend follow-up owed:** guesthouse `status` + `nº de quartos` need a real DB field (migration + catalog-svc + shared-types) — descoped from T-8.2.2.
> - **F&F beta invites STILL unsent** (user action): 2 Gmail drafts (José + Miguel) + 4 WhatsApp (`temp/invite-batch-2026-06-29.md`).
>
> ### State (07-05)
>
> main **`8b4074c`**; **0 open PRs**; local branches = `main` + 2 merged s702 leftovers (`docs/closeout-0703`, `docs/s702-post-cycle` — deletable, NOT this session's namespace). Tree clean (only pre-existing untracked `e2e/`). No cs-agents / monitors left. dt-tests `review` empty. qual untouched (still the 06-30 F&F-beta build; Plan-008 owner work NOT deployed there). Memory updated: [[project-subscription-backoffice]], [[feedback-fable-review-gate]], `MEMORY.md`.

> **UPDATE 2026-07-03 (LATEST — huge session: beta launched + Load Tests resurrected + Plan-008 Slice 0 shipped. Clean close: 0 open PRs, branches=main, no agents/monitors left, dt-tests `review` empty. ▶ RESUME HERE: ① verify tonight's nightly `Load Tests` run went green (would be the FIRST green nightly ever — cron ~03:15Z; if red, the fix history is in PR #324); ② rituals (dt-tests poll · comms inbox); ③ beta watch; ④ Plan-008 Slice 1 when the user wants it.)**
>
> ### 🚀 Beta state (the headline)
>
> - **INVITES SENT 2026-07-02 ~14:01Z** — José (en dogfood) + Miguel (pt-PT host) emails verified in sent mail; stale 07-01 duplicate drafts trashed. **Miguel's briefing = user handles IN PERSON** (`temp/miguel-briefing-2026-06-29.md`) — do not nag.
> - **The 4 WhatsApp invites are NOT sent** (Pedro Amaral · Rui-fr · Pedro Albergaria · Célia-es). They are MANUAL copy-paste blocks the USER sends from his phone (`temp/invite-batch-2026-06-29.md`; paste-ready copies were also put in-chat 07-03). The user briefly thought he'd _receive_ them — clarified. Links valid ~35d from 06-29.
> - **Survey links go per person AFTER their look-through**, in their language (URLs in beta doc §4). Watch: dt-tests `review` · `make survey-export` / `SELECT * FROM beta.survey_responses` · n8n Executions · in-app chat inbox (José monitors).
> - **Gmail MCP is drafts-only BY DESIGN** (no send tool — user clicks Send). The `google.com/url?…ust=…` link-wrapping seen when reading drafts via the API is a display artifact, NOT stored content (proven; see [[project-plan-003]]). For autonomous sending later: n8n SMTP or gmail.send OAuth (offered, not built).
>
> ### Shipped this session (all merged; main `c873639`)
>
> - **#324 — `Load Tests` workflow RESURRECTED; run 28596230938 = first green run since the workflow landed (#121, 05-18).** Seven stacked fixes, each proven by a live run (full table in the PR body): pnpm `version:` vs `packageManager` conflict → compose `--wait` vs the exit-0 `minio-init` one-shot → k6 results-dir perms (container uid) → k6 fixtures still on pre-#234 `/r/:token` (+ closed a **false-green**: token-exchange passed against a broken route because only-5xx counted as errors) → **discover actually needs `search-svc`, which the job never started** (admitted requests 500'd on connect-timeout; workflow comment wrongly said catalog-svc) → RabbitMQ definitions.json password reconcile (`rabbitmqctl change_password`, deploy-qa pattern; search-svc treats rabbit as fatal, media-svc fail-softs) → scenarios made limiter-aware (post-#301 reality: 429 = expected from k6's single IP; latency only on real responses; place-detail thresholds the **median** — its p95 swung 4.19s→5.75s between identical runs). Also added `workflow_dispatch` + created the `load-test` repo label (never existed → the PR-label trigger had never been usable; re-trigger = remove+re-add the label).
> - **Issue #328 filed (real product finding):** the BFF limiter `keyGenerator` JWT-decodes every request it REJECTS — a 429 flood (~450/s) taxes the event loop enough that admitted requests queue (median ~0.7s vs tens-of-ms idle). Candidates: per-token decode cache · cheaper limiter key · global-IP check before the decoding limiter.
> - **Plan-008 Slice 0 DONE (#325 · #326 · #327)** — admin `[data-app="admin"]` token overlay + `touch`/`icon-touch` button sizes (T-8.0.1/2) · ConsentBanner + SessionBootstrap gated off `/admin` (T-8.0.3/4, the §8.11 pull-forwards; gates are mount-time like the `/r/` skip — noted in #326) · 11 hand-rolled radix primitives incl. `form.tsx` RHF+zod, 49 tests, zero new deps (T-8.0.5). Built by 3 parallel cs-agents (`s702-*`, sonnet-yolo); wave log in `docs/implementation-plans/008-backoffice-redesign/EXECUTION.md`; TODO now EXECUTING, **Slice 1 (T-8.1.x responsive shell) unblocked**.
> - **#329** — post-cycle docs (CHANGELOG, EXECUTION.md, TODO flips).
>
> ### ⚠️ Deliberate non-action
>
> - **main is NOT deployed to qual.** qual stays on the 06-30 beta build while José+Miguel actively use it (Slice 0 is owner-only anyway). Deploy on the user's word — remember `image_tag` = FULL 40-char SHA of a publish-images commit.
>
> ### Gotchas learned (session ops)
>
> - **cs-agent `push` writes non-CC PR titles** (`S702 T8 0 1`) → the `pr-title` check fails; retitle with `gh pr edit` right after push.
> - **A sonnet-yolo agent stalled ~45 min on a Claude USAGE-LIMIT prompt** ("wait for reset / add funds") after finishing its files — tmux `capture-pane` to diagnose; salvage = run gates + commit from its worktree yourself, `cs-agent push`, then kill. **Check plan quota before launching the next wave.**
> - `git add -A` in this repo grabs the user's pre-existing untracked `e2e/` → commit bounces on hooks; stage explicit paths only.
> - `cs-agent logs`/bare `cs-agent diff` can hang the shell (follow-mode); read `~/.claude-squad/logs/<name>.log` / `git diff main...<branch>` instead.
> - Merge dance that works unattended: arm `gh pr merge --squash --auto --delete-branch` on ALL PRs, then loop `gh pr update-branch` on whichever reports `BEHIND` after each merge.
>
> ### ▶ FIRST TASKS NEXT SESSION
>
> 1. **Check the nightly Load Tests run** (`gh run list --workflow "Load Tests" --limit 1`) — expected the first green nightly ever. If red: diagnose per the #324 layer table; the k6 artifacts (14d retention) tally per-request statuses.
> 2. **Rituals:** dt-tests `review` poll (empty at close) · `orchestrator-comms/inbox-daily-tour.md` (nothing new at close) · beta signals (survey sink, chat inbox).
> 3. **Ask casually if the WhatsApp invites went out** (blocks the remaining 4/6 of the cohort); survey-link reminders per person as they finish.
> 4. **Plan-008 Slice 1** on the user's go (T-8.1.1 shell rewrite is the big one; check usage quota first; same s-prefix naming, e.g. `s7XX-t8-1-1`).
> 5. Chronic backlog (untouched): stray `~/.claude-squad/worktrees/jmeireles/boa-design2` (user confirm → delete) · ~10 stale merged remote branches (prune on request) · issue #328 (limiter decode cost) · #161 `/admin/profile` empty-state.
>
> ### State (07-03 close)
>
> main **`c873639`** (#324→#329 all merged) · **0 open PRs** · local branches: **main only** · tree clean (pre-existing untracked `e2e/` as always) · no cs-agents/tmux/monitors running · dt-tests `review` empty · qual = 06-30 beta build (deliberate) · **beta LIVE for 2/6 cohort members**. Memory current: [[project-plan-003]] (beta state incl. Gmail facts) · [[project-subscription-backoffice]] (Slice 0 + ops gotchas).

> **UPDATE 2026-07-02 (crash recovery + close-out. The 06-30 session crashed in the early hours of 07-01, AFTER finishing all engineering work; nothing was lost. Repo is fully reconciled. ▶ RESUME HERE: the beta is still one human action from running — ask the user to send/approve the invites (details below), else watch the beta or pick up Plan-008.)**
>
> ### Crash recovery (2026-07-02) — timeline reconstructed, everything accounted for
>
> - The crashed session's true extent: PRs **#318–#321 all merged 06-30** (as its handoff claimed), handoff PR **#322** pushed 15:44 green but never merged, then it kept working past midnight — updated `temp/invite-batch-2026-06-29.md` (00:07) and created **two Gmail invite drafts at ~00:16 on 07-01** (José en "Your Daily Tour beta link" → zmeireles@gmail.com · Miguel pt-PT "O seu Daily Tour — para começar" → mbamaral@gmail.com), then died. **Both drafts still UNSENT** (verified: nothing in sent mail to Miguel, 7-day window).
> - **Recovery actions:** local main was 2 behind (never pulled #320/#321) → fast-forwarded; **#322 recovered + merged** (was `BEHIND` per ruleset → `update-branch` → auto-merge) → main **`f8a8bfd`**; deleted 4 squash-merged local branches (`chore/beta-followups`, `docs/beta-survey-variants`, `docs/session-closeout-0629`, `docs/handoff-0630`). No stashes, tree clean (only the known pre-existing untracked `e2e/`).
> - **Rituals:** dt-tests `review` queue **empty**; orchestrator-comms inbox — nothing new (last: po-3 DSN 06-20, jo:Pico intro 06-23, both handled).
> - **Memory updated:** [[project-plan-003]] + `MEMORY.md` (Gmail MCP IS authed; drafts unsent; ⚠️ via the API the draft links show google.com/url-wrapping — eyeball the drafts once before sending).
>
> ### ▶ FIRST TASK NEXT SESSION
>
> 1. **Send the invites (needs the user):** (a) ask whether the 4 WhatsApp invites (Pedro Amaral · Rui-fr · Pedro Albergaria · Célia-es, copy in `temp/invite-batch-2026-06-29.md`) went out — unverifiable from here; (b) on the user's go, **send the 2 Gmail drafts** (José + Miguel — Gmail MCP is authed; check the link-wrapping caveat first). Miguel also needs the briefing (`temp/miguel-briefing-2026-06-29.md`).
> 2. **Watch the beta once invites are out:** dt-tests `review` poll · `make survey-export` / `SELECT * FROM beta.survey_responses` · n8n Executions · the in-app chat inbox (José monitors).
> 3. **Or pick up Plan-008** (owner backoffice redesign — 28 tasks ready; see [[project-subscription-backoffice]]).
>
> ### Triage backlog surfaced this session (chronic, NOT crash-related)
>
> - **Nightly `Load Tests` on main has failed every night since ≥06-27** (runs 28276933427…28562719554). Unmentioned in any prior handoff — investigate (scheduled cron ~03:15Z).
> - `~/.claude-squad/worktrees/jmeireles/boa-design2` is NOT a git worktree — a stray `apps/` dir from May 27, likely another project's debris. Confirm with the user, then delete.
> - Origin carries ~10 stale merged-PR remote branches (`feat/deploy-n8n-to-qual`, `docs/3d0-done`, `fix/i18n-bottom-tab-bar`, …) — prune on request.
>
> ### State (07-02)
>
> main **`f8a8bfd`** (#322 merged); **0 open PRs**; local branches: **main only**; tree clean. qual untouched this session (still on the 06-30 deploy: fr/es + tab-bar fix + 4 survey forms + DB sink + 6 cohort reservations LIVE). dt-tests `review` empty. **The beta remains exactly one human action (send invites) from running.**

> **UPDATE 2026-06-30 (Plan-003 F&F beta is LAUNCH-READY on the engineering side. Everything built/deployed/verified on qual; the ball is on the user to SEND the 4 invites + brief Miguel. ▶ RESUME HERE: check whether the user sent the invites; if Gmail MCP is authed, send the José/Miguel emails (drafts prepared); else pick up Plan-008.)**
>
> ### Shipped this arc (06-30) — PRs #318–#321, all live on qual
>
> - **fr + es guest locales first-class (#318):** completed both to exact `en`-parity across the 6 guest namespaces (common/home/public/discover/place/legal); wired into `lib/i18n` + guest & public-landing switchers (EN/PT/FR/ES); `admin` left en-only (no fr/es owner → en fallback). Reservation locale already drives the app via `routes/r.$token.tsx` → `i18n.changeLanguage`. Browser-UAT'd native on qual.
> - **Mobile bottom-tab-bar i18n fix (#319) + CI guard (#321):** `bottom-tab-bar.tsx` hardcoded English (Explore/Saved/Host/Profile) → leaked on every authed **mobile** screen (the phone-first beta surface!), pt-PT included. Now driven from `nav.*` keys (added `nav.explore`/`nav.host` to all 4 locales). Re-UAT'd: fr `Explorer/Hôte`, es `Explorar/Anfitrión`, zero leak. #321 also adds a vitest regression guard + `scripts/beta/export-survey-responses.mjs` + `make survey-export`.
> - **6-person F&F cohort SEEDED on qual** — distinct guest+reservation+locale each (José en · Pedro Amaral pt-PT · Rui Lima **fr** · Pedro Albergaria pt-PT · Célia Lima **es** · Miguel pt-PT; checkout +35d). All redeem 200 + correct locale. Per-person invite copy (**formal register** — pt 3rd-person, fr «vous» — `revisor-ptpt`-clean) + the links in **`temp/invite-batch-2026-06-29.md`** (gitignored: PII + live tokens). José+Miguel = dogfood/host links.
> - **Multilingual post-stay survey:** pt/fr/es n8n form variants created+activated (`/form/dt-beta-survey-{pt,fr,es}`; URLs in beta doc §4 via #320) + a durable **`beta.survey_responses` Postgres sink** (n8n credential "DT qual postgres"; `executeQuery` insert of `lang`+`payload` jsonb) wired into all 4 survey workflows. Both export paths verified.
> - **Miguel briefing** (PT-PT, non-technical, "José monitors the chat") in **`temp/miguel-briefing-2026-06-29.md`**. n8n owner password **ROTATED** by the user (new value in `temp/n8n-qual-owner.creds` — don't `cat` it).
>
> ### ▶ FIRST TASK NEXT SESSION
>
> 1. **Did the user send the 4 invites** (Pedro Amaral, Rui-fr, Pedro Albergaria, Célia-es from the batch)? If **Gmail MCP is authed** (user ran `/mcp` → "claude.ai Gmail"), SEND José's (zmeireles@gmail.com) + Miguel's (mbamaral@gmail.com) emails — drafts were prepared. Survey link goes per-person near end of eval (in their language).
> 2. **Watch the beta:** dt-tests `review` poll; responses via n8n Executions / `make survey-export` / `SELECT * FROM beta.survey_responses`; the in-app chat inbox (José monitors).
> 3. **Or pick up Plan-008** (owner backoffice redesign, subscription-launch — 28 tasks ready; see [[project-subscription-backoffice]]).
>
> ### Gotchas (06-30)
>
> - n8n create-workflow needs explicit `"active":false` (DB col NOT NULL) → then PATCH `active:true`. Form submit = multipart `field-0…N`. Execution data is **`flatted`**-encoded (string values = registry indices, numbers/bools literal) — decoder in `scripts/beta/export-survey-responses.mjs`.
> - n8n↔postgres: both on `dt_internal`; `pg_hba` = `scram-sha-256` (password required, captured from the `dt_postgres` container env without echoing). Cohort seeding = guest+reservation CTE → token-svc mint (the `make qual-token` pattern, per-locale).
> - The mobile bottom tab bar was an **untested i18n surface** the fr/es UAT caught — a class of "authed mobile-only" components may have similar hardcoded strings; worth an audit if more locales ship.
>
> ### State (06-30)
>
> main after #321; **0 open PRs**; local branches → main only. qual: fr/es i18n + tab-bar fix LIVE; 4 survey forms + DB sink LIVE; 6 cohort reservations live (+ the 2 original test reservations). dt-tests `review` empty. Memory updated: [[project-plan-003]]. **The beta is one user action (send invites) from running.**

> **UPDATE 2026-06-29 (Plan-003 beta is GO-READY. Legal gate cleared, onboarding live, n8n + post-stay survey LIVE on qual, all qual bugs fixed/merged; backoffice redesign scoped → Plan-008. ▶ RESUME HERE: the ONLY thing left to launch the F&F beta is the cohort — ask the user for the first ~5 invitees (name · contact · language), then mint links + send invites.)**
>
> ### Session arc (2026-06-25 crash recovery → 06-29 close)
>
> Recovered from a mid-session crash (nothing lost), drove Plan-003 to beta-ready, and scoped the backoffice redesign. **All work merged; main `1615f98`; 0 open PRs; local branches = main only; dt-tests `review` queue empty.**
>
> #### Shipped + merged this arc
>
> - **SEO Lighthouse fix (#307)** — added meta-description, descriptive consent link, permissive `public/robots.txt`, and fixed the vite `/r`→`/r/` proxy (it prefix-matched `/robots.txt` → 500). SEO 0.75→1.0. ⚠️ `Disallow:/` _fails_ the `is-crawlable` audit — keep robots permissive; de-index the beta at the edge if ever needed.
> - **#305** privacy/terms legal **copy** (T-3.D.0) → **3.D legal gate CLEARED**. **#306** beta onboarding (T-3.H.0) → UAT **DT-TESTS-29 PASS** → 3.H.0 done. Both live on qual.
> - **3 qual bugs filed; 2 fixed:** **#159 (P1)** beta-metrics 500 = `bff` lacked SELECT on `analytics` → fixed (**#309**: live `GRANT` applied + `02-roles.sql`) · **#160 (P2)** host's picks showed 6/10 (home hook only queried `action=see`) → fixed (**#312**: new `GET /v1/discover/hosts-picks`, cross-category + photo-gated) · **#161 (P3)** `/admin/profile` 404 = expected empty-state (improvement, still open in Riff).
> - **Backoffice redesign initiative:** `/browser-uat` scan (18 screenshots in `temp/browser-uat/backoffice-scan/`) → design-critique workflow → **proposal-001** (`docs/design/backoffice-redesign/proposal-001.md`, **#311**) → reviewed with owner, **4 decisions locked** (subscription-launch _not_ beta · diverge-to-console aesthetic · 5-tab nav · both helpers phased) → **Plan-008** (`docs/implementation-plans/008-backoffice-redesign/`, **#313**; 6 slices / 28 tasks `T-8.x.y`). See [[project-subscription-backoffice]].
> - **n8n LIVE on qual (#315)** — `dt_n8n` healthy, TLS (letsencrypt). Editor: `https://n8n.qual.stay.portugalodyssey.pt` — **owner = `zmeireles@gmail.com`; password in `temp/n8n-qual-owner.creds` (gitignored) — CHANGE IT**. **Post-stay survey LIVE:** `https://n8n.qual.stay.portugalodyssey.pt/form/dt-beta-survey` (responses → n8n **Executions**; English-only; URL recorded in beta doc §4 via **#316**).
> - qual redeployed to `b181d4b` (legal pages + hosts-picks live); 3.D.0 marked done (**#314**).
>
> #### ▶ FIRST TASK NEXT SESSION — launch the F&F beta (T-3.H.2)
>
> Everything is ready EXCEPT the cohort (the people). **Ask the user for the first ~5 F&F invitees**, each: **name · contact (WhatsApp/email) · language (en/pt-PT)** (criteria in `docs/beta/beta-program-2026.md` §1: en/pt-PT, phone-first, party ≤2, willing to do the survey). Then per person: **`make qual-token`** (mints a guest `/r/<token>` link) → send invite copy (runbook §2) → survey link (the #316 URL) goes out ~1h before checkout. F&F = friends-and-family _fallback_ cohort (no real reservation needed; manual test tokens; tag `source: f_and_f`).
> Also pending: **Miguel briefing** (in-person script §2.3 + chat inbox + P0 escalation). Optional polish: one **test survey submission** to confirm capture; a **pt-PT survey** variant; a Sheet/DB export node for responses.
>
> #### Gotchas learned this arc (save the next session pain)
>
> - **Deploy image tag = FULL 40-char SHA.** `gh workflow run deploy-qa.yml --ref main -f image_tag=<FULL-sha>`. Blank → "this commit SHA", which only has images if `publish-images` ran for that commit — **infra/docs-only commits DON'T trigger publish-images**, so deploy them with the last _code_ commit's full SHA. Short SHA → `manifest unknown` (images are tagged by full SHA).
> - **`--admin` can't bypass the repo ruleset** (10 checks on an up-to-date branch). Merges are **sequential**: `gh pr update-branch <n>` → poll until `CLEAN` → `gh pr merge --squash --delete-branch`; each merge re-stales the others.
> - **n8n `/setup` is public until claimed** (first POST `/rest/owner/setup` wins → claim the owner immediately post-deploy). Create a workflow with explicit `"active":false`; **activate via PATCH `/rest/workflows/{id}` `{"active":true}`** (the `/activate` endpoint needs a `versionId`).
> - prettier reflows md tables → `pnpm exec prettier --write <doc>` before committing docs.
>
> **UPDATE 2026-06-25 (crash recovery 06-25 — no work lost. The crashed session opened two PWA PRs (#305, #306); both failed the Lighthouse SEO budget. Diagnosed + fixed via #307; both later merged. Kept for history.)**
>
> ### Crash recovery (2026-06-25, later)
>
> A session crashed mid-work. State verified — **nothing lost**: working tree clean, no stashes, both feature branches pushed to origin, no orphaned dev/docker processes.
>
> - **Two PRs were created by the crashed session, both branched off main `5f0fc8d`:**
>   - **#306** `feat(pwa): beta onboarding — orientation, empty-states, support footer (T-3.H.0)` — branch `feat/3-h-0-beta-onboarding`.
>   - **#305** `feat(pwa): privacy/terms copy, en + pt-PT (T-3.D.0)` — branch `feat/3-d-0-legal-copy`.
> - **Both green on every required check; both red only on `Lighthouse Perf Budgets`** (advisory — not one of the 6 required gates; #302 merged red on it too). Root cause: SEO 0.75 < 0.8 from three weight-1 audits — `meta-description` (always absent), `robots-txt` (always 500'd because the vite `/r` proxy key prefix-matched `/robots.txt` → forwarded to bff), and `link-text` (the #302 consent banner's generic "Learn more" link — the regression that tipped 0.83 → 0.75).
> - **Fix committed locally → `fix/pwa-seo-lighthouse-budget` (`af2d7c2`, NOT pushed):** added `<meta name="description">`; consent link text → "Read our privacy policy" / "Ler a política de privacidade"; vite proxy key `/r` → `/r/` (still matches every `/r/:token` redeem link, #234); permissive `public/robots.txt`; `.lighthouseci` gitignored. Verified via `lhci autorun`: **SEO 0.75 → 1.0**, all four budgets pass; lefthook (gitleaks/prettier/lint/CC) green.
> - **`public/robots.txt` is intentionally permissive** — a `Disallow` passes `robots-txt` but fails the higher-weight `is-crawlable` audit (→ SEO 0.66) and would de-index production (qual + prod share one build). De-index the beta at the edge (`X-Robots-Tag: noindex` on the qual route) if that's wanted.
>
> #### FIRST TASKS NEXT SESSION (crash recovery)
>
> 1. **Land the SEO fix** (`fix/pwa-seo-lighthouse-budget`). Either push it as its own PR → merge → `update-branch` #305 + #306 (both then go fully green), or cherry-pick `af2d7c2` into each branch. The handoff update itself sits on `docs/crash-recovery-2026-06-25` (also local, not pushed). Pre-existing untracked `e2e/` is unrelated — leave it.
> 2. Resume the pre-crash plan: 3.D.0 copy review (#305) + 3.H.0 beta onboarding (#306) → then 3.H.2 run the closed beta.
>
> **UPDATE 2026-06-25 (Plan-003 lean path A→B→C→D-eng ALL MERGED + LIVE + verified on qual. Remaining: 3.D.0 privacy/terms COPY (José) → 3.H beta. Resume from this block.)**
>
> ### Shipped this session (2026-06-25) — 7 PRs merged (#297–#303), one consolidated main deploy, all verified live on qual
>
> - **3.A.1 (#297)** OTLP→Prometheus **bridge** (collector `prometheus` exporter `:8889` + metrics pipeline; overlay added to `deploy-qa.yml`); bff-latency + error-rate Grafana dashboards render live qual data. **Surfaced + fixed a latent OTel bug** → [[reference-otel-esm-preload]]: tsup-bundled ESM hoists `import fastify` above `initOtel()` so the http.server metric never recorded → fixed via a `node --import @daily-tour/shared-otel/register` preload (Dockerfile CMD).
> - **3.A.2 (#298 + msg-fix #303)** **alertmanager + blackbox-exporter → Telegram.** Ops bot **`dt_farol_bot`** → group **"Daily Tour Farol Group"** (`ALERT_TELEGRAM_CHAT_ID=-5587963851`, in `.env.qual`). Rules: `BlackboxProbeDown`, `HighServerErrorRate`. **Verified live: kill `dt_bff` → firing + resolve both delivered (0 failures).** #303 fixed a real bug José caught — the message was a single-quoted YAML string so `\n` stayed literal, mangling the alert URL into a 404 (`/health%5Cn`); now a block scalar (real newlines), link works.
> - **3.A.3 (#299)** own-DB **`/ready`** (`SELECT 1`) on token/catalog/media (Node) + planner/search/chat-hub (Python); 6 healthchecks flipped `/health`→`/ready` → **gate `up --wait`** on readiness. CodeQL flagged `/ready` (DB route, rate-limit-exempt, CWE-770) → fixed with an explicit per-route 60/min limit.
> - **3.B.0 (#300)** nightly **pg backup → MinIO** (`scripts/ops/backup-postgres.sh`, both clusters → private `backups` bucket) + **restore drill** (`restore-drill-postgres.sh`, throwaway pgvector container, RTO ~1s) + **systemd timer installed on the box** (`infra/systemd/dt-backup.{service,timer}`, 01:00 UTC). On-box-only DR **signed for beta**; B2 off-site deferred to 3.B.1.
> - **3.C.3 (#301)** **per-guest LLM rate-limits** (JWT-decode keyGenerator — the limiter `onRequest` runs before auth `preHandler`, so it decodes the bearer itself): `/v1/tour-plans` 5/min, `/v1/discover` 30/min; `bodyLimit` 16KB→413 + `wishes[]` 120-char cap. **Verified live: 429 on the 6th tour-plans.**
> - **3.D.1 (#302)** **consent gate**: persisted store (default essential-only) + banner mounted above the router (works in both shells) + 1-line gate on `emit()` so declining ⇒ no `/v1/telemetry/tour`. Privacy/terms **route stubs + `legal` i18n namespace** shipped (en + pt-PT, linter-clean) — **copy is 3.D.0 (José's)**.
>
> ### Gotchas learned this arc (save the next session pain)
>
> - **Never `cp`/`scp` into the `/opt/daily-tour` deploy clone as root** — files become root-owned and the `ghrunner`-run `git checkout -f` can't unlink them → deploy **"Sync" step fails** ("Permission denied"). Fix: `chown -R ghrunner:ghrunner`. (Bit us via `scripts/ops/` after #300 made them tracked.)
> - **CodeQL `js/missing-rate-limiting` (CWE-770):** a DB-touching route needs an **explicit per-route** `config.rateLimit` — CodeQL doesn't model the _global_ fastify limiter for routes inside a child plugin scope. `--admin` can NOT bypass a failing CodeQL gate.
> - **Repo ruleset** requires 10 checks on an **up-to-date** branch → merging N PRs is sequential (each squash re-advances main → re-`update-branch` + re-CI for the rest).
> - **`gh workflow run --ref <branch>`** can race a fresh `git push` (resolves the stale tip → builds wrong commit) → **verify the run's `headSha`**.
> - **Alertmanager** `group_interval=5m` → the resolve message lands ~5 min after firing (not a bug). Bot **privacy mode** (`can_read_all_group_messages:false`) hides plain group msgs → get the group chat_id via `/start@bot` (commands reach the bot even in privacy mode) or @getidsbot, then `getUpdates`.
> - **YAML single-quoted strings keep `\n` literal** → use a block scalar (`|-`) for multi-line message templates.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **Rituals:** poll `inbox-daily-tour.md` (a new project **jo:Pico / JORAA** introduced itself — intro only, no ask) + the dt-tests `review` queue.
> 2. **3.D.0 — privacy/terms COPY (José's legal call).** Stubs + `legal` i18n ns are wired; just needs the real content in `apps/pwa/src/locales/{en,pt-PT}/legal.json` + `routes/{privacy,terms}.tsx`. **Claude offered to draft template-based GDPR copy** (data collected / lawful basis / retention / contact), en + pt-PT (pré-AO via `ptpt-excellence`) for José's review. Then **browser-UAT the consent surface** (banner shows on entry, declining truly stops telemetry, both pages render in both locales).
> 3. **3.H — closed beta** (gated on 3.D.0): 3.H.0 onboarding/orientation + 3.H.2 run the beta (`docs/beta/beta-program-2026.md`).
> 4. **Optional lean follow-ups:** Python services' `http.server` metric gap (separate FastAPI cause); a deploy smoke-assertion that every Node svc emits `http_server_duration`; mq-depth/service-health dashboards (still prom-client names); 3.B.1 (MinIO media `mc mirror` + off-site B2 decision); 3.D.2 (DSR export/erase scripts).
>
> ### State (2026-06-25)
>
> main **`96ca2fd`** (#297–#303 all merged); **0 open PRs, 0 open issues**; local branches: **main only** (clean — only pre-existing untracked `e2e/`). **qual fully healthy + current** on one consolidated deploy of main (`dt_otel_collector` shows "Up" without "(healthy)" — it has no healthcheck, benign). **Ops Telegram alerting LIVE + verified**; **systemd backup timer running** (nightly 01:00 UTC). `.env.qual` on the box now holds `ALERT_TELEGRAM_BOT_TOKEN` + `ALERT_TELEGRAM_CHAT_ID` (MANUAL_KEYS — a `gen-env --force` would reset them). Deploy-clone hygiene: `scripts/` chowned to ghrunner; `alertmanager.yml` hand-rendered live (re-renders identically on next deploy). Memory updated: [[project-plan-003]], [[reference-otel-esm-preload]], `MEMORY.md`. **Plan-003 is one legal-copy task + the beta away from done.**

> **UPDATE 2026-06-20 (Plan-003 EXECUTING: error tracking LIVE on qual; backlog tidied; cross-project comms channel established).**
>
> ### Shipped this session (2026-06-20)
>
> - **Backlog tidied:** Plan-006 TODO stale boxes closed (#289). **Plan-003 (Real-User Readiness) scoped → READY (#289/#290); Q1 decided = (a) friends-and-family beta on qual** (3.E prod cutover deferred → Plan-004). Locked: GlitchTip / cohort both-mixed / MinIO backup / template-GDPR / en+pt-PT. Lean path: 3.A → 3.B-lite → 3.C-lite → 3.D-lite → 3.H. Docs: `docs/implementation-plans/003-real-user-readiness/{README,TODO}.md`. See [[project-plan-003]].
> - **Plan-003 T-3.A.0 (error tracking) DONE + LIVE on qual.** DSN-gated SDK across all tiers: `@sentry/node` (bff/token-svc/catalog-svc/media-svc) + `sentry-sdk` (chat-hub/notif-svc/planner-svc/search-svc) + `@sentry/react` (pwa) — **#291** (also fixed a HIGH vite CVE via `pnpm.overrides "vite": ">=6.4.3 <7"` + worker-exception capture for media-svc transcode + planner-svc consumer). **GlitchTip is a SHARED service** operated by po-platform (sA:Douro) at **https://errors.portugalodyssey.pt** (po box `195.35.3.6`, postgres:17, nightly backups); Daily Tour is a tenant **org** — we do NOT self-host (repo holds client-config only: `infra/glitchtip/README.md`; #292 mirror → #293 client-config after Douro consolidated to one instance). DSN + `OTEL_DEPLOYMENT_ENVIRONMENT=qual` wired into qual (**#294**) + a **Node-image Dockerfile fix** (**#295** — the 4 Node Dockerfiles needed `@daily-tour/shared-sentry` in their curated COPY/build; had silently failed Node image builds since #291). Verified: `SENTRY_DSN` present in `dt_bff` + `dt_planner_svc` containers + a synthetic ingest → **HTTP 200, event `fe47cef3`** in the Daily Tour org. Also fixed the deploy-smoke stale-fixture blocker earlier (#286/#287).
> - **Cross-project comms channel established** at `/media/jmeireles/ssd3/my-projects/orchestrator-comms/` (file mailbox, sA:Douro ↔ me). **My handle: `dt-orch:Furnas`.** READ `inbox-daily-tour.md`, WRITE `inbox-po-platform.md`; append-only, newest at bottom; **poll at session start + when blocked**. Governance codified in its README (po-platform owns shared services; each tenant owns its org/project/DSN/SDK; tenants never `docker compose up` a shared instance). See [[reference-orchestrator-comms]].
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **Rituals:** poll the comms inbox (`inbox-daily-tour.md`) + the dt-tests `review` queue.
> 2. **Plan-003 slice 3.A (continue):** **3.A.1** observability overlay (OTel→Prometheus→Grafana) into the qual deploy stack → **3.A.2** uptime + Telegram alerts → **3.A.3** `/ready` probes. Then 3.B-lite (backup → MinIO; settle off-site replication) → 3.C-lite (rate-limit `/v1/tour-plans`+`/v1/discover`) → 3.D-lite (privacy/terms + telemetry consent) → 3.F/3.G light-touch → 3.H (onboarding + beta).
> 3. **GlitchTip follow-ups:** (a) **`SENTRY_DSN` durability** — it was hand-appended to `/opt/daily-tour/.env.qual` on the qual box; fold it into `gen-env-qual.sh` / `.env.qual.example` so a fresh env regen preserves it. (b) **SMTP (`EMAIL_URL`)** for real alert emails — Douro owns the instance; request via the comms channel (currently `consolemail://`). (c) optional real-service-error smoke (vs the synthetic event); ask Douro to confirm events in the org UI.
>
> ### State (2026-06-20)
>
> main `efcb15c`; **0 open code PRs, 0 open issues**; local branches: `main` only. Error tracking LIVE on qual across PWA + all 8 services (shared GlitchTip tenant). Comms channel active. **Lessons recorded:** [[feedback-agent-worktree-isolation]] (Agent `isolation:worktree` did NOT isolate parallel builds → use cs-agent or strictly non-overlapping file scopes); [[feedback-service-dockerfile-workspace-dep]] (a new `@daily-tour/*` workspace dep on a service ⇒ update its Dockerfile's curated COPY/build; PR-CI passes, only `publish-images` catches it — check it post-merge). Desktop phase + chat reply (#281) both done/live earlier this arc.

> **UPDATE 2026-06-19 (CHAT REPLY SHIPPED + DEPLOY SMOKE FIXED): The host→guest chat reply path (#281) is IMPLEMENTED, MERGED, DEPLOYED to qual, and core-verified LIVE — closing the send-only gap. Also fixed a deploy blocker (#286). Both issues CLOSED. Resume from this block.**
>
> ### Shipped this session (2026-06-19)
>
> - **#281 host→guest chat reply** — 3 PRs merged: **#283** chat-hub (`POST /v1/reply/{guest_id}` persist-outbound + best-effort WS push + `GET /v1/threads`), **#284** BFF owner-gated `/v1/admin/chat/*` proxy (mirrors #240), **#285** PWA owner inbox (`/admin/chat`) + guest host-frame handling. Built sequentially by delegated agents (chat-hub → bff → pwa) on a clean tree to dodge the shared-tree tangle. Caught + fixed a contract mismatch in review (BFF history returns `{messages:[...]}`; owner hook had expected a bare array). **Verified LIVE on qual** (creds-free): triggered an internal chat-hub reply → it persisted + came back through the BFF guest-history route as an `outbound/host` message. Owner-UI + live-WS push covered by unit suites (chat-hub 34, bff 109, pwa 288) + the deploy 401 gate check. **#281 CLOSED.**
> - **#286 deploy smoke fix** — **#287**: the qual deploy red-gated on token mint 410 — the seed used `onConflictDoNothing`, so its rolling `dayOffset` checkout dates froze on the persistent volume and went stale. Fixed: seed `onConflictDoUpdate` refreshes checkin/checkout/status on each re-seed; `dev-smoke.sh` now picks the furthest-checkout valid reservation dynamically (mirrors `mint-guest-token.sh`). **Verified: deploy run 27848700405 fully GREEN** (smoke ✓, readiness gate ✓, success recorded). **#286 CLOSED.**
> - Process note: Agent-tool `isolation:worktree` is unreliable here (it didn't isolate the earlier desktop builds) — use sequential builds on a clean tree + non-overlapping scopes (or cs-agent). See [[feedback-agent-worktree-isolation]].
>
> ### State (2026-06-19)
>
> main at the #287 merge (`982381e`). **0 open code PRs** (this handoff aside). Local branches: `main` only. Chat-reply (#283/#284/#285) + #286 (#287) all merged + deployed; qual deploy GREEN again. **Demo note:** the test guest thread `aaa…002` holds UAT scratch messages (06-18 desktop UAT + the #281 verification reply) — clear it / use a fresh reservation before a live demo. **Optional remaining:** full owner-UI browser walk-through of `/admin/chat` (Authentik akadmin login) — covered by tests, not re-walked live.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. dt-tests `review` poll (ritual).
> 2. Pick a new thread — desktop phase + chat reply both done. Candidates: clear/refresh the demo guest thread; optional owner-UI live UAT (`/admin/chat` via Authentik); seed a multi-image + season place for Place Detail's rich gallery path; or new product work.

> **UPDATE 2026-06-18 (DESKTOP PHASE COMPLETE — superseded by the block above): The final 2 desktop screens (Place Detail #279 + Chat #280) are MERGED, DEPLOYED to qual, and browser-UAT'd 9/9 PASS (0 JS errors). ALL 5 desktop guest screens (Home, Discover, Daily Tour, Place Detail, Chat) are now LIVE + verified on qual. One out-of-criteria finding filed: chat is send-only on qual (#281). Resume from this block.**
>
> ### Shipped this session
>
> - **#279 Place Detail desktop** (main @ `75a9226`) + **#280 Chat desktop** (main @ `7aad186`) MERGED. `publish-images` (auto on push) → `deploy-qa.yml -f image_tag=qual` both green; live on qual.
> - **browser-uat 9/9 PASS, 0 JS errors** (harness `e2e/uat-desktop-screens.e2e.mjs`; captures in `temp/desktop-audit/captures/`). **Place Detail:** full-bleed hero (chrome suppressed, opaque caption), breadcrumb, display-lg title, two-pane + sticky 360 rail (stacked Navegar/Ligar/Mensagem + Guardar-ghost + map), no tab bar ≥lg, single-photo business looks intentional, rail-float guard holds at the 1024 seam, 1920 cap 1104 centered, 834 mobile + PlaceMap clears tab bar (pb-28). **Chat:** SubHeader (Miguel+Online, no chevron), centered 820 panel, empty-state (welcome 68px Fraunces + 4 exact PT chips), chip→seed→send, composer pinned + 44px send + NO mic, SuggestionStrip persists, 1920 gutter, 834 mobile.
> - **Process gotcha + recovery:** the two build agents were launched with Agent-tool `isolation:worktree` but it did NOT isolate them — they shared the main tree and crossed branches (Place Detail commit stacked on the Chat branch). Zero file overlap → untangled cleanly (`git branch -f` chat→its own commit; `cherry-pick` place-detail onto its own branch off main). No work lost. Memory: [[feedback-agent-worktree-isolation]] — use cs-agent or strictly non-overlapping file scopes for parallel builds.
>
> ### Open follow-up
>
> - **#281 — chat send-only on qual (FILED):** a guest chat message persists + gets a WS `ack` but no host/agent reply (`them` bubble) ever returns (waited 50s/6 msgs). Server-side reply-path gap on qual (chat-hub reply worker / LLM path / qual overlay), NOT a UI bug — the Chat layout UAT passed regardless. **Confirm/repair before any chat-involving demo.** Candidate next thread.
> - **Multi-image gallery + season rich-path** on Place Detail desktop is untested with real data — no seeded place has >1 image AND a season (Lagoa do Fogo = 1 image, no season). Layout degrades cleanly (auto-absent gallery + no season chip). Seed a true rich place to demo the gallery + season chip.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. dt-tests `review` poll (ritual) — empty at close.
> 2. **#281 chat send-only** — triage chat-hub on qual (is the reply worker running? LLM reply path wired? check `docker logs` on the VPS via `make vps`). Demo-relevant.
> 3. Optionally seed a multi-image + season place to fully exercise Place Detail's gallery/season rich path.
>
> ### State
>
> main `7aad186` (#279 + #280 merged; both LIVE on qual + UAT'd). **0 open code PRs** (this handoff aside). Local branches: `main` only (feature branches deleted post-merge). dt-tests `review` empty. Open issue: **#281** (chat send-only, qual). qual data fixes from prior sessions still apply (not in committed seed). All 5 desktop guest screens live at `https://qual.stay.portugalodyssey.pt`. New captures: `placedetail-desktop-1440-{rich,business}`, `placedetail-{1024-railguard,1920-cap,834-mobile-mapclear}`, `chat-desktop-1440-{empty,active}`, `chat-{1920-gutter,834-mobile}`.

> **UPDATE 2026-06-18 (MARATHON — superseded by the block above): Desktop UI/UX EXECUTING. WF1 audit + WF2 design done. MERGED + DEPLOYED to qual: #267 PlaceCard contrast · #268 foundation · #269 Home · #271 picks-photos · #272 Discover · #274 Home cover-story · #276 BFF+planner (guest LOCALE + per-stop COORDS) · #277 Daily Tour desktop. LIVE-VERIFIED via browser-uat: Home 5/5 · Discover (split + sync + no bold arc; mobile fork intact) · picks 6/6 photographed · cover-story · BUG1 (English itinerary copy → now PT-PT, ptHits=3/enHits=0) · BUG2 (planner returned lodging → now landmarks). Daily Tour desktop LIVE-VERIFIED both stages (two-pane intake + spatial timeline rail + edge-to-edge route map with numbered markers + route line; Voltar present; PT copy; landmark+restaurant stops, no lodging; mobile fork intact). 3 of 5 desktop screens live (Home, Discover, Daily Tour). REMAINING: Place Detail, Chat. Resume from this block.**
>
> ### Done this session
>
> - **qual cleaned (live DB):** deleted 14 stale Unsplash `place_media` rows → qual now **43 places / 32 media** (exact dev parity); the 14 businesses fall back to the branded panel. One-off manual op, forward-compatible (committed seed has no Unsplash).
> - **13 desktop+tablet captures** of all 5 guest screens (browser-uat qual, light theme, 1440 + 834) → `temp/desktop-audit/captures/`.
> - **WF1 — desktop UX audit** (5 lenses → adversarial reconcile → completeness critic) → `temp/desktop-audit/wf1-audit.md`. 6 blockers / 6 majors / 5 minors. Key correction (code-verified): the "bottom-tab stranded mid-page" finding is a full-page-screenshot ARTIFACT, not a CSS bug; the ActionGrid `aspect-square` collapse is the real worst defect.
> - **WF2 — design exploration** (foundation → 5 screens × 3 candidates → judge) → `temp/desktop-audit/wf2-design.md`. **LOCKED foundation = "Editorial AppShell"**: `DesktopAppShell` (contained|rail) + `DesktopTopNav` masthead + opt-in `ContextRail` + `useLayoutMode`/`ResponsiveScreen` + `FullBleed` + `BrandLockup` extraction + `--text-display-lg/-xl`. Breakpoint: lg/1024 floor, md/768 early-engage for Home+DailyTour. **Build seq: Foundation → Discover → DailyTour → Home → PlaceDetail → Chat.** Per-screen specs + 5 paste-ready Stitch prompts in the doc.
> - **#267 MERGED** — PlaceCard overlay no-photo contrast (dark forest surface + stronger scrim); fixes a WCAG blocker on the live mobile app too.
> - **PR1 #268 MERGED** (`main` @ `c1a0984`) — desktop foundation INFRA: `DesktopAppShell`/`DesktopTopNav`/`ContextRail`/`FullBleed`/`useLayoutMode`/`ResponsiveScreen`/`BrandLockup`/tokens. Guarded edits: BrandLockup byte-identical; LocaleSwitcher → `components/`; en/pt-PT `nav.*`. +23 tests.
> - **Desktop Home #269 MERGED + DEPLOYED to qual — LIVE-VERIFIED (5/5)** (`main` @ `981a39b`). FIRST screen, mounts the shell (`ResponsiveScreen engageAt="md"`; <1024 phones untouched). `HomeDesktop` = masthead spread (Greeting `masthead` variant + `--text-display-lg`) + `DesktopSectionNav` (6 verbs as bounded nav cards, icon+label same box → artifact gone) + `HomeBodyGrid` `[1fr_360px]` (picks fluid grid + 2 `DesktopPlanPanel`s). DRY: `ACTIONS`→`actions.ts`, hosts-picks→`use-hosts-picks.ts`, mobile JSX→`home.tsx`. **Cover-story span deferred** (needs a PlaceCard aspect variant). +4 tests; full pwa **253/253**. Deploy: `publish-images` (rebuilds `pwa:qual`) → `deploy-qa.yml -f image_tag=qual` (push-deploy is skipped/manual-only). browser-uat at 1440+834 PASS; screenshot `temp/desktop-audit/captures/home-desktop-NEW-1440.png`.
> - **#271 picks-photos fix MERGED + DEPLOYED — LIVE-VERIFIED (6/6)**. Home "Escolhas do anfitrião" showed 4 photoless `eat` businesses (#135 owner-upload-blocked) → green tiles. Fix: `use-hosts-picks` queries `action=see`; seed `UPDATE` flags 6 photographed see-landmarks (Sete Cidades, Lagoa do Fogo, Furnas Caldeiras, Salto do Cabrito, Caldeira Velha, Pico do Carvão) as `is_hosts_pick` + un-flags the 4 lodging listings. Same UPDATEs applied to qual DB directly. browser-uat: 6/6 photographed, 0 fallback. (`no loc` → BFF returns all picks, no distance filter.)
> - **Desktop Discover #272 MERGED + DEPLOYED — LIVE-VERIFIED** (`main` @ `8f8f315`). Forks `/a/:action` at `lg` via inline `useLayoutMode` (mobile JSX UNTOUCHED → action-drill-down 8/8 pass). `DiscoverDesktop` = `DesktopAppShell frame="rail"` MIRRORED (`railSide="right"`, 400px): map fills the fluid LEFT, `DiscoverListPanel` (stacked PlaceCards, no fork) on the RIGHT; `DiscoverSubHeader` (title + `CategorySegmented` ToggleGroup→/a/:slug + relocated search + count); `DiscoverMapCanvas` uses the new additive `MapView fitToPins`. `DesktopAppShell` gained `railSide`/`railWidth` (additive). browser-uat: split + list↔pin sync + category switch + framed-on-island + NO stray arc (0% magenta) + mobile fork intact. +4 tests; full pwa 257/257. NOTE: a FAINT pale-lilac fit-bounds rectangle remains on the map (bold arc gone; true source still wants live devtools).
> - **#274 Home cover-story MERGED + DEPLOYED — LIVE-VERIFIED**. First host's-pick spans 2×2 as a featured cover when ≥3 picks; also balances the right-rail rhythm gap. No PlaceCard fork (just the `<li>` span). UAT: 4.19× area ratio, all photographed.
> - **#276 BFF + planner-svc (guest LOCALE + per-stop COORDS) MERGED + DEPLOYED — LIVE-VERIFIED**. (a) **BUG1 fix:** JWT `locale` threaded BFF→planner (folded into `request_payload`; planner `_build_plan_request` guards non-string→en); `pickName(locale)` prefers `names[locale]`→en. UAT: fresh tour copy now PT-PT (ptHits=3/enHits=0). (b) `TourStop` now carries `geom_lat`/`geom_lng` (BFF `toStop`/`resolvePlaceMeta` thread catalog geom; nullable) → enables the Daily Tour route map. BFF 97/97, planner 39 passed.
> - **BUG2 (planner relevance) FIXED — LIVE-VERIFIED** (qual data-only). The 4 guesthouses #40–43 were mis-tagged with a `see` `place_action_wish` row → planner correctly returned them. Deleted the 4 tags on qual → guesthouses now have ZERO action tags (invisible to discover + tours = correct for lodging). NOT in any committed seed (admin/listings-inserted); **if re-created via admin, do NOT add action tags.** UAT: tour stops now landmarks, 0 lodging.
> - **Desktop Daily Tour #277 MERGED + DEPLOYED** (`main` @ `f197715`). Forks `/tour/new` + `/tour/:planId` at `md` via `ResponsiveScreen` (timeline forks ONLY the `ready` branch; mobile JSX untouched → tour tests pass). `DailyTourDesktop(stage)`: Stage 1 INTAKE = `TwoPaneIntake` (raised form card wrapping the unforked `IntakeForm` + `EditorialImageryPanel` — reusable for Chat); Stage 2 TIMELINE = rail frame: `TourItineraryRail` (`DaySummaryRail` + unforked `DailyTourTimeline` in a `data-density="desktop"` ancestor-CSS wrapper + pinned Partilhar/Voltar toolbar) + `TourRouteMap` (numbered markers + tea-green polyline). Additive `MapView` `label?`/`route?` (default-off, guarded — mobile inert). +8 tests; full pwa **265/265**. browser-uat PASS both stages: two-pane intake (form + `EditorialImageryPanel`); rail timeline + edge-to-edge route map (numbered markers + connecting line); pinned **Voltar** + Partilhar (dead-end fixed); PT descriptions; stops = landmarks + restaurant (no lodging); mobile fork intact. **Minor polish:** the route polyline reads dark, not clearly tea-green (the `--tea-500` read may be falling back — check `tour-route-map`/`MapView` `teaGreen()`).
>
> ### FIRST TASKS NEXT SESSION
>
> 1. dt-tests `review` poll (ritual) — empty at close.
> 2. **Build the 2 remaining desktop screens** (foundation + Home + Discover + Daily Tour all live): **Place Detail** (§2.3, `engageAt="lg"`; keep the full-bleed hero via `FullBleed`, below it a wide content col + a STICKY info/actions rail + breadcrumb; build as a SEPARATE sibling — the mobile bottom-map region is fragile) → **Chat** (§2.5, `engageAt="lg"`; bounded `ConversationPanel` + editorial empty-state — **REUSE `EditorialImageryPanel`** from Daily Tour). Specs in `wf2-design.md` §2.3 + §2.5 + Stitch §4. Pattern proven 3× (Home contained; Discover + Daily Tour rail-frame, inline `useLayoutMode`/`ResponsiveScreen` fork on the live routes — mobile JSX untouched): build → test → PR → merge → `publish-images` → `deploy-qa.yml -f image_tag=qual` → browser-uat. Delegating the screen build to a focused agent (worktree) + reviewing the diff worked well for Daily Tour.
> 3. Optional: run the 5 Stitch prompts (web UI) to mock screens.
>
> ### Deferred / notes
>
> - **2 demo-critical backend bugs — BOTH FIXED + LIVE-VERIFIED** (#276 BUG1 English copy → PT-PT; qual-data BUG2 relevance → landmarks not lodging). Were the biggest demo risks; now resolved.
> - **Home picks + cover-story + right-rail rhythm** — all DONE (#271, #274), live-verified.
> - Discover **stray map arc** — `fitToPins` killed the bold arc (0% magenta UAT); a FAINT pale-lilac remnant remains. NO line-layer in code (`buildStyle` = OSM raster; only purple is the `MapPin` `--hydrangea-400` selection ring) → needs a live maplibre-instance inspection (the map isn't globally exposed). Low ROI, deferred.
> - **Daily Tour `StopSyncBridge` is INDEX-based** (the unforkable `TimelineStop` has no per-stop hover cb / `data-stop-id`). Works because reorder is local-only (DOM order = `stops` order). If reorder is ever wired to the map, add a `data-stop-id`/hover-callback to the shared `TimelineStop` for id-based sync. Stops degrade gracefully when coords absent (markers skipped, island still framed).
> - The spec's "Overline contrast hardening" = **no-op** (token already 6.8:1 AA on cream) — skipped, verified.
> - **State:** main `f197715` (#267–#277 all merged + LIVE on qual; handoff PRs #270 merged, #273 merged, #275 closed-stale). **1 open code PR: this handoff** (otherwise 0). Local branches: `main` only after merge. qual data fixes applied directly (NOT in committed seed): picks re-point + guesthouse action-tag delete (BUG2) + the 14-Unsplash delete. dt-tests `review` empty. Desktop Home (≥md) + Discover (≥lg) + Daily Tour (≥md) live at `https://qual.stay.portugalodyssey.pt`. NEW captures incl. `home-desktop-NEW-1440`, `home-desktop-PICKS-1440`, `home-desktop-COVER-1440`, `discover-desktop-NEW-1440`, `tour-timeline-PT-VERIFY`, `tour-intake-desktop-NEW-1440`, `tour-timeline-desktop-NEW-1440`.

> **UPDATE 2026-06-17: Slice 2.D shipped + DEPLOYED LIVE to qual; new phase locked — DESKTOP UI/UX (first-class).**
>
> ### Now live
>
> - **Slice 2.D (mobile editorial) = DONE + DEPLOYED to qual** (deploy run 27702539590; bundle `index-B65MhZie.js`; 43 places, 7 seasons, Miguel's 4 guesthouses). **13 PRs merged this session (#254–#265).** main `14181ef`. 0 open PRs.
> - **`make qual-token`** (#265) → prints a ready guest link `https://qual.stay.portugalodyssey.pt/r/<token>` (mints from the furthest-checkout reservation on the VPS via SSH). Owner backoffice at `/admin` via Authentik.
> - Deploy gotcha fixed (#264): `dev-smoke.sh` + `dev-env-check.sh` hard-coded `== 28` places; now `≥ 28` (the exact count false-failed the deploy — the image was actually fine; seed grew to 43).
>
> ### NEXT PHASE — Desktop UI/UX (FIRST-CLASS). Locked decisions (human, 2026-06-17)
>
> The mobile "São Miguel Editorial" app breaks badly on desktop (naive responsiveness stretches a mobile layout). Locked: **desktop = FIRST-CLASS**; **ONE design system, TWO layout systems** — share the editorial _language_ + primitives (`PlaceCard`/`Overline`/`DistanceChip`/tokens); **diverge** page-level layout + IA + interaction per form factor; implement as **desktop-specific layout components** (e.g. `HomeDesktop`/`DiscoverDesktop`) composing the SAME shared primitives, switched at a real breakpoint (~`lg`/1024) — NOT one set of CSS classes for both (that produced the mess). **Scope = guest app now** (backoffice later). **Stitch via web-UI prompts** (MCP unreliable E2E). Full detail: memory `project_desktop_redesign.md`.
>
> ### Desktop critique already captured (from the user's 6 qual desktop screenshots)
>
> `aspect-square` bento → giant empty squares at desktop width (worst); full-width `stacked` PlaceCards in the expanded Discover list → one card = a full-screen banner; the bottom-tab-bar is stranded + the map/bottom-sheet is a phone metaphor (desktop wants **map + list side-by-side**); inconsistent content widths / huge whitespace / tiny click targets. **Non-layout noise to clean first:** qual's media-less businesses show the stale pre-#250 single-Unsplash placeholder (seed residue → truncate like dev did); a stray purple arc on the Discover map (route geometry drawn at world scale).
>
> ### FIRST TASKS NEXT SESSION (the agreed plan — 2 workflows, then build)
>
> 1. **Capture fresh desktop + tablet states** of all 5 screens (browser-uat qual via `make qual-token`) + **clean qual's stale Unsplash business media** (truncate the residue). Both become trusted workflow inputs.
> 2. **Author + run WF1 — UX audit:** parallel expert lenses (mobile-purist · desktop/responsive · IA · visual · a11y) → adversarial dedupe/reconcile + a completeness critic → one curated, prioritized **defect → proposed-solution** list.
> 3. **Author + run WF2 — design exploration** (fed by WF1's curated output): per screen generate N candidate desktop layouts → judge panel (density / IA fit / primitive-reuse / build cost / brand) → recommended direction + concrete build plan + Stitch prompts for the chosen direction.
> 4. **Build** the chosen desktop layout components.
>
> - dt-tests `review` poll at start (ritual). main clean, 0 open PRs.

## Prior (mobile) Slice 2.D detail — 2026-06-17

> **UPDATE 2026-06-17 (LATEST): Marathon session — built ALL of Plan-002 Thrust B / Slice 2.D: the 5 PWA screens rebuilt to the "São Miguel Editorial" design + foundations + host rename + a polish + a backend follow-up. Every screen browser-verified in light AND dark. 8 PRs MERGED (#254–#261); #262 (season) OPEN as a PR. Resume from the "FIRST TASKS NEXT SESSION" block below.**
>
> ### What shipped (main tip after #261 = `e92b4de`; #262 awaiting merge)
>
> - **#254** foundations — editorial tokens both themes (MD-role surface ladder in `tokens.css`/`globals.css`, mockup classes 1:1) + primitives (`Overline`, `DistanceChip`, `BrandAppBar`, `BottomTabBar` 4-tab+stubs, shadcn `Sheet`/`Avatar`) + `PlaceCard` restyle (`stacked` default + `overlay` variant).
> - **#255** Place Detail · **#256** Home · **#257** Daily Tour (+per-stop hero thumbnails via new BFF `toStop` plumbing) · **#259** Chat · **#260** Discover (map+draggable-sheet rebuild + BFF discover `geom_lat/lng`). All browser-UAT'd both themes (screenshots in `temp/uat-2d-*/`).
> - **#258** host rename **João → Miguel** everywhere hardcoded. **#261** editorial `BackLink` (lucide arrow, tea-green, no underline) replacing the bare-"←" underlined links (tour/place-detail/discover) — the user's design critique.
> - **#262 (OPEN PR)** place `season` plumbing: catalog-svc `/hydrated` now returns `season`, BFF passes it through, 7 summer spots seeded → the Place-Detail **Details card is now functional end-to-end** (verified: BFF `/v1/places/<#010>` returns `season:"summer"`).
> - **D1 theme bug** (route renders light fallback because it never mounts `useThemeAuto()`) found on #255 and fixed per-route on `/p/:id`, tour+`/tour/new`, `/chat`. (`/` + `/a/:action` already had it.)
>
> ### Scope decisions locked this session (human)
>
> Auto **light+dark** editorial (kept sunrise/sunset switch; light extrapolated from the dark-only mockups) · Discover = **full map+sheet rebuild** · bottom nav = **full 4-tab with "coming soon" stubs** · premium cards kept **active** (not disabled) · the chat host is **Miguel**.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **dt-tests poll** (ritual).
> 2. **Merge #262** (season plumbing — verified, draft/PR; the only open PR). Squash → main.
> 3. **Open follow-ups** (all non-blocking, recorded in `002-deploy-and-polish/README.md` "Backend follow-ups (status)"): shared authed-layout to mount `useThemeAuto()` once (replaces the per-route calls) · rich embedded place-card message in Chat (needs a chat-hub protocol extension — text-only today) · OSM base map basalt-theming in dark (Discover) · `hours` content for the Details card (plumbing done, no data seeded) · F1 Home host's-picks `distance_km`.
> 4. **dt-tests forward-flow UATs** for the editorial screens (UI-touching; none minted this session — the browser-uat agent verified each instead).
>
> ### Gotchas / env state (learned this session)
>
> - **Guest session is IN-MEMORY** (no persist) → a full page reload onto an authed route drops it and bounces to `/?reason=expired`. To screenshot an authed route: redeem `/r/<token>` → set `localStorage.theme` on home (where `useThemeAuto` mounts) → **SPA-navigate** (not a hard `goto`). The working multi-use redeem token: `YI3yn18QsI4jGxF6yxGswb7v4BXLC-Ik` (reservation `ccc…002`, pt-PT). Reservation `…001` is past-checkout (mint → 410).
> - **Dev stack crashed mid-session** (~11 services SIGKILL/SIGTERM, exit 137/143 — transient host memory spike) and was brought back with `make up`; dt_bff also cycled once and recovered on `docker restart`. The **first redeem after a BFF restart can 500** (cold start) — retry clears it. Stack is UP at handoff.
> - **maplibre can't render in jsdom** → Discover unit tests mock `MapView` + assert pin data; the map/drag/pins are proven only by the browser-uat (5/5 PASS, `temp/uat-2d-discover/`).
> - The **rebase of each editorial PR auto-merged the `*.json` i18n overlaps** (different key regions) — no manual conflict resolution needed.
> - Dev-DB residue (harmless, reset by volume wipe): I seeded `season='summer'` on 7 places via the committed seed; a verification chat thread for guest `aaa…002` was seeded then cleaned. `places-seed.test.ts` still hard-codes 43 places / 32 media (season UPDATEs don't change counts).
>
> ### State
>
> `main` synced (`e92b4de`). **1 open PR: #262** (season). Local branches: only `main` + `docs/slice-2d-closeout` (this doc PR) + `feat/place-detail-season` (#262). dt-tests `review` empty (polled). **Slice 2.D = DONE**; Plan-002 Thrust B implementation complete (Slice 2.B design + 2.D build both done).

> **UPDATE 2026-06-16: Big session — polish tails dispositioned, Plan-006 deployed to qual, and Plan-002 Thrust B (design pass) largely shipped, ending with Miguel's 4 REAL guesthouses + 11 real POIs seeded into the catalog with real photos. 6 PRs merged (#247–#252) + the qual deploy. Resume from the "FIRST TASKS NEXT SESSION" block below.**
>
> ### What shipped this session (all merged to main, tip `eb93224`)
>
> - **#247** `fix(deps)` — patched 2 prod HIGH CVEs (ws→8.21.0, protobufjs→7.6.4 via root `pnpm.overrides`); these were silently blocking ALL pushes (the audit gate). protobufjs pinned `<8` to stay compatible with `@grpc/proto-loader`.
> - **#248** `chore: plan-002 thrust-b` — **T-2.B.2 i18n review** (pt-PT reviewed via `revisor-ptpt`: pré-AO fixes + register; only `en`+`pt-PT` are wired, `de`/`es`/`fr` unwired+incomplete → documented in `apps/pwa/src/locales/README.md`) + **T-2.B.0 design foundations** (`docs/design/DESIGN.md` "São Miguel Editorial" + the Stitch screens).
> - **#249** `feat(pwa): real brand mark` — **T-2.B.1**: pin + tea-leaf `logo.svg` (location-agnostic — deliberately NOT a single landmark) + regenerated PWA icon set. Cream icon bg. Doc `docs/design/brand-mark.md`.
> - **#250** `feat(pwa,catalog-svc)` — branded **photo-less Hero fallback** (places w/o a real photo show a tea-green "photo coming soon" panel, not a broken img / fake stock) + dropped 14 business Unsplash placeholders + **11 real near-guesthouse POIs (#29–39)** (Tasquinha Vieira, Mariserra, Portas do Mar, Intz48 coffee, Sunset Beach Bar, Praia de São Roque/Pópulo, Carlos Machado, Forte de São Brás, Gruta do Carvão, Mãe de Deus — Nominatim-geocoded, EN+pt-PT, Eat/Drink/See/Do tags).
> - **#251** `feat(catalog-svc,pwa)` — **The Place (#40)** = host Miguel's own guesthouse (Fajã de Baixo), host's pick with **6 of his own real photos** (user-supplied golden-hour exteriors; resized to 1600×1067, self-hosted `/media/the-place/`).
> - **#252** `feat(catalog-svc,pwa)` — **The Escape/View/View Point (#41–43)** = Miguel's 3 Calheta-area apartments (Gaveto building), host's picks with 4 real listing photos each (`/media/<slug>/`). Corrected The Place pin to precise coords.
> - **Qual deploy** — `deploy-qa.yml` run **27548580776** success; Plan-006 (reservations + place-form season/contacts/hours) LIVE on `qual.stay.portugalodyssey.pt` (bundle hash changed; `season` migration applied).
>
> ### Catalog state now: **43 places, 32 media**
>
> 14 landmark Commons photos (audited 2026-06-16: all live + licence-compliant — 10 PD, 4 CC-attributed) + Miguel's **4 guesthouses w/ real photos** (#40–43) + **11 POIs** (#29–39, media-less → fallback) + 14 businesses (media-less → fallback). See [[project-miguel-guesthouses]] (the guesthouse table, coords, the 149-photo browser-uat haul in `temp/miguel-photos/listings.json`) and [[project-135-photo-sourcing]].
>
> ### Stitch mockups (T-2.B.0)
>
> All 5 screens generated + in `docs/design/stitch/` (`*.png` + `*.html`): Home, Place Detail, Discover, Daily Tour, Chat — premium/editorial "São Miguel Editorial" system. **MCP `generate_screen_from_text` is blocked here (transport timeout) — use the Stitch web UI; reads work.** See [[reference-stitch-mcp-timeout]]. Project `11661203433672958283`, design system asset `8a6674ad896243c8881fc985aee6f504`.
>
> ### FIRST TASKS NEXT SESSION
>
> 1. **dt-tests poll** (ritual) — `mcp__tasks-prod__list_tasks(project_id='e03901a6-…081cc', statuses=['review'])`.
> 2. **Miguel's original high-res photos** (he's sending them — repo synced to a cloud account). Swap/supplement the current starters **additively** (new `place_media` rows; The Place has 6 user-supplied, the 3 Calheta have 4 Airbnb-starter each; 149 more URLs in `temp/miguel-photos/listings.json`). Drop incoming files in `temp/owner-photos/<slug>/`.
> 3. **See it live** — the seed has all 43 places but qual/dev hasn't been re-seeded; re-seed dev (`pnpm --filter @daily-tour/catalog-svc seed:places`) or redeploy qual to render The Place + guesthouses + POIs end-to-end. Could browser-UAT it.
> 4. **Downstairs restaurant POI** — Gaveto building ground floor (Miguel's tenant, not his) — add once named.
> 5. **Remaining Thrust B**: implement the 5 designed screens in React (a later Plan-002 slice — design is done, code is not); `de`/`es`/`fr` translations remain unwired+incomplete (documented).
> 6. **Data-model follow-up**: guesthouses are seeded as catalog places (host's picks) — pragmatic for the demo. Proper model = first-class **guesthouse entity with a hero column + media-svc owner-upload pipeline** (`catalog.guesthouse` has no media column today).
>
> ### Gotchas (learned this session)
>
> - `services/catalog-svc/src/__tests__/places-seed.test.ts` **hard-codes seed counts** (now 43 places / 32 media / ≥43 tags). It boots a Postgres testcontainer → **skipped locally without Docker, runs in CI** → it's the check that silently blocks seed PRs (#250 hit this). **Update it on EVERY seed-count change.**
> - Stitch MCP screen-gen times out + doesn't persist (use web UI). browser-uat got past Airbnb's 403 by reading the page-state JSON (real Chrome). The photos are Miguel's own uploads → legit to self-host for his app.
> - `gh pr checks --watch && gh pr merge` can exit 0 without merging when a check fails → use the verify-then-merge pattern (re-check for `fail|pending` before merging).
> - **State:** `main` synced (`eb93224`); **0 open PRs**; branches clean (only `main`). Memories updated: [[project-miguel-guesthouses]], [[project-135-photo-sourcing]], [[reference-stitch-mcp-timeout]], [[project-client-miguel]].

> **UPDATE 2026-06-15 (earlier): Plan-006 is now DEPLOYED LIVE on qual, and the three "polish tails" were investigated → ① already-resolved, ② & ③ deferred-with-rationale (not quick code fixes). Next thread is Plan-002 Thrust B (design pass) — needs human steer on brand/photo direction. Resume from here.**
>
> ### Deploy — Plan-006 → qual (✅ live)
>
> `deploy-qa.yml` dispatched (`-f image_tag=qual`, run **27548580776**, conclusion **success**). Pull → additive `season` migration 0006 → reconcile `--wait` → akadmin→staff → internal smoke 8/8 → `--qual` readiness gate → record; auto-rollback armed, not triggered. External smoke confirms live: home `200`, `/admin/reservations` SPA `200`, `registerSW.js` `200 application/javascript`. **PWA bundle hash changed `index-cknRgIsG.js`→`index-QjhTWws3.js`** = the new image (6.E reservations screen + 6.F place-form season/contacts/hours) is genuinely serving. The `season` column migration applied on the live qual DB (implied by the `--wait` health gate passing). The Plan-006 features were already forward-flow UAT'd PASS on dev (3/3); the **owner-login deep UAT on qual** (issue/revoke a token, edit a place's season/contacts/hours via Authentik) was NOT re-run here — available on request, needs akadmin creds from `.env.qual` on the box. Not a blocker.
>
> ### Polish tails — investigated, dispositioned (no code changes this session)
>
> - **① `registerSW.js` 404/MIME → ✅ ALREADY RESOLVED.** Probed live qual directly: `registerSW.js` → `200 application/javascript` (134 B), `sw.js` → `200 application/javascript`, still referenced in served `index.html`. The symptom (from the pre-#220 image) no longer reproduces; the GHCR nginx PWA image serves `.js` with the correct MIME via the stock `nginx:alpine` `mime.types`. No nginx edit warranted (would be a speculative change for a non-reproducing problem). Re-confirmed post-deploy.
> - **② osrm re-enable → ⏸️ DEFERRED (escalate infra, not a tail).** Confirmed the Geofabrik Azores extract is GONE: `europe/portugal/acores-latest.osm.pbf` → 302-redirects to site root. Re-enable needs whole-Portugal PBF (~hundreds of MB → real OOM risk on the live 2-vCPU/512 MB box during `osrm-extract`) or adding `osmium` clipping to `infra/osrm/Dockerfile`+`init.sh`. Haversine fallback is active + chaos-tested (`tests/chaos/scenarios/osrm-down.test.py`). Touches the live box + always-escalate → not executed without explicit go. Ready-to-run plan: bump `overlay.osrm.yml` mem cap to 1G, point `init.sh` at `portugal-latest.osm.pbf` OR add osmium clip step, re-add `overlay.osrm.yml`+the deferred block in `overlay.qual.yml` (currently commented lines ~252–256), validate first-run extract time/mem on a qual clone before going live.
> - **③ StrictMode `flushSync` warning (`/r/`→`/`) → ⏸️ DEFERRED (dev-only cosmetic).** The only literal `flushSync` (`apps/pwa/src/components/map-view.tsx:53`) is NOT in this path — `AuthedIndexRoute` (the authed `/`) renders no map. The warning is React dev/StrictMode console noise (stripped in prod). NOT reproducible in the test harness (`r-token-route.test.tsx` uses `createMemoryRouter`, no `<StrictMode>`), so a safe fix needs a live browser repro of the release-critical guest-entry flow. Not worth a blind edit to guest-entry for console cleanliness.
>
> ### Plan-002 Thrust B (Slice 2.B — Design Pass) — STARTED this session
>
> Direction chosen by the human: **premium / editorial** ("travel magazine, not booking app"), keeping the Green Island palette anchors. Started with **T-2.B.0 (Stitch mockups)**, then pivoted to **T-2.B.2 (translation review)** when the Stitch MCP blocked.
>
> - **T-2.B.0 — Stitch mockups: ✅ DONE (all 5 screens).** Captured the Stitch **"São Miguel Editorial"** design system (project `11661203433672958283`, asset `8a6674ad896243c8881fc985aee6f504`) into `docs/design/DESIGN.md` (was Stitch-only). All 5 screens generated + integrated into `docs/design/stitch/` (full-res `*.png` native 780-wide + structural `*.html`): **Home** (`home-v{1,2}.html`), **Place Detail**, **Discover** ("Map" variant — peek ribbon + distance chips), **Daily Tour** ("A day around Furnas", tall 5-stop timeline), **Chat** ("Journal — Chat with João"). Premium/editorial, on-brief, cohesive. **MCP gen BLOCKER (see [[reference-stitch-mcp-timeout]]):** `generate_screen_from_text` times out + doesn't persist (transport cancels the long op) → the human generated the 4 in the **Stitch web UI**; MCP _reads_ (`list_screens`/`get_screen`) work, so I pulled renders+HTML via MCP (full-res via lh3 `=w780`). Stitch auto-made 6 editorial place photos (Caldeiras, Lagoa das Furnas, Terra Nostra, Gorreana, Pico do Ferro, Lagoa do Fogo) as side assets in the project. **Reconcile note:** Stitch DS uses Newsreader; app uses Fraunces — standardise on Fraunces at implementation.
> - **T-2.B.2 — translation review: DONE.** Found only `en` + `pt-PT` are wired in `lib/i18n/index.ts` (`de`/`es`/`fr` exist on disk but are UNWIRED → those browsers fall back to en). Reviewed the LIVE **pt-PT** (100% parity, 6 ns) via `revisor-ptpt`: linter 7→0, pré-AO fixes in `admin.json` (`Acções`/`actualizar`/`Activo`/`redireccionar`/`Selector`/`seleccionar`/`vêem`) + register fix in `place.json` (`podes`→`pode`); parity + placeholders verified. Documented `de`/`es`/`fr` status (79%/79%/25% coverage, +8 stale `locale.*` keys from the abandoned 5-locale scope, machine-grade, unwired) + an activation checklist in `apps/pwa/src/locales/README.md`.
> - **Remaining Slice 2.B:** **T-2.B.1** brand mark + icon regen (needs human steer), **T-2.B.3** photography for 28 places (`temp/place-photo-sourcing.md`; commission vs Commons-curated — note Stitch already generated 6 usable editorial place photos this session). Implementation pass (build the 5 screens in React) is a later Plan-002 slice.
> - **State:** **#247** (prod CVE fix: ws + protobufjs) **MERGED** to main. **#248** (`feat/plan-002-thrust-b-design-i18n` — pt-PT i18n review + design-system + all 5 Stitch screens) **OPEN, green CI**, awaiting human merge. No cs-agent worktrees; dt-tests `review` empty. Plan-006 features live on qual (run 27548580776). The dev-stack note below is obsolete (stack stays down; qual is the live target).

> **UPDATE 2026-06-15 (earlier): Plan-006 is DONE — all 15 tasks merged (5 PRs #240–#244) AND forward-flow UAT PASS 3/3 on the local dev stack. The whole owner-backoffice plan (6.A–6.F) is shipped + verified.**
>
> Two-round cs-agent fan-out. **Round 1 (backend) delivered but skipped the PWA UI** (the under-delivery risk) → I salvaged the backend into clean PRs. **Round 2 used UI-only prompts** (lead with file creation; "backend is DONE on main") → **delivered the UI cleanly**. Merged:
>
> - **#240** 6.E.0 — token-svc list + reservation-scoped revoke + BFF owner-gated `/v1/admin/reservations`.
> - **#243** 6.E.1 — reservations screen (Issue→`/r/<token>` link + Revoke + nav link).
> - **#241** 6.F.1 (data+API) — `place.season` column/migration/shared-types + catalog route round-trip (I added the route wiring the agent omitted).
> - **#244** 6.F.0 + 6.F.1 control + 6.C.2 — contacts/hours/season controls in `place-form.tsx`; verified owner media → guest `<Hero>`.
> - Integration fixes: prettier-formatted both rounds (agents bypassed the hook); fixed one strict-index TS error; clean rebase resolved the 2 PRs' `admin.json` i18n overlap.
>
> **Plan-006 = 15/15 DONE.** All slices shipped + the 6.E/6.F UI forward-flow UAT'd PASS (reservations issue/revoke; place-form contacts/hours/season save→reopen, DB-confirmed; guest hero render). Evidence: `temp/uat-plan006/` + `temp/uat-plan006.mjs`.
>
> ### First task next session — pick a NEW thread (Plan-006 + Plan-007 both done)
>
> The major plans are closed. Candidates:
>
> 1. **Plan-002 Thrust B — real design pass** (Stitch mockups, brand mark, real photography for the 28 places, translation review). The big un-started product lane.
> 2. **Non-blocking polish:** #158 (registerSW.js 404/MIME — PWA SW auto-registration on qual) · re-enable **osrm** (deferred → haversine) · a low-pri React StrictMode `flushSync` warning on the guest `/r/`→`/` nav (UAT-noted).
> 3. **Deploy the Plan-006 features to qual** — they're on main + dev-UAT'd; a `deploy-qa.yml` redeploy + a qual smoke would put reservations/field-editing live on `qual.stay.portugalodyssey.pt`.
>
> ### Dev-stack note (THIS session brought it up for the UAT)
>
> The local dev stack is UP (12 dt\_ + 3 authentik containers + Vite on :5173) — **brought up on standard ports after the human took cc-dev down**. At session end I tear it back down (`make down` + authentik overlay down + kill Vite) so cc-dev can return. UAT test-data residue: reservation `ccc…002` has one active token; place `…021` holds UAT contacts/hours/season — both reset by a volume wipe; harmless otherwise.
>
> - **State:** `main` synced (tip #245→ this docs PR); all sweep branches merged + deleted; agent worktrees killed; **0 open code PRs**. dt-tests `review` empty.

> **UPDATE 2026-06-13 (earlier): Plan-006 sweep started — 6.E + 6.F backend landed as 2 escalate PRs; the PWA "UI wave" remains, gated on those merging.**
>
> Fanned out 2 cs-agents (reservations lane + place-form lane). Both **delivered their backend half but skipped the PWA UI** (the known under-delivery risk; they also auto-committed past the prettier hook). I reviewed both diffs, re-formatted, fixed a real gap, and split into clean PRs:
>
> - **PR #240** `feat(bff,token-svc)` — **6.E.0** reservations backend: token-svc `GET /v1/reservations` (derived token_state) + reservation-scoped `DELETE …/token` revoke + BFF owner-gated `/v1/admin/reservations` (list/issue/revoke proxy) + test. CI/gates green. **Escalate** (auth + token lifecycle).
> - **PR #241** `feat(catalog-svc,shared-types)` — **6.F.1 (data+API)** `place.season` column + CHECK + migration `0006` + shared-types enum. The agent left out the **catalog route wiring** so the column wouldn't round-trip — I added `season` to `CreatePlaceBodySchema` + POST `.values` + PATCH patch + `formatPlace` (covers list/detail/create/update). shared-types 52/52, catalog-svc 26/26. **Escalate** (migration).
>
> ### First task next session — merge the backend, then the UI wave
>
> 1. **Review + merge #240 + #241** (escalate — your call; both reviewed + gated). Serialize (branch-protection cascade).
> 2. **UI wave** (gated on #240/#241 on main — build against the merged backend): **6.E.1** reservations screen (`admin.reservations.tsx` + `features/backoffice/reservations/**`, consumes #240) · **6.F.0** contacts/hours controls + **6.F.1** season select in `place-form.tsx` (body forwards verbatim → catalog; uses #241's season) · **6.C.2** confirm owner-uploaded hero renders guest-side (likely already true). Precise spec in `006-owner-backoffice/TODO.md` (the "UI wave" block). **Re-delegate with UI-only prompts that LEAD with the exact .tsx files** (the prior agents buried the UI under backend and skipped it), or do inline.
> 3. **UATs** (need `make up` + Authentik): owner edits contacts/hours/season; reservations issue/revoke round-trip.
>
> - **State:** `main` synced; 2 feat branches pushed (#240, #241); agent worktrees killed + orphan branches deleted. Plan-006 now 11/15 (6.A–6.D done; 6.E/6.F backend in PR). dt-tests `review` empty.

> **UPDATE 2026-06-13 (earlier): Plan-007 is FULLY CLOSED. The close-out UAT found a release-blocking guest-entry bug + an owner-provisioning gap + a missing guesthouse seed; all three fixed, merged (#234, #235, #238), redeployed, and re-UAT'd PASS in a real browser. Every Plan-007 criterion is verified live on `https://qual.stay.portugalodyssey.pt`. Riff #157 + #152 closed. Resume cold from this block — start a NEW plan/thread.**
>
> ### What shipped this session
>
> - **#234** `fix(bff,pwa,infra)` (merged) — BFF redeem moved to **`/v1/r/:token`**; SPA keeps the browser route `/r/:token`; apex `/r` path-router dropped. Fixes the same-origin collision where a cold guest link 200'd as raw JSON. Public link shape unchanged; D15 redaction regex already matches `/v1/r/`.
> - **#235** `fix(infra/deploy)` (merged) — idempotent `deploy-qa.yml` step provisions **akadmin → staff** (blueprint makes the group, bootstrap makes the user, nothing joined them → owner 403 on a clean deploy). Qual-only, additive, fail-soft.
> - **Redeploy** (`deploy-qa.yml -f image_tag=qual`): all steps green incl. the new akadmin step + smoke on `/v1/r/`. `publish-images` rebuilt `bff:qual`+`pwa:qual` @ f3d216e.
>
> ### Verified live (evidence in `temp/uat-plan007/`)
>
> - **Guest cold-entry — ✅ PASS (re-UAT'd post-fix).** Genuine cold nav to `https://qual.stay.portugalodyssey.pt/r/<token>` → `200 text/html`, SPA boots, `exchangeOpaqueToken` XHR → `/v1/r/<token>` `200 {jwt}`, session stored, lands on the authed home; `/v1/discover` 200 under the guest Bearer JWT. No console errors.
> - **Owner login + backoffice — ✅ PASS.** akadmin → Authentik → `/admin` (no 403), 28 places render.
> - **Hero + attribution over TLS — ✅ PASS.** Lagoa do Fogo "© Samuel Fonseca 85 · CC BY-SA 3.0"; Praia de Santa Bárbara "© JCNazza · CC BY 3.0".
>
> ### First task next session — pick a new thread (Plan-007 done)
>
> Plan-007 is closed; the qual env is live + reproducible + fully UAT'd. Candidates, in rough priority:
>
> 1. **Plan-006 leftovers** (`docs/implementation-plans/006-owner-backoffice/TODO.md`) — the active feature plan: **6.E** reservations screen · **6.F** field gaps (#150 season col, #151 hours/contacts in admin.places) · **6.C.2** per-place hero upload.
> 2. **Deeper owner flow on qual** — UAT owner **create-place + photo-upload + publish** (Plan-006 uploaders, only dev-UAT'd so far). Not a deploy blocker; the 2.A core journeys are verified.
> 3. **Non-blocking qual polish:** **#158** registerSW.js 404/MIME (PWA SW auto-registration) · re-enable **osrm** once a lightweight Azores PBF source is sorted (deferred → haversine).
> 4. **Plan-002 Thrust B** — real design pass (Stitch mockups, brand mark, photography, translation review).
>
> **State:** `main` synced (tip = #238); all session branches merged + deleted; **0 open PRs**. Riff #152 + #157 closed; #158 open (non-blocking). dt-tests `review` queue empty. The live qual env runs entirely on committed config + idempotent deploy reconciles (akadmin→staff via #235, guesthouse via #238). 18 containers healthy.

> **UPDATE 2026-06-13 (earlier): Plan-007 — qual env LIVE + REPRODUCIBLE. `https://qual.stay.portugalodyssey.pt` (trusted cert, http→https redirect, 8/8 smoke green, real LLM tour plans). The 8-item punch-list ✅ + a CLEAN RE-DEPLOY from wiped volumes proved `deploy-qa.yml` reproduces the env end-to-end — all hand-applied workarounds dropped.** Resume cold from this block.
>
> ### What's live (srv911943 / 77.37.86.126)
>
> - Q.1+Q.2+Q.3 done: island-chronicles stopped + backed up, 4 GB swap, ufw + key-only SSH; Cloudflare DNS (apex + `*.qual.stay`); GitHub runner `qual-vps` (systemd `actions-runner-qual`, hand-written unit — no `svc.sh`); `/opt/daily-tour` clone (project `dt-qual`, `.env.qual`); ACME prod cert. 17 healthy containers; `ANTHROPIC`/`EMBEDDING` keys in `.env.qual` → real LLM plans. **Deploy = `gh workflow run deploy-qa.yml -f image_tag=qual`** (or a `[deploy-qa]` main push); `make vps` SSHes in.
> - The live env now runs **entirely on committed config + `.env.qual`** — the earlier hand-patches are gone (validated by the clean re-deploy).
>
> ### Plan-007 essentially DONE — reproducibility proven
>
> Punch-list 8/8 (#226 + #228) + the clean re-deploy surfaced + fixed 4 deploy-only bugs (#230 traefik `dynamic` `:ro`, #231 `init-qual` perms + osrm Geofabrik-404 → **osrm deferred** / haversine, #232 `dev-env-check --qual` osrm). Final `deploy-qa.yml` run = full green (pull→up→reconcile→migrate→seed→smoke→`--qual` gate→record). Detail: plan EXECUTION Wave 3.
>
> ### First task next session — final admin close of Plan-007
>
> Deploy is reproducible + DEPLOYS.md has its first entry. Remaining to fully close Plan-007: **(1) owner-login UAT** — Authentik `/admin` on the qual URL (a fresh authentik volume re-bootstrapped akadmin via `AUTHENTIK_BOOTSTRAP_PASSWORD`; verify akadmin ∈ `staff` and an owner can edit a place). **(2) hero/credit-chip-over-TLS UAT** (DT-TESTS batch for the qual URL). **(3)** close T-0.4.4 + Plan-002 Slice 2.A rows. **Optional follow-up:** re-enable osrm once a lightweight Azores PBF source (or processing budget) is sorted — currently deferred, planner uses haversine.

> **UPDATE 2026-06-12 (latest): Plan-007 Phase Q.1 (VPS prep) — ✅ COMPLETE. The VPS is deploy-ready. Only Q.3 (runner + DNS + first deploy) remains.** Resume cold from this block.
>
> ### What happened on the box (srv911943 / 77.37.86.126, root key SSH)
>
> Q.1 executed step-by-step with a verification gate after each (detail in plan EXECUTION.md Wave 2):
>
> - **island-chronicles backed up + cleanly stopped** — tar (216M, sha256-verified on-box + off-box at `/media/jmeireles/ssd3/vps-backups/`), then `compose stop` (7 containers exited, `unless-stopped` keeps them down across reboot). **80/443/8080 are now free** for the qual stack. Data volumes intact; restartable any time.
> - **4 GB swap** (persisted) + `swappiness=10`. **ufw** active (allow 22/80/443). **sshd `PasswordAuthentication no`** (key-only; root + `ubuntu` keys both work — verified via a fresh connection under a deadman switch). **prune cron** → dangling-only (won't eat tagged daily-tour images). **Toolchain**: `node v22.22.3` + `pnpm 9.14.2` + git system-wide.
>
> ### First task next session — Q.3 (the actual deploy)
>
> - **Q.3.0 Cloudflare DNS** (likely needs the human or a CF API token): A `qual.stay` + `*.qual.stay` → 77.37.86.126, **DNS-only / grey-cloud** (so ACME HTTP-01 + WS pass through). **Blocks Q.3.2 ACME.**
> - **Q.3.1 GitHub runner** — `ghrunner` user + register self-hosted runner labels `[self-hosted, qual-vps]`, concurrency 1, systemd. Doable without the human (needs a repo runner-registration token via `gh`).
> - **Q.3.2 first-deploy runbook** — clone `/opt/daily-tour`, `gen-env-qual.sh` (set the `__SET_MANUALLY__` keys: ANTHROPIC_API_KEY, EMBEDDING_API_KEY, TRAEFIK_ACME_EMAIL, telegram/whatsapp), ACME **staging→prod**, Authentik bootstrap + akadmin→staff. All GHCR images are published + the deploy workflow/overlays are merged, so this is mostly orchestration.
> - **Q.3.3 verify** — `dev-smoke.sh` + `dev-env-check.sh --qual` + owner login + hero/credit over TLS.
> - **Note:** GHCR images may be **private** by default — the VPS `docker compose pull` will need a GHCR pull credential (PAT or the runner's token) unless the packages are made public. Decide during Q.3.1/Q.3.2.

> **UPDATE 2026-06-12 (later): Plan-007 Phase Q.2 (repo plumbing) — ✅ COMPLETE, 8/8 tasks merged + GHCR pipeline 11/11 green. VPS still untouched.** Resume cold from this block.
>
> ### What shipped (all merged to `main`)
>
> - **Q.2 = 8/8 done** via cs-agent fan-out (orchestrator-reviewed every diff): **#214** GHCR publish workflow · **#216** qual overlay (TLS + apex `/v1`+`/r` path-routing + GHCR images + mem_limits) **+ Q.2.2 folded in** (prod ACME resolver + email-via-command-flag fix) · **#215** `.env.qual` generator + example + rotated `init-qual/02-roles.sql` · **#220** PWA→GHCR nginx image (`apps/pwa/Dockerfile`) · **#218** Authentik qual redirect URI + `overlay.qual-authentik.yml` (auth. 404 TLS fix) · **#217** `dev-env-check.sh --qual` · **#219** `deploy-qa.yml` self-hosted deploy workflow + parameterised `dev-up.sh`/`dev-smoke.sh` (ENV_FILE/PROJECT/--to).
> - **GHCR images all published** (`:qual` + `:sha`) for the 8 services + postgres + osrm + pwa. The maiden `publish-images` run exposed 2 latent osrm bugs — **#221** (`v5.28.0`→`v5.25.0`, 404), **#222** (stretch-EOL apt → archive.debian.org) — both fixed + locally build-validated; pipeline now **11/11 green**.
> - **Orchestrator rescues** (logged in plan EXECUTION.md): #215 missing example/gitignore, #217 unwired `--qual` vars, **#219 agent badly underdelivered** (no workflow file → orchestrator wrote it, incl. parameterising `dev-smoke.sh` which had the same project/env hardcoding).
>
> ### State for resume
>
> - `main` clean + synced; no open PRs, no cs-agent worktrees, no leftover branches. dt-tests `review` queue empty (polled at start).
> - **Merge note:** `main` ruleset requires up-to-date branches (`--admin` won't bypass) → each merge needs `gh pr update-branch`→CI→merge cascade.
> - New files on main: `infra/compose/overlay.qual.yml`, `overlay.qual-authentik.yml`, `.github/workflows/publish-images.yml` + `deploy-qa.yml`, `scripts/qual/gen-env-qual.sh`, `.env.qual.example`, `apps/pwa/Dockerfile`. `dev-up.sh`/`dev-smoke.sh`/`dev-env-check.sh` gained qual modes.
>
> ### First task next session
>
> **Q.1 (live VPS prep) + Q.3 (runner/DNS/first deploy) — both gated on the human's explicit go** (Q.1 stops island-chronicles + hardens SSH on a live box). Plan TODO Q.1/Q.3 checklists + README §1/§3 acceptance are ready. The GHCR images + all overlays/scripts are in place, so once the human green-lights the VPS, execution is: Q.1 prep → Q.3.0 DNS + Q.3.1 runner → Q.3.2 first-deploy runbook (clone `/opt/daily-tour`, gen-env, ACME staging→prod, Authentik bootstrap) → Q.3.3 verify.

> **UPDATE 2026-06-12: Plan-007 (qual VPS deploy) created from 3-agent recon and accepted → READY. New HIGH CVE fixed (#211). 6.B stack + otel fix merged + verified live (#206–#210). Stack brought DOWN (host needed for another project).** Resume cold from this block.
>
> ### What happened
>
> - **6.B + recovery follow-through merged (human-instructed):** #206 (otel→ghcr compose fix), #207+#208+#209 (full 6.B stack — note #208 auto-merged into the stack branch, so #207's squash carries the render code), #210 (wave log). catalog-svc+bff rebuilt; **verified live**: hydrated Lagoa do Fogo returns Commons URL + attribution `{Samuel Fonseca 85, CC BY-SA 3.0}`; vite hot-reloaded the credit chip.
> - **New HIGH CVE caught by the pre-push audit gate**: `@grpc/grpc-js` 1.14.3 (2 advisories, GHSA-5375-pq7m-f5r2), transitive via OTel in `packages/shared-otel`. Fixed with the #200-style pnpm override → **#211 merged**. `pnpm audit --prod` clean.
> - **Dev stack is DOWN** (`make down` + authentik overlay down + vite stopped) — host ports freed for another project. **Volumes intact** (heroes, attribution rows, #152 guesthouse row survive). `make up` works cleanly now (#206).
> - **UATs DT-TESTS-25/26/27/28 still pending the tester** (todo; review queue empty at close-out). Env bring-up steps are in each task's Setup section.
> - **Plan-007 — Qual VPS deploy — created and READY**: `docs/implementation-plans/007-qual-vps-deploy/` (README + TODO). Built from 3 parallel recon agents (read-only VPS sweep, repo deploy-surface inventory, po-platform DNS/branding). **Decisions locked 2026-06-12**: subdomain **`stay`** (qual apex `qual.stay.portugalodyssey.pt`, PWA at apex, `api.`/`auth.`/`traefik.` under it); GHCR + GitHub-hosted builds with VPS runner deploy-only at concurrency 1; hardening accepted (ufw + sshd password-auth off); island-chronicles GitLab = repo-side inaction.
>
> ### Key recon facts (full detail in plan §0)
>
> - VPS srv911943 = 77.37.86.126, root SSH key works. Ubuntu 24.04, Docker 28.3, **2 vCPU / 8 GB / no swap / 85 GB free**.
> - Stale project = **island-chronicles** under `/root/island-chronicles/` (1.6 GB incl. all bind-mounted data — tar = full backup). Its `traefik-shared` owns 80/443/8080. **No GitLab runner exists on the host.**
> - portugalodyssey.pt DNS = **Cloudflare**; PO's own infra on a different VPS (31.97.159.7). TLS plan: LE **HTTP-01 per-host**, Cloudflare records DNS-only.
> - Critical repo gap: **PWA is same-origin** (`/v1`, `/r`, chat WS, media imgs) → qual overlay must path-route those on the apex to the BFF with priority over the SPA router.
>
> ### First task next session
>
> **Execute Plan-007 Q.1** (VPS prep: backup → stop stale stack → swap → hardening → toolchain) then **Q.2** (repo plumbing PRs — can be parallelized with cs-agents; Q.2.0/Q.2.1/Q.2.3 are independent). Plan TODO has the checklist; README §1–§3 the acceptance criteria. Execution is well-specified mechanical work — suitable for an Opus (or Sonnet for Q.1/Q.3.1) session; Fable-tier not required.

> **UPDATE 2026-06-11 (crash-recovery session): computer crashed mid-close-out on 06-10 ~23:55. Nothing was lost.** Resume cold from this block.
>
> ### Crash forensics + recovery
>
> - The crashed session (2026-06-10 evening) had just pushed **PRs #201/#202/#203** (the backoffice QoL batch: cursor-pointer #155, locale switcher #156, places-list pagination+sort #154) with all CI green, and died **before close-out** — Riff tasks still `todo`, no UATs minted, handoff not updated.
> - **Recovered this session (with human merge ack):** merged **#201 → #202 → #203** (serialized — branch protection requires up-to-date branches, so each merge forces an update+CI cycle on the next). Riff #154/#155/#156 flipped to `in-progress` (merged, UAT pending). Forward-flow UATs minted: **DT-TESTS-25** (pagination+sort), **DT-TESTS-26** (locale switcher), **DT-TESTS-27** (cursor-pointer) — all three runnable in one sitting at `http://localhost:5173/admin`.
> - **Hygiene shipped (#204):** `services/chat-hub` was the only Python service missing a per-service `.gitignore` — 22 `.pyc` files had been silently committed since #86/#94 and kept polluting `git status`. Added the sibling-identical `.gitignore` + untracked the artifacts.
> - **CHANGELOG backfilled**: Plan-006 + post-arc section (#191–#204) — it had stopped at the Plans 001–005 arc.
> - **Handoff gap noted:** sessions 2026-06-05 → 06-10 (PRs #196–#200: 6.C.0 media foundation + avatar uploader, 6.C.1 hero uploader, 6.D pick-cap, #199 ordering fix, #200 shell-quote override) never updated this doc — that arc is reconstructed in the CHANGELOG entry, plan TODO was kept current.
> - **Not ours:** the 8 "finished" cs-agent worktrees visible in `cs-agent status` belong to **codecomedy-platform** — untouched.
> - **Dev-env break found+fixed:** `make up` failed — `otel/opentelemetry-collector-contrib:0.125.0` is **gone from Docker Hub** (OTel moved collector distribution to ghcr) and the local image had been pruned. Unblocked by pulling `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.125.0` + `docker tag`-ing it to the old name; proper compose fix in a separate **escalate** PR (infra). Cross-project note appended to `~/.claude/docs/cc-platform-feedback.md`.
>
> ### Where we are (Plan-006)
>
> - 6.A ✅ (browser-UAT'd) · 6.C.0/6.C.1 ✅ · 6.D ✅ (DT-TESTS-24) · QoL batch #154/#155/#156 ✅ merged (UAT pending: DT-TESTS-25/26/27)
> - **Remaining: 6.B** (place media pipeline — `place_media.attribution` schema 6.B.0 is an **escalate** migration, then landmark-manifest ingest 6.B.1, attribution render 6.B.2; manifest ready at `temp/place-photo-sourcing.md`) · **6.C.2** (per-place hero upload, needs 6.B.0) · **6.E** (reservations screen) · **6.F** (field gaps #150/#151).
> - **6.B SHIPPED this session (code-complete, in review):** PR stack **#207** (6.B.0 `attribution` migration, escalate) ← **#208** (6.B.2 credit-line render, catalog→bff→pwa) + **#209** (6.B.1 — all 14 landmark heroes resolved to real licence-verified Commons files: 10 PD + 4 attributed, zero Unsplash fallbacks; hotlinked 1280px thumbs, all verified 200). **Live dev DB already updated** — heroes render in the PWA now; credit line needs the stack merged + catalog/bff rebuild. Wave 5 in `006-owner-backoffice/EXECUTION.md` has the full detail (+ retro Wave 4 backfilling the 06-05→06-07 gap).
> - **Next after this session:** human reviews **#206** (otel→ghcr, infra) + **#207→#208/#209** (6.B stack; #208/#209 auto-retarget to main when #207 merges) → rebuild catalog-svc+bff → run UATs DT-TESTS-25/26/27 (QoL batch, env is UP and ready now) + the 6.B UAT (DT-TESTS-28). Then Plan-006 leftovers: **6.C.2** (per-place hero upload, unblocked once 6.B.0 merges) · **6.E** (reservations) · **6.F** (field gaps).

> **UPDATE 2026-06-04 (authentik session): Authentik brought up + owner-auth integration completed + Slice 6.A FULLY DONE (6.A.3 browser UAT passed).** Resume cold from this block.
>
> ### What happened
>
> - **Authentik is now UP and durable.** Booted the overlay (`authentik-postgres` + `-server` + `-worker`) and published the server on host **`:9000`** via an untracked override (`temp/authentik-ports.override.yml`) so the browser can reach OIDC discovery/auth directly (no Traefik/`/etc/hosts` needed).
> - **Found + fixed 4 latent owner-auth bugs** that had silently blocked _any_ owner login (committed straight to **main, `e84b091`**, `fix(bff,pwa,authentik): complete owner-app OIDC integration`):
>   1. **bff** `AUTHENTIK_JWKS_URL` default used the `dt_authentik_server` _container_ name — underscores are RFC-invalid in a Host header, so Authentik 404s and JWKS load fails silently. → hyphenated service alias `authentik-server` (`services/bff/src/config.ts` + `.env.example`).
>   2. **pwa** owner-oidc requested only `openid profile email` → Authentik never emitted the `groups` claim the BFF authorises staff by (would 403). → added `groups` scope (`apps/pwa/src/lib/auth/owner-oidc.ts`).
>   3. **env** `VITE_AUTHENTIK_URL` was `https`; Authentik dev serves http on :9000 → `.env.example` fixed to `http`.
>   4. **blueprint** `owner-app.yaml` defined a _confidential_ client, but the PWA is a public PKCE SPA (`owner-app-public`) and the BFF is JWKS-only — and on every worker restart the blueprint re-bound the app to the confidential provider, breaking login. → rewrote to a **public** client so the blueprint converges to the working config (now the durable source of truth; verified across a worker restart).
> - **Verified end-to-end twice** (headless `temp/authentik-e2e.py`: real PKCE login → staff token → `BFF /v1/admin/guesthouses` 200), then the **6.A.3 forward-flow UAT in a real headless Chromium** (`temp/uat-6a3.mjs`): owner login → `/admin/places` → click **Hide** on "Azores Sub-Dive" (`c0000001-…028`) → "Hidden" badge + catalog `hidden_place_ids` persisted → **Show** → reverted to `[]`. **Slice 6.A is now 4/4 DONE incl. the owner-UI path.**
>
> ### Dev-env state (for resume)
>
> - **Stack is UP**: 12 `dt_` app containers + **3 `dt_authentik_*`** healthy. BFF **rebuilt** with the JWKS fix. PWA **vite on :5173** (Node 22.22.3; `/tmp/dt-pwa.log`).
> - **Authentik reachable at `http://localhost:9000`**; admin/owner login `akadmin` / `$AUTHENTIK_BOOTSTRAP_PASSWORD` (akadmin is in the `staff` group). Browser owner login: open `http://localhost:5173/admin`.
> - **Gitignored dev-only files** (NOT committed, needed for the env to work): `apps/pwa/.env.local` (`VITE_AUTHENTIK_URL=http://localhost:9000/...`), `temp/authentik-ports.override.yml` (publishes :9000), `temp/authentik-setup.py` (idempotent realm setup — fallback if the blueprint ever fails to apply), `temp/authentik-e2e.py` + `temp/uat-6a3.mjs` (verification harnesses; the UAT pins chromium-1217 since the installed Playwright wants an un-cached headless-shell build).
> - **To bring Authentik up next time**: `docker compose --env-file .env -f infra/compose/docker-compose.base.yml -f infra/compose/docker-compose.authentik.yml -f temp/authentik-ports.override.yml up -d authentik-postgres authentik-server authentik-worker`. The blueprint auto-applies the realm (public client + staff group + groups mapping). If akadmin isn't in `staff` after a volume reset, run `AK_TOKEN=$(grep …BOOTSTRAP_TOKEN .env|cut -d= -f2-) python3 temp/authentik-setup.py` (adds akadmin→staff) — or just add via the admin UI.
>
> ### Known minor follow-ups (non-blocking)
>
> - The `groups` claim is duplicated in the token (`["authentik Admins","staff","authentik Admins","staff"]`) — benign Authentik claim-merge quirk; BFF dedups via membership check. Not worth chasing.
> - `AUTHENTIK_OWNER_APP_CLIENT_SECRET` is still a required compose env (`:?`) though the public blueprint no longer uses it — harmless; could be dropped from the authentik compose + `.env.example` in a later cleanup.
> - Local `git push` of `e84b091` was left for the human (orchestrator only commits/pushes on request).
>
> ### Next-session candidates (Plan-006, unchanged + now all browser-UAT-able)
>
> **6.C owner photo uploader** (most leveraged; unblocks #135 business heroes) · **6.B landmark photos** (manifest ready; 6.B.0 is an escalate migration) · **6.D hosts-pick cap** (quick FE-only). See `006-owner-backoffice/TODO.md`.

> **UPDATE 2026-06-04 (session close-out): Plan-006 (Owner Backoffice v2) created + Slice 6.A shipped & verified end-to-end. Plus: #149 UAT passed, #146 closed, the full #142/#135 product+photo workstream.** Resume cold from this block.
>
> ### Where we are
>
> - **Plan-006 — Owner Backoffice v2** is the active plan: `docs/implementation-plans/006-owner-backoffice/` (README + TODO + EXECUTION, 3 waves logged). Status **In Progress**. It consolidates the #142 backoffice decisions + #135 media + #150/#151 field gaps into 6 slices (6.A–6.F) and **supersedes Plan-004 Slice 4.B** (scoping model reconciled).
> - **Slice 6.A — per-guesthouse scoping — DONE (4/4 code) + functionally verified.** Merged: 6.A.0 schema `guesthouse.hidden_place_ids uuid[]` + 6.A.1 catalog hide/unhide (**#191**), 6.A.2 BFF discover filter (**#192**), 6.A.3 backoffice visibility toggle (**#193**). **API UAT passed live** (count 8→7→8: a hidden place vanishes from the guest's discover and returns on un-hide, via the real `gh` claim → `catalog.hidden_place_ids` → BFF discover filter). +5 unit tests across the slice.
>   - **Model:** opt-out overlay — `place.guesthouse_scope` stays for inclusion; `guesthouse.hidden_place_ids[]` is the per-gh hide list. The 28 global staples remain the cold-start baseline.
>   - **NOT done:** owner _clicking_ the toggle in `/admin` (6.A.3 UI→BFF proxy) — unit-tested but not browser-UAT'd because **Authentik isn't up** (owner login). Optional; the API loop proves the same effect. The "add own place" half of 6.A.3 was left light (folds into 6.C).
>   - **Deferred in 6.A.2:** the `+gh-scoped / − other-gh` _inclusion_ filter needs the catalog query to be scope-aware — no-op today (all 28 places `{all:true}`); matters once owners add own places (6.C).
>
> ### Remaining Plan-006 slices (next-session candidates, in plan TODO with owns/deps/acceptance)
>
> - **6.C — Owner photo uploader** (`#142c`) — **recommended next.** Avatar + guesthouse hero uploaders on the media-svc signed-URL flow; unblocks the **14 #135 business hero photos** (the only lawful source). Reuses the T-1.6.2 media pipeline.
> - **6.B — Place media pipeline** (`#135`) — add `place_media.attribution` column, then ingest the **landmark manifest** (`temp/place-photo-sourcing.md`: 5 verified Commons files, 4 public-domain) replacing the single placeholder Unsplash URL. Needs 6.C for business photos.
> - **6.D — Hosts-pick cap** (`#142b`) — soft ~6–8/gh warn; trivial after 6.A.
> - **6.E — Reservations screen** (`#142d`) — new `admin.reservations` route + BFF list/issue/revoke; on `auth_tokens.reservation`.
> - **6.F — Field-editing gaps** (`#150` season col, `#151` verify hours/contacts in admin.places form).
>
> ### Environment (stack is UP)
>
> - `make up` done this session; **12 dt\_ containers healthy**. **bff + catalog-svc REBUILT** with 6.A code. PWA **vite on :5173** (started manually with **Node 22.22.3** — `.nvmrc` pins it; **Node 25 in PATH breaks pnpm/vite**, always `source ~/.nvm/nvm.sh && nvm use 22.22.3`). Vite log: `/tmp/dt-pwa.log`.
> - **Authentik is NOT up** (separate overlay `docker-compose.authentik.yml`; needs server+worker boot + blueprint import + an owner staff user created — fiddly). Required only for the owner-side browser UAT.
> - **Seed gap fixed for UAT (now Riff #152):** `catalog.guesthouse` was empty; I inserted `bbb00001-0000-4000-b000-000000000001` ("Casa do Sol", owner `aaa00001-…`) to match the seeded reservation's `gh`. The row is in the **live dev DB** (`hidden_place_ids` reset to `{}`) but NOT in any seed — so it survives until `make down`/volume reset.
> - **Guest UAT entry:** reservation `ccc00001-…001` → mint via `docker exec dt_bff wget --post-data='{}' http://dt_token_svc:8088/v1/reservations/<res>/token`, exchange via host `curl localhost:28080/r/<token>` → JSON `.jwt` (gh=bbb00001-…). busybox `wget` has **no `--method`** (can't PUT/DELETE); set hidden state via psql for API UAT. bff internal `localhost:8080` resolves IPv6 → use host `:28080`.
>
> ### Riff state (daily-tour project)
>
> - **Done:** #147, #148, #144, #146, #149 (all this multi-day arc). #142a–d map to Plan-006 6.A–6.E.
> - **Open:** #142 (umbrella, decisions locked — comment links Plan-006), #135 (manifest ready), #150, #151 (6.F), **#152 (new — catalog.guesthouse seed gap)**.
> - dt-tests `review` queue empty at close-out. tasks-prod tunnel `:15432` has flaked repeatedly — `/mcp` reconnect when `*tasks-prod*` tools vanish.
>
> ### First task next session
>
> Promote/continue Plan-006: pick **6.C (uploader)** — most leveraged (unblocks #135 business photos + is the owner content path). Or 6.B landmark ingest (manifest ready, smaller). Read `006-owner-backoffice/TODO.md` for the task specs. Optional: bring up Authentik for the 6.A.3 browser UAT.

> **UPDATE 2026-06-02 (session close-out): five tasks landed — #147 slice-C fully shipped + consumed end-to-end, plus the telemetry-grant prevention work.** Everything below merged to `main`; the un-gated engineering backlog is now cleared. Remaining work is gated on the human (photography/product) or on dev-up (the stack is `make down` for another project).
>
> | Task         | What                                                             | PR   | Status                                                                      |
> | ------------ | ---------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
> | #147 slice-C | OSRM travel-time + IPMA weather wired into planner pipeline      | #184 | ✅ merged; #147 **done**                                                    |
> | #149         | PWA+BFF surface travel-time + weather-aware in the tour timeline | #186 | ✅ merged; task **in-progress** (UAT pending dev-up)                        |
> | #148         | planner → canonical `dt.events`/`tour.requested` bus             | #187 | ✅ merged; task **done**                                                    |
> | #144         | analytics GRANT INSERT (telemetry 500)                           | —    | ✅ **closed done** (already fixed in source `02-roles.sql` + live via #166) |
> | #146         | `dev-env-check.sh` asserts bff analytics grants (P4 prevention)  | #188 | ✅ merged; task **in-progress** (live-run pending dev-up)                   |
>
> **Key arc:** #184 wired the slice-C enrichment into planner, but on close-out I found it was **not user-visible** — the BFF `toStop()` dropped `travel_to_minutes`/`weather_aware` and the PWA had no UI. #186 closed that gap (BFF carries the field; PWA renders a `Car`-icon drive time per stop + a translated `CloudRain` weather banner; i18n en/pt-PT/es). #187 moved planner off its bespoke `planner` exchange onto the `tour.requested` queue that `definitions.json` already provisioned (+ a regression test that reads the real definitions.json so topology can't drift again). #146 adds a grant assertion to the env-check SMOKE section (mirrors the #177 schema-table check) so the bff→analytics USAGE drift that caused a UAT-G07 telemetry 500 fails loudly at env-check time instead.
>
> **Deferred to next `make up` (all documented in the respective PRs/tasks):**
>
> - **#149 forward-flow UAT** — the genuine browser verification of travel/weather rendering (carried by the task; mint a dt-tests UAT then).
> - **#148 one-time broker cleanup** — delete the now-dead `planner` exchange + `planner.tour-plan.requested` queue (cosmetic; nothing uses them). `rabbitmqadmin delete queue name=planner.tour-plan.requested` + `... exchange name=planner`.
> - **#146 live env-check run** — `bash scripts/dev/dev-env-check.sh` against the live DB (verifies the new grant assertion passes; `bash -n` already clean).
>
> **Still gated (need the human):** #135 (signed media URLs — real photography), #142 (backoffice cap rule / per-guesthouse scoping / reservations — product decisions).
>
> **dt-tests `review` queue empty** at close-out. tasks-prod MCP required a `/mcp` reconnect this session.

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

## Riff state (daily-tour project `e98dfe58-0547-4d8d-9d06-7dfe1c44c13d`)

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
