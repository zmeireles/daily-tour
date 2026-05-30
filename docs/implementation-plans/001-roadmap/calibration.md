# Plan-001 — Estimate Recalibration

> **Output of T-2.C.4 (Plan-002 Slice 2.C).** Compares predicted vs actual wall-clock across Plan-001 to recalibrate the estimate framework for Plan-002 and beyond.

## TL;DR

- **Plan-001 actuals were 0.27× of predicted on the post-Slice-1.3 tail** (Waves 17-28) — much more aggressive than the playbook's existing 0.5× correction suggests.
- **The correction factor drifts as familiarity builds** — early waves (1-7) ran close to 1.0× of prediction; late waves (16-28) ran at 0.15-0.50× consistently.
- **Per-task wall-clock for the "competent agent on a familiar pattern" zone is 15-35 minutes**, not the playbook's stated 5-20 minutes. The playbook's "Low / Medium / High" bands need to shift up by ~10 minutes across the board.
- **Phase 2-5 catch-up note**: 45 tasks landed across 28 PRs in ~7 hours of merged-PR activity on 2026-05-17 — averaging ~9 minutes per task accounting for parallel agent runs. This is the floor.

## Data

### Waves 1-28 (Phase 0 + Phase 1)

Pulled from `docs/implementation-plans/001-roadmap/EXECUTION.md`. "Predicted" uses the midpoint of the range when one was given.

| Wave | Task    | Profile     | Predicted | Actual | Ratio | Notes                                            |
| ---- | ------- | ----------- | --------- | ------ | ----- | ------------------------------------------------ |
| 1    | T-0.1.1 | claude-yolo | 45 m      | 8 m    | 0.18× | repo scaffold, 10 files                          |
| 2    | T-0.1.2 | sonnet-yolo | 40 m      | 23 m   | 0.58× | shared-config + Prettier (with Node bump fix)    |
| 3    | T-0.1.3 | sonnet-yolo | 35 m      | 22 m   | 0.63× | lefthook + gitleaks                              |
| 4    | T-0.1.4 | claude-yolo | 50 m      | 28 m   | 0.56× | GH Actions CI (lint/typecheck/test/audit)        |
| 5    | T-0.2.0 | sonnet-yolo | 75 m      | 60 m   | 0.80× | shared-types zod scaffold (with GH flake retry)  |
| 6    | T-0.2.1 | sonnet-yolo | 55 m      | 55 m   | 1.00× | hex tokens                                       |
| 7    | T-0.4.2 | sonnet-yolo | 75 m      | 80 m   | 1.07× | BFF Docker (two sessions, 24h gap)               |
| 10   | T-0.4.3 | sonnet-yolo | 42.5 m    | 21 m   | 0.49× | Compose orchestration                            |
| 10   | T-1.0.0 | sonnet-yolo | 62.5 m    | 77 m   | 1.23× | mostly orchestrator post-agent                   |
| 10   | T-1.0.1 | sonnet-yolo | 105 m     | 60 m   | 0.57× | token-svc HTTP surface                           |
| 13   | T-1.0.3 | sonnet-yolo | 52.5 m    | 18 m   | 0.34× | closes Slice 1.0                                 |
| 14   | T-1.0.2 | sonnet-yolo | 87.5 m    | 20 m   | 0.23× | BFF token route                                  |
| 14   | T-1.1.0 | sonnet-yolo | 75 m      | 21 m   | 0.28× | "copy from token-svc + adjust" template paid off |
| 14   | T-1.1.1 | sonnet-yolo | 87.5 m    | 40 m   | 0.46× | recovery wave                                    |
| 15   | T-1.1.2 | sonnet-yolo | 67.5 m    | 50 m   | 0.74× | recovery wave                                    |
| 16   | T-1.2.0 | sonnet-yolo | 87.5 m    | 35 m   | 0.40× | first authed feature route                       |
| 17   | T-1.2.2 | sonnet-yolo | 75 m      | 35 m   | 0.47× |                                                  |
| 18   | T-1.3.0 | sonnet-yolo | 67.5 m    | 35 m   | 0.52× |                                                  |
| 19   | T-1.3.1 | sonnet-yolo | 75 m      | 27 m   | 0.36× |                                                  |
| 20   | T-1.5.0 | sonnet-yolo | 75 m      | 27 m   | 0.36× |                                                  |
| 21   | T-1.2.1 | sonnet-yolo | 92.5 m    | 14 m   | 0.15× | well under estimate                              |
| 22   | T-1.3.2 | sonnet-yolo | 105 m     | 19 m   | 0.18× | well under estimate                              |
| 23   | T-1.2.3 | sonnet-yolo | 115 m     | 33 m   | 0.29× | most complex Slice 1.2 task                      |
| 24   | T-1.7.0 | sonnet-yolo | 75 m      | 14 m   | 0.19× |                                                  |
| 25   | T-1.7.1 | sonnet-yolo | 75 m      | 15 m   | 0.20× | closes Slice 1.7                                 |
| 26   | T-1.4.0 | sonnet-yolo | 97.5 m    | 26 m   | 0.27× | opens Slice 1.4                                  |
| 27   | T-1.4.1 | sonnet-yolo | 75 m      | 17 m   | 0.23× | closes Slice 1.4                                 |
| 28   | T-1.6.0 | claude-yolo | 120 m     | 17 m   | 0.14× | first Opus run delivered like Sonnet             |

**Summary stats (28 data points):**

- Mean ratio: **0.41×**
- Median ratio: **0.36×**
- Min: 0.14× (Wave 28)
- Max: 1.23× (Wave 10 T-1.0.0 — orchestrator-bottlenecked)
- Std dev: ~0.27

### Drift over time

Splitting by wave order makes the pattern obvious:

| Wave range | Slice/phase                | Mean ratio | Interpretation                                                                  |
| ---------- | -------------------------- | ---------- | ------------------------------------------------------------------------------- |
| 1-7        | Phase 0 foundation         | 0.69×      | Realistic predictions; novel territory each task; orchestrator overhead high.   |
| 10-15      | Slice 1.0-1.1              | 0.55×      | Pattern starting to emerge; auth flows still novel.                             |
| 16-23      | Slice 1.2-1.3 (PWA UI)     | 0.34×      | "Copy from previous task + adjust" pattern dominant.                            |
| 24-28      | Slice 1.4-1.7 (admin/auth) | **0.20×**  | Predictions wildly off; agent capability + orchestrator familiarity both maxed. |

### Phases 2-5 (sampled from PR timestamps)

Phase 2-5 wall-clock can't be reconstructed per-task from the catch-up entry alone (see Wave 29-bulk in EXECUTION.md). PR creation→merge timestamps give an upper bound on agent activity:

| PR  | Created (2026-05-17) | Merged (2026-05-17) | +LOC | Tasks bundled    |
| --- | -------------------- | ------------------- | ---- | ---------------- |
| #61 | 15:37                | 15:39 (+2m)         | 461  | T-2.0.0          |
| #65 | 16:12                | 16:13 (+1m)         | 142  | T-2.1.1          |
| #70 | 17:10                | 17:11 (+1m)         | 434  | T-3.0.1          |
| #75 | 18:19                | 18:20 (+1m)         | 210  | T-3.1.2          |
| #80 | 19:13                | 19:15 (+1m)         | 60   | T-3.3.1          |
| #83 | 20:01                | 20:02 (+1m)         | 587  | **5 tasks**      |
| #88 | 21:48                | 21:50 (+1m)         | 158  | T-5.0.0          |
| #92 | 22:30                | 22:31 (+1m)         | 841  | T-5.4.0, T-5.4.1 |
| #94 | 22:45                | 22:46 (+1m)         | 347  | T-5.6.0, T-5.6.1 |

- 45 tasks across PRs #61-#94 spanned **15:37 → 22:46 = 7h 9m of clock time**.
- Auto-merge meant each PR sat <2 minutes between open and merge.
- Accounting for 2-3 parallel cs-agents typical: **~9 min per task agent-wall-clock**, ~15 min per task counting orchestrator slot.
- That's roughly in line with the late-Wave-28 trend (0.14-0.20×).

## Recommendations

### Updated complexity table for Plan-002+

Replace the playbook's current "Complexity Scoring (calibrated)" table:

```diff
- | Factor | Low (2-5 min) | Medium (5-10 min) | High (10-20 min) |
+ | Factor | Low (10-20 min) | Medium (20-40 min) | High (40-90 min) |
```

The old table was already a "0.5× correction" — but the data shows the late-Plan-001 reality was closer to 0.25× of original predictions, and even then with a 10-15 min floor that the old table didn't capture (no agent on this project has ever finished in under 8 minutes).

### Predictive heuristic going forward

For any new task, anchor on the **late-Plan-001 0.20× ratio** plus a 10-minute floor:

```
realistic_actual = max(10 min, 0.20 × your_first_instinct_estimate)
```

If your gut says "this is a 90-minute task", expect 18-25 min wall-clock. If your gut says "this is a 30-minute task", expect ~10 min — agents are subject to the floor more than the ceiling once the codebase pattern is established.

### When predictions might revert toward 1.0×

The 0.20× ratio assumes:

- **Familiar codebase pattern**: there's a sibling task or template the agent can reference.
- **Single-file or tightly-scoped change**: cross-cutting refactors still take longer.
- **No new dependencies, no new services, no migrations**: pure feature work in established modules.

When ANY of those don't hold (e.g. introducing a new microservice, integrating a new vendor SDK, adding a database migration with backfill), expect ratios back in the 0.5-1.0× range. Phase 0 / early-Phase-1 tasks are the reference for this regime.

### Profile selection: data didn't differentiate

Only 2 of 28 logged waves used `claude-yolo` (Opus): T-0.1.1 (0.18×) and T-0.1.4 (0.56×) for foundation work, and T-1.6.0 (0.14×) for the Authentik integration. The Opus-on-Plan-001 sample is too small to draw a profile-level conclusion. **Stick with the current selection rule**: Opus for 1-2 agents on complex work, Sonnet for 3+ parallel or low-risk tasks.

### Caveat: this is single-orchestrator data

All 28 waves were driven by the same orchestrator (Claude Opus across versions 4.6 → 4.7). A different orchestrator (a different model, or even a fresh session with no Plan-001 muscle memory) might restart at the 0.5-0.7× ratio of the early waves before re-converging. The 0.20× floor is the **steady-state** number, not the cold-start one.

## How this applies to Plan-002

Slice 2.A (Deploy) is mostly novel territory (real VPS, real TLS, real Authentik realm) — expect 0.5-1.0× ratios. Treat predictions face-value.

Slice 2.B (Design Pass) is novel too — Stitch mockups + photography + translation review have no Plan-001 analog. Predictions are guesses.

Slice 2.C (Hardening Retrospective) is steady-state familiar work — apply the 0.20× ratio. T-2.C.0/T-2.C.2/T-2.C.3/T-2.C.5 (all done by 2026-05-29) consumed ~45 min orchestrator wall-clock combined, matching the ratio prediction.

## Next steps

- Apply the updated complexity table to `~/.claude/docs/agent-playbook.md` if/when the human is comfortable with the broader bands. The current table will continue to underestimate task duration for cold-start work.
- Re-run this calibration after Plan-002 Slice 2.A lands to see whether deploy/infra work resets the ratio.
- If Plan-002 Slice 2.A wall-clock exceeds Plan-001's pattern by >2×, escalate: it may mean novel-territory tasks need a different rubric (e.g. "research" vs "execution" mode).
