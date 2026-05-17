# Plan 001 — Execution Log

> Append-only log of cs-agent waves. One section per wave. Per-task: predicted vs actual, context use, LOC, issues, decisions.

## Wave Template

```markdown
### Wave N — <YYYY-MM-DD>

| Agent | Task ID | Branch       | Profile            | Scope   | Status              |
| ----- | ------- | ------------ | ------------------ | ------- | ------------------- |
| name  | T-x.y.z | t-x.y.z-slug | claude-sonnet-yolo | <files> | Running/Done/Failed |

#### Agent: <name> (T-x.y.z)

- **Started**: HH:MM
- **Finished**: HH:MM
- **Predicted time**: 30–60 m
- **Actual time**: 45 m
- **Context usage**: 12% (40.2k/1M)
- **Complexity**: Low / Medium / High
- **LOC changed**: +130 / -4
- **Commit verified**: ✅ <SHA>
- **PR**: #NN
- **Issues**: …
- **Decisions made on the fly**: …
```

## Verification checklist (L005)

When an agent reports "done", before marking the task ✅:

1. `cd ~/.claude-squad/worktrees/jmeireles/<name> && git log -1 --oneline` — confirm a commit exists.
2. `cs-agent diff <name>` — review the actual changes.
3. Run the acceptance-criteria checks listed in TODO.md.
4. If no commit, `cs-agent autocommit <name>` or attach + commit manually (L008).
5. Only then `cs-agent push <name>` to create the PR.

---

## Waves

### Wave 23 — 2026-05-17 — T-1.2.3 (sequential after Waves 21+22) — eighth clean Sonnet self-commit; **Slice 1.2 + 1.3 closed**

| Agent  | Task ID | Branch           | Profile            | Scope                                                                                                                | Status                   |
| ------ | ------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| t1-2-3 | T-1.2.3 | jmeireles/t1-2-3 | claude-sonnet-yolo | PWA action drill-down route `/a/:action` + ControlsBar + grouped/flat list + sort + react-window virtualisation + tests | Done (clean self-commit) |

#### Agent: t1-2-3 (T-1.2.3) — clean Sonnet self-commit (most complex Slice 1.2 task)

- **Started**: 2026-05-17 11:29
- **Finished**: agent ~26 min (clean self-commit `7cc1ee1`); orchestrator verify + push + auto-merge ~7 min
- **Predicted time**: 100–130 min
- **Actual time**: ~33 min total (well under estimate; the most complex Slice 1.2 task)
- **Complexity**: High (5 features + use-discover hook + sort helpers + 6 RTL + 3 unit + Playwright smoke + react-window + GUESTHOUSE_LOCATIONS placeholder)
- **LOC changed**: 17 files (+1201 / −0)
- **Commit**: ✅ `7cc1ee1` — clean Sonnet self-commit.
- **PR**: [#44](https://github.com/zmeireles/daily-tour/pull/44) (auto-merged per session-level orchestrator autonomy)
- **Acceptance**: 7/7 criteria met. Grouped-by-wish list with `ActionGroupHeader`, `LocationToggle` + `RangeSlider` wired via TanStack Query, default sort=distance, sort `DropdownMenu` (Distance/Rating/Name), group `ToggleGroup` (Grouped/Flat), `react-window` virtualisation at ≥30 items.
- **Issues**: None — clean self-commit; auto-merge fired cleanly.
- **New lessons**:
  - **`ResizeObserver` polyfill in jsdom** — Radix Slider needs it; minimal one-line polyfill in `setup.ts` (already a known cross-cut for any Radix-based UI in jsdom tests).
  - **react-window threshold pattern**: `places.length >= 30 ? <FixedSizeList itemSize={320} ...> : places.map(...)`. Below-threshold renders 28 seeded places without virtualisation cost; above-threshold scales linearly.
  - **`GUESTHOUSE_LOCATIONS` placeholder map** in `lib/config.ts` keeps geometry contract intact for v1 without a real per-guesthouse lookup. Replace via T-1.4.x owner CRUD; the call site doesn't change shape.
  - **Sort by Rating fallback** = id-desc when payload lacks per-place rating. Establishes a stable order; UI doesn't need to special-case "no rating data."
- **Decisions made on the fly (agent)**:
  - Playwright is auth-guard smoke only (not full BFF round-trip) — same constraint as T-1.3.2; deferred full e2e until Phase 0 CI gets the dev server harness wired.
  - LocationToggle defaults to "guesthouse" (not "me") — avoids unnecessary `navigator.geolocation` prompt on route mount; user opts in to live tracking.
  - `useDiscover` query key includes location coords + km — TanStack Query memoizes per `(action, lat, lng, km)` quadruple. Future range-slider changes hit cache for stable inputs.

### Wave 22 — 2026-05-17 — T-1.3.2 (parallel half) — seventh clean Sonnet self-commit this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                                            | Status                                                  |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| t1-3-2 | T-1.3.2 | jmeireles/t1-3-2 | claude-sonnet-yolo | PWA Place Detail route + Hero + Gallery (embla) + Description (i18n fallback) + Map + ActionRow | Done (clean self-commit; merge-resolve on i18n + lock) |

#### Agent: t1-3-2 (T-1.3.2) — clean Sonnet self-commit + i18n merge-resolve

- **Started**: 2026-05-17 11:09 (parallel with t1-2-1)
- **Finished**: agent ~12 min (clean self-commit `32c7487`); orchestrator i18n merge-resolve + push + auto-merge ~7 min
- **Predicted time**: 90–120 min
- **Actual time**: ~19 min total (well under estimate)
- **Complexity**: High (route + 6 features + carousel + deep-link helpers + Playwright + QueryClient wiring)
- **LOC changed**: 19 files (+862 / −3)
- **Commit**: ✅ `32c7487` — clean Sonnet self-commit. Merge-resolve commit `a25fb33` (additive — both `home.*` and `place_detail.*` keys kept).
- **PR**: [#43](https://github.com/zmeireles/daily-tour/pull/43) (auto-merged per session-level orchestrator autonomy)
- **Acceptance**: 5/5 criteria met. Hero, embla carousel gallery (skipped when media≤1), per-field i18n fallback `Badge`, single-pin `MapView`, action row with Apple Maps HTTPS / `tel:` / `wa.me/` hrefs. Unauthed → redirect to `/?reason=expired`.
- **Issues**:
  1. Predictable i18n.ts merge conflict with T-1.2.1 (PR #42 merged in between) — both PRs added new keys to the same translation object. `gh pr update-branch` couldn't auto-resolve; manual fetch + merge + additive resolve (kept both `home.*` and `place_detail.*`) + push back. 42 tests pass on resolved branch.
- **New lessons**:
  - **i18n.ts merge-resolve pattern**: when two parallel PRs add new keys to the same `resources` object, the diff has structural `<<<<<<<` markers but the intent is always additive. A scripted "keep both" resolution would automate this — worth a cs-agent feature.
  - **QueryClientProvider wiring as a "swallow" cost** — T-1.3.2 added the provider opportunistically since TanStack Query v5 requires it; Slice 1.7 had this dep anyway. Net-cost: 1 line in `App.tsx`; net-benefit: T-1.2.3 + future TanStack-Query routes "just work."
  - **maplibre-gl + jsdom needs URL.createObjectURL polyfill** for smoke tests where the map module loads but isn't actually rendered. One-line polyfill in `setup.ts`.
  - **Workbox `maximumFileSizeToCacheInBytes`** — default 2 MiB, raised to 4 MiB because maplibre-gl + embla push main chunk past default. Code-splitting is Phase 2.
- **Decisions made on the fly (agent)**:
  - Playwright spec is a "route resolves" smoke, not a full `tel:` navigation intercept (unreliable headless across Chromium/WebKit). RTL covers the href contract.
  - `GUESTHOUSE_CONTACT_PHONE` hardcoded placeholder in `lib/config.ts` (+351912345678 — fake); real per-place phones land in T-1.4.x.

### Wave 21 — 2026-05-17 — T-1.2.1 (parallel half) — sixth clean Sonnet self-commit this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                                  | Status                   |
| ------ | ------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------- | ------------------------ |
| t1-2-1 | T-1.2.1 | jmeireles/t1-2-1 | claude-sonnet-yolo | PWA authed home: 3×2 action grid + suncalc theme-auto + locale-auto + premium stubs   | Done (clean self-commit) |

#### Agent: t1-2-1 (T-1.2.1) — clean Sonnet self-commit

- **Started**: 2026-05-17 11:09 (parallel with t1-3-2)
- **Finished**: agent ~9 min (clean self-commit `7ec2427`); orchestrator verify + push + auto-merge ~5 min
- **Predicted time**: 75–110 min
- **Actual time**: ~14 min total (well under estimate)
- **Complexity**: Medium (dispatcher refactor + 4 features + 2 hooks + 11 i18n keys + 4 RTL tests)
- **LOC changed**: 12 files (+363 / −3)
- **Commit**: ✅ `7ec2427` — clean Sonnet self-commit.
- **PR**: [#42](https://github.com/zmeireles/daily-tour/pull/42) (merged as `a8df8b0` — first auto-merge of Phase 1+ feature in this session per orchestrator autonomy authorization)
- **Acceptance**: 5/5 criteria met. 3×2 action grid (composing T-1.2.2 `ActionGroupHeader` × 6), greeting (anonymous "Welcome back" — `sub` is UUID so greeting-by-name deferred), `data-theme` set by `useThemeAuto` (suncalc against São Miguel), locale auto from token claims, locale switcher in header, premium stubs below the fold.
- **Issues**: PR title rename via `gh pr edit` (cs-agent default "T1 2 1" violates conventional commits) — same pattern as prior PRs; well-understood.
- **New lessons**:
  - **Polymorphic dispatcher beats App.tsx route split** for an `/` that has both authed + unauthed flavors — keeps router config flat, makes the JWT branch obvious, parallel-safe with other route additions (T-1.3.2's `/p/:id`). The dispatcher reads `useSessionStore.jwt` and renders one of two trees; no App.tsx change.
  - **`useThemeAuto` 30-min poll + `window.focus` re-check** captures the realistic "guest leaves app, comes back at sunset" UX without burning CPU. Single `setInterval` cleaned up on unmount.
  - **`suncalc` ships no bundled types** (CJS-style) — `@types/suncalc` is a devDep; not a blocker, just a one-line addition. Worth noting in any future "tiny utility lib" sweep.
  - **`vi.setSystemTime(new Date("2026-06-21T12:00:00Z"))`** is a reliable way to deterministically test sunrise/sunset-driven logic — the date controls suncalc's calculation without needing to mock the lib itself.
- **Decisions made on the fly (agent)**:
  - Greeting uses generic "Welcome back" rather than the guest name — `sub` claim is a UUID, not a name. PII-free; matches privacy posture. Greeting-by-name deferred to a future task (would need a separate guest-profile lookup).
  - PremiumStubs use real `<button disabled>` rather than a `<Tooltip>` — simpler, native a11y, matches the "coming soon" intent without animation cost.
  - Locale switcher is a separate component from public-landing's switcher — kept disjoint to avoid scope expansion; refactor into shared component is a follow-up.

### Wave 19 — 2026-05-17 — T-1.3.1 (parallel half) — fourth clean Sonnet self-commit this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                               | Status                   |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------------- | ------------------------ |
| t1-3-1 | T-1.3.1 | jmeireles/t1-3-1 | claude-sonnet-yolo | PWA MapView + MapPin + map config helpers + tests (maplibre mocked) | Done (clean self-commit) |

#### Agent: t1-3-1 (T-1.3.1) — clean Sonnet self-commit

- **Started**: 2026-05-17 04:24
- **Finished**: agent ~22 min (clean self-commit `0b6ea9d`); orchestrator verify + push ~5 min
- **Predicted time**: 60–90 min
- **Actual time**: ~27 min total (well under estimate)
- **Complexity**: Medium (custom SVG + maplibre wiring + jsdom-mocked tests + idempotent protocol guard)
- **LOC changed**: 7 files (+350 / −0)
- **Commit**: ✅ `0b6ea9d` — clean Sonnet self-commit.
- **PR**: [#39](https://github.com/zmeireles/daily-tour/pull/39) (merged as `fd668f6`, all 6 CI checks green; human-merged per doctrine — Phase 1+)
- **Acceptance**: 3/3 criteria met. MapLibre 5.24 + PMTiles 4 loaded via custom protocol; MapPin SVG matches §5 exactly; `prefers-reduced-motion` toggles `flyTo` → `jumpTo` (asserted in test).
- **Issues**: PR title rename via `gh pr edit` (same pattern as prior PRs).
- **New lessons**:
  - **maplibre-gl in jsdom requires full module mock** — `vi.mock("maplibre-gl", ...)` replacing `Map`/`Marker`/`addProtocol` with `vi.fn()`. Unmocked tests throw "WebGL not supported". Worth a doctrine note for any future map work.
  - **`createRoot` + `flushSync`** is the cleanest way to render React components into DOM elements that imperative libraries (MapLibre's `Marker`) expect. Keeps React as source of truth without manual DOM construction.
  - **Module-level boolean for idempotent protocol registration** survives HMR + React StrictMode double-mount + test re-renders. Pattern reusable for any one-time browser-API registration.
- **Decisions made on the fly (agent)**:
  - No marker clustering (deferred — single-marker §5 spec sufficient for v1; Phase 1.3.2+ can add).
  - OSM raster style as fallback when no pmtilesUrl provided (vs failing). More forgiving for dev.

### Wave 20 — 2026-05-17 — T-1.5.0 (parallel half) — fifth clean Sonnet self-commit this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                             | Status                   |
| ------ | ------- | ---------------- | ------------------ | --------------------------------------------------------------------------------- | ------------------------ |
| t1-5-0 | T-1.5.0 | jmeireles/t1-5-0 | claude-sonnet-yolo | PWA public landing (hero + sample places + locale switch + mailto CTA + expand /) | Done (clean self-commit) |

#### Agent: t1-5-0 (T-1.5.0) — clean Sonnet self-commit

- **Started**: 2026-05-17 04:25
- **Finished**: agent ~22 min (clean self-commit `5746a1c`); orchestrator verify + push ~5 min
- **Predicted time**: 60–90 min
- **Actual time**: ~27 min total
- **Complexity**: Medium (5 feature components + i18n keys + sample fixture + route replacement preserving existing test + premium-gating defensive test)
- **LOC changed**: 11 files (+349 / −28)
- **Commit**: ✅ `5746a1c` — clean Sonnet self-commit.
- **PR**: [#40](https://github.com/zmeireles/daily-tour/pull/40) (merged as `c85ad78`, all 6 CI checks green after `gh pr update-branch` because PR #39 merged in between; human-merged per doctrine — Phase 1+)
- **Acceptance**: 4/4 criteria met. Hero + owner-pitch + 4 sample PlaceCards (reusing T-1.2.2 component) + mailto CTA + locale switcher. `?reason=expired` toast preserved (existing T-1.0.3 test passes unchanged). Premium-surface defensive test passes (no `[data-premium]` on page).
- **Issues**:
  1. **First post-merge "is not mergeable: base branch policy"** — gh CLI returned this on the first merge attempt for #40 because 3 of the 6 required checks were still in_progress when the watcher fired (watcher checked title-validate completion only). Watcher tightened to require ALL checks completed (not just one). Cycle is now: `until [ "$(gh pr view N --json statusCheckRollup -q '[.statusCheckRollup[] | select(.conclusion == "")] | length')" = "0" ]`.
  2. PR title rename via `gh pr edit` (same as prior PRs).
- **New lessons**:
  - **Watcher correctness**: counting "completed" must mean `conclusion != ""` (an empty conclusion means in_progress per gh's data shape), NOT `status == "COMPLETED"` alone. The latter occasionally returns prematurely if a check is requeued mid-poll.
  - **Hardcoded sample fixtures are fine for public landing pages** — avoids spinning up a new public BFF endpoint just for 4 places. Future task can convert if needed; for v1, less surface = less to maintain.
  - **i18n key fallbacks via `t("key", { defaultValue: "..." })`** keep tests passing without full i18n provider setup. Pattern continues to work well.
- **Decisions made on the fly (agent)**:
  - Sample fixture in `lib/sample-places.ts` over new BFF endpoint — self-contained, no auth/dt_internal dance.
  - Premium gating is layout-level (just don't include the entries) vs conditional rendering — fewer code paths, easier to reason about.
  - Inline destructive `<p>` for expired alert (preserved from T-1.0.3) vs new Alert component — keeps the existing `data-testid="expired-message"` selector intact for backward compatibility.

### Wave 17 — 2026-05-17 — T-1.2.2 (parallel half) — second clean Sonnet self-commit this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                                | Status                   |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------------------------------ | ------------------------ |
| t1-2-2 | T-1.2.2 | jmeireles/t1-2-2 | claude-sonnet-yolo | PWA components: PlaceCard + ActionGroupHeader + LocationToggle + RangeSlider + tests | Done (clean self-commit) |

#### Agent: t1-2-2 (T-1.2.2) — clean Sonnet self-commit

- **Started**: 2026-05-17 03:20
- **Finished**: agent ~30 min (clean self-commit `f5309ce`); orchestrator verify + push ~5 min
- **Predicted time**: 60–90 min
- **Actual time**: ~35 min total
- **Complexity**: Medium (4 components + 11 tests + 4 shadcn primitives to add; design spec was tight)
- **LOC changed**: 14 files (+3001 / −564 — bulk is the lockfile from adding 4 @radix-ui primitives)
- **Commit**: ✅ `f5309ce` — clean Sonnet self-commit. No orchestrator rescue.
- **PR**: [#36](https://github.com/zmeireles/daily-tour/pull/36) (merged as `31ffd49`, all 6 CI checks green; human-merged per doctrine since Phase 1+ commits escalate)
- **Acceptance**: 4/4 criteria met. Each component matches `02-ui-design-system.md §5` (16:9 PlaceCard hero, distance pill via Badge top-left, Fraunces title, snap-x scrollable action chips, ≥56px tap targets, ActionGroupHeader full-row link with chevron-90° hover, LocationToggle motion.layoutId morphing pill, RangeSlider discrete `[1,3,5,10,25]` km snap with 250ms inline debounce + tabular-nums above thumb). 11 vitest cases (RTL + a11y) including a `vi.useFakeTimers()` debounce assertion.
- **Issues**: None on this branch. PR title needed orchestrator rename via `gh pr edit` (cs-agent default "T1 2 2" violates conventional commits) — same pattern as prior PRs; well-understood.
- **New lessons**:
  - **shadcn CLI bulk-add works cleanly** (`pnpm dlx shadcn@latest add slider badge toggle-group`). Toggle gets pulled as transitive dep. No prompt fights. Lockfile churn is bulky (~2700 lines) but expected for first @radix-ui addition.
  - **`motion`'s `layoutId` for same-tree morphs** doesn't need `AnimatePresence` — plain `motion.div layout` is sufficient. Useful pattern for the LocationToggle's active-pill swap.
  - **Inline debounce via `useRef + setTimeout`** beats pulling in lodash for a single use. ~10 LOC; cleanup in `useEffect` return prevents the unmount-mid-debounce warning.
- **Decisions made on the fly (agent)**:
  - Semantic Tailwind tokens (`bg-secondary text-secondary-foreground`) for the distance pill rather than the palette `--tea-500` — keeps it palette-portable for dark mode.
  - lucide-react icons with `aria-hidden=true` on action chips since the action text is also rendered (matches WAI-ARIA recommendation).

### Wave 18 — 2026-05-17 — T-1.3.0 (parallel half) — third clean Sonnet self-commit this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                     | Status                   |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------------------- | ------------------------ |
| t1-3-0 | T-1.3.0 | jmeireles/t1-3-0 | claude-sonnet-yolo | BFF /v1/places/:id hydrated + catalog-svc /v1/places/:id/hydrated + tests | Done (clean self-commit) |

#### Agent: t1-3-0 (T-1.3.0) — clean Sonnet self-commit

- **Started**: 2026-05-17 03:21
- **Finished**: agent ~30 min (clean self-commit `19cfd41`); orchestrator verify + push ~5 min
- **Predicted time**: 60–75 min
- **Actual time**: ~35 min total
- **Complexity**: Medium-high (auth-chain integration + cross-service join + 4 vitest cases covering authed/unauth/404/503 paths)
- **LOC changed**: 7 files (+458 / −2)
- **Commit**: ✅ `19cfd41` — clean Sonnet self-commit. No orchestrator rescue.
- **PR**: [#37](https://github.com/zmeireles/daily-tour/pull/37) (merged as `e6c795e`, all 6 CI checks green after `gh pr update-branch` because PR #36 merged in between; human-merged per doctrine — auth-chain)
- **Acceptance**: 2/3 criteria met directly; p95<200ms acceptance requires PWA T-1.3.2 for real-world smoke (unit-tested with mocked catalog client). Hydrated payload includes place + media[] + actions[] + wishes[] + i18n description + `weather_ok_today: true` (stubbed, with code/PR/README markers; real IPMA in T-3.2.x).
- **Issues**:
  1. **PR title subject-case** — same cs-agent default-title pattern; orchestrator rename. Habit by now.
  2. **`gh pr update-branch` needed** because PR #36 merged ~3 min before PR #37's CI completed (lockfile conflict resolves automatically on rebase). Standard parallel-launch pattern.
- **New lessons**:
  - **Catalog-svc scope expansion pattern continues to pay off.** T-1.2.0 added `/v1/places-by-action/:slug`; T-1.3.0 adds `/v1/places/:id/hydrated`. Both follow the "join everything the BFF needs in one query" shape. Future BFF aggregator tasks can lift this idiom (e.g. T-1.6.x owner-side endpoints).
  - **`weather_ok_today: true` placeholder strategy** preserves the BFF response shape so T-1.3.2 (PWA Place Detail) can render the indicator UI now, with the real IPMA call landing transparently in Phase 3 without contract changes.
- **Decisions made on the fly (agent)**:
  - Dedicated `/v1/places/:id/hydrated` endpoint (vs adding `?hydrate=true` query flag to existing `/v1/places/:id`) — separate route is clearer for the response-shape difference (different consumer = different endpoint).
  - 404 propagation rather than wrapping — keeps PWA's error handling simple.

### Wave 15 — 2026-05-17 — T-1.1.2 (parallel half, recovery) — second Sonnet autocommit-fallback

| Agent  | Task ID | Branch           | Profile            | Scope                                                                  | Status                  |
| ------ | ------- | ---------------- | ------------------ | ---------------------------------------------------------------------- | ----------------------- |
| t1-1-2 | T-1.1.2 | jmeireles/t1-1-2 | claude-sonnet-yolo | 28-place São Miguel seed (SQL + TS loader + idempotency test + wiring) | Crashed @ ~80%; rescued |

#### Agent: t1-1-2 (T-1.1.2) — partial agent + orchestrator rescue

- **Started**: 2026-05-17 02:21
- **Finished**: agent ~30 min before crash (autocommit `18f0b76` shipped the 743-LOC SQL — the bulk of the work); orchestrator manual completion ~15 min; verification + push ~5 min
- **Predicted time**: 60–75 min
- **Actual time**: ~50 min total
- **Complexity**: Medium-high (28 place rows × 5 jsonb fields + ≥28 action/wish tag rows + 28 media rows, all idempotent; per-row mapping decisions from §2 freeform → §3 controlled vocabulary)
- **LOC changed**: 4 files (+869 / −0 across 2 commits)
- **Commits**:
  - ⚠️ `18f0b76` — cs-agent autocommit-fallback. The 743-LOC `seeds/places-sao-miguel.sql` is **complete and well-structured**: header comment block explaining UUID convention + the §2 Relax→§3 Do remap + the §2-freeform → §3-controlled-vocabulary closest-fit mapping + the dev-placeholder strategy (one shared Unsplash hero, `[]`/`{}` hours/contacts, all `is_hosts_pick = false`); 28 individual place INSERTs with `ON CONFLICT (id) DO NOTHING`; 28 batched `place_action_wish` INSERTs (one per place, multi-row VALUES — each place has ≥1 action+wish tag, multi-action places have more); 1 batched 28-row `place_media` INSERT. Fixed UUIDs: `c0000001-…-NN` for places, `d0000001-…-NN` for hero media.
  - ✅ `ea8856c` — orchestrator manual completion: `seeds/places.ts` (~45 LOC TypeScript loader reading + applying the SQL via `pg.Pool`, reports counts), `package.json` (`seed:places` script alongside `seed`), `__tests__/places-seed.test.ts` (~85 LOC Testcontainers-pg idempotency check: applies SQL once → asserts 28 places + ≥28 tags + 28 media; applies again → asserts counts unchanged), `README.md` (seed section).
- **PR**: [#33](https://github.com/zmeireles/daily-tour/pull/33) (merged as `89481ff`, all 6 CI checks green; human-merged per doctrine since T-1.1.2 ships under a Phase 1 task ID)
- **Acceptance**: 3/3 criteria met. 28 places loaded; idempotent re-run = same counts; loader idempotent via `ON CONFLICT DO NOTHING` on fixed UUIDs.
- **Issues**:
  1. **Second Sonnet autocommit-fallback this session** (after T-1.1.1). Session-wide stat now Sonnet 2/5 (40%) vs Opus 2/4 (50%) — Sonnet's reliability advantage continues to shrink as we push more complex/data-dense tasks at it. Pattern: **bulk-data-entry tasks crash near the end** when the agent has loaded the full §2 + §3 source data + the schema into context and is part-way through the SQL emission.
  2. **Wish-mapping is a judgment call.** §2 lists freeform wishes ("iconic", "bucket-list", "summer-only", "evening-open", "morning"); §3 has a tight controlled vocabulary. Agent's mapping is reasonable per the SQL comments but reviewers should sanity-check at-merge-time. "summer-only" / "evening-open" / "morning" are season/hours flags, not wishes — agent correctly skipped them.
- **New lessons**:
  - **`seeds/places.ts` as a SQL-runner** (vs `seeds/dev.ts`-style inline TS data) is the right shape when the data fixture is large and authored in raw SQL. Avoids duplicating 28 rows × 5 jsonb fields in TypeScript form just to satisfy a "TS loader" requirement.
  - **Testcontainers idempotency test pattern**: apply SQL once → snapshot counts; apply again → assert counts unchanged. Cheap (~7s in the Testcontainers harness) and load-bearing for idempotency-required seeds.
- **Decisions made on the fly (agent)**:
  - One shared Unsplash hero URL for all 28 places (vs 4-6 theme-grouped) — defensible since per-place imagery comes from T-1.4.x owner uploads.
  - All §2 "Relax" entries → "Do" action with wish `thermal-soak` (or closest fit) — matches §3's "Drop Relax; merge into Do (thermal soak) + Eat (sea view)" guidance.

### Wave 16 — 2026-05-17 — T-1.2.0 (parallel half) — first authed feature route + clean Sonnet self-commit

| Agent  | Task ID | Branch           | Profile            | Scope                                                                              | Status                   |
| ------ | ------- | ---------------- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------ |
| t1-2-0 | T-1.2.0 | jmeireles/t1-2-0 | claude-sonnet-yolo | BFF `/v1/discover` aggregator + dedicated catalog-svc `/v1/places-by-action/:slug` | Done (clean self-commit) |

#### Agent: t1-2-0 (T-1.2.0) — clean Sonnet self-commit

- **Started**: 2026-05-17 02:21
- **Finished**: agent ~30 min (clean self-commit `b3ae7e4`); orchestrator verify + push ~5 min
- **Predicted time**: 75–100 min
- **Actual time**: ~35 min total (significantly under estimate)
- **Complexity**: High (auth-chain integration + cross-service HTTP + scope expansion decision + 4 vitest cases covering the authed/unauth/no-loc/error paths)
- **LOC changed**: 9 files (+517 / −10)
- **Commit**: ✅ `b3ae7e4` — clean Sonnet self-commit. No orchestrator rescue.
- **PR**: [#34](https://github.com/zmeireles/daily-tour/pull/34) (merged as `a460694`, all 6 CI checks green; human-merged per doctrine — auth-chain escalation)
- **Acceptance**: 5/5 criteria met. Zod-validated query params (`action: string`, `loc?: <lat,lng>`, `km?: 0.1–200`); haversine geo-filter when `loc` provided; `is_hosts_pick desc` + distance asc sort; top-30 cap; wish-slug grouped response shape; auth applied via the `onRoute` hook (no manual `preHandler`). p95<300ms can now be verified end-to-end with the 28-place seed from Wave 15.
- **Issues**:
  1. **Catalog-svc scope expansion decision** — the spec was ambiguous about whether catalog-svc could grow a filter endpoint. Agent took the recommended path (dedicated `GET /v1/places-by-action/:slug` that returns places + wish slugs in one call) over the alternatives (BFF loads-all-and-filters; or `?action_id` filter on existing list endpoint). The dedicated endpoint is self-documenting and avoids a slug→UUID map in the BFF. Trade-off accepted: +80 LOC + 1 test in catalog-svc.
  2. **Stale "Validate PR title" check failed once** (cs-agent auto-creates PR with title "T1 2 0" which violates conventional commits; orchestrator renamed via `gh pr edit`). Re-run was SUCCESS. Same as PR #33's title issue — cs-agent default title needs an override.
- **New lessons**:
  - **`onRoute` hook inheritance works end-to-end.** Discover route just `register()`s; the auth plugin's hook (T-1.0.2) auto-attaches `fastify.authenticate`. Unauth test asserts 401 — confirms the hook applied. **Secure-by-default architecture pays off the first time a new authed route gets written.**
  - **Mock the cross-service HTTP client at the test boundary** (`vi.mock("./lib/catalog-client.js", ...)`) — don't spin up catalog-svc in the BFF tests. T-1.1.1's 13 tests already cover catalog-svc E2E.
  - **Catalog-svc internal endpoint** (no Authentik wrap, internal-only on `dt_internal`) is the right shape for BFF-aggregator calls — same pattern as token-svc from T-1.0.2.
- **Decisions made on the fly (agent)**:
  - Inline haversine in `discover.ts` (vs extracting to `lib/geo.ts`) — single function, used once; YAGNI.
  - `is_hosts_pick desc, distance asc` as the default sort (rather than `is_hosts_pick desc, createdAt desc`) when `loc` provided — matches the FR-DSC-01 spec ("nearest first" when location available).
  - Pino error log `[bff:discover] catalog-svc error` on 5xx propagation — intentional; visible in test output but does NOT leak to PWA (response is generic 503).

### Wave 13 — 2026-05-16 — T-1.0.3 (parallel half) — closes Slice 1.0

| Agent  | Task ID | Branch           | Profile            | Scope                                                  | Status                   |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------ | ------------------------ |
| t1-0-3 | T-1.0.3 | jmeireles/t1-0-3 | claude-sonnet-yolo | PWA /r/:token route + Zustand session store + auth lib | Done (clean self-commit) |

#### Agent: t1-0-3 (T-1.0.3) — clean Sonnet self-commit

- **Started**: 2026-05-16 23:53
- **Finished**: agent ~13 min (clean self-commit `1787cce`); orchestrator verify + push ~5 min
- **Predicted time**: 45–60 min
- **Actual time**: ~18 min total (significantly under estimate)
- **Complexity**: Medium (auth lib + Zustand + react-router 7 + i18next + 3 vitest cases)
- **LOC changed**: 10 new files (+543 / −142 across the agent's commit; existing App.tsx + main.tsx modified)
- **Commit**: ✅ `1787cce` — clean Sonnet self-commit. No orchestrator rescue.
- **PR**: [#30](https://github.com/zmeireles/daily-tour/pull/30) (merged as `79a1951`, all 6 CI checks green; human-merged per doctrine)
- **Acceptance**: 5/5 criteria met. `/r/:token` consumes opaque + calls BFF exchange + stores JWT in Zustand (memory-only, no localStorage); `useSession()` selector exposes `{jwt, exp, reservation, guest}`; refresh-cookie flow deferred per prompt; expired → sonner toast + redirect to `/?reason=expired`; 3 vitest cases (happy, expired, network error) using React Testing Library + mocked exchange client.
- **Issues**: None on this branch. (T-1.1.1 sibling-parallel run had a Sonnet autocommit-fallback crash — first this session.)
- **New lessons**:
  - **`fetch` with `redirect: "manual"`** is the right pattern for detecting upstream graceful-degrade redirects. The PWA's exchange client throws `TokenExpiredError` on `res.type === "opaqueredirect"` so the route handler can show a toast + soft-redirect.
  - **react-router 7's `navigate({ replace: true })`** prevents back-button into a stale `/r/:token` after exchange. Use replace for any "consumed" URL.
  - **`Storage.prototype.setItem` spy in tests** is the simplest way to assert "this code never touches localStorage" — important for token hygiene (D15).
- **Decisions made on the fly**:
  - Used `createBrowserRouter` + `<RouterProvider>` (react-router 7's data-router API) over the legacy `<BrowserRouter>` — agent's choice. Cleaner.
  - i18next defaultValue fallback in `t()` so tests don't need full i18n init.

### Wave 14 — 2026-05-16 — T-1.1.1 (parallel half, recovery) — first Sonnet autocommit-fallback this session

| Agent  | Task ID | Branch           | Profile            | Scope                                                                                             | Status                  |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------- | ----------------------- |
| t1-1-1 | T-1.1.1 | jmeireles/t1-1-1 | claude-sonnet-yolo | catalog-svc Fastify CRUD (places + guesthouses + owner-profiles) + Testcontainers + compose entry | Crashed @ ~50%; rescued |

#### Agent: t1-1-1 (T-1.1.1) — partial agent + orchestrator rescue

- **Started**: 2026-05-16 23:54
- **Finished**: agent ~10 min before crash (autocommit `b0e51a3`); orchestrator manual completion ~25 min; verification + push ~5 min
- **Predicted time**: 75–100 min
- **Actual time**: ~40 min total
- **Complexity**: High (3 REST surfaces + Testcontainers harness + Dockerfile + compose entry + i18n jsonb handling + cursor pagination)
- **LOC changed**: ~16 files (+~1100 / −5 across 2 commits)
- **Commits**:
  - ⚠️ `b0e51a3` — cs-agent autocommit-fallback. Fastify scaffold (app, config, index, instrumentation, version, health), full places route (321 LOC with zod validation, base64 cursor pagination, idempotent soft-delete, 409 on unique conflict).
  - ✅ `f98807e` — orchestrator manual completion: guesthouses route (200 LOC, hard-delete, 409 on dup slug), owner-profiles route (160 LOC, POST = upsert by PK), `__tests__/helpers.ts` (Testcontainers-pg with inline migrator), 4 test files (13 tests total), Dockerfile + dual `.dockerignore`, tsup + vitest configs, package.json scripts/deps restored + Fastify/OTel/Testcontainers added, tsconfig.eslint.json fix, compose-app.yml catalog-svc entry, infra/README + svc README. Plus 2 fix-ups to agent's places.ts: replaced `as ReturnType<typeof eq>` casts with `(SQL | undefined)[]` typed array; fixed `isUniqueViolation()` to check `err.cause.code` (drizzle wraps pg errors so SQLSTATE 23505 lives there, not on the direct error).
- **PR**: [#29](https://github.com/zmeireles/daily-tour/pull/29) (merged as `b5c6710`, all 6 CI checks green; human-merged per doctrine). Title needed lowercase-subject fix (agent's "Fastify CRUD endpoints" violated the subject-case rule).
- **Acceptance**: all 5/5 criteria met. 3 REST surfaces (places + guesthouses + owner-profiles); i18n jsonb; soft-delete on places + hard-delete on the others (no status columns); 13/13 vitest pass in ~11s (Testcontainers-pg on pgvector:pg17); listens on :8081.
- **Issues**:
  1. **First Sonnet autocommit-fallback this session.** Crash class is real and NOT Opus-specific. Updated session-wide stat: Sonnet 1/4 (25%) vs Opus 2/4 (50%). Sonnet still has lower crash rate but neither is reliable.
  2. **`isUniqueViolation` indirection** — drizzle-orm 0.45.x wraps `pg.DatabaseError` in `DrizzleQueryError`. The error code (SQLSTATE 23505 for unique violation) lives on `.cause`, not directly on `.code`. Without checking both shapes, 409 conflicts return 500. Likely affects any drizzle-orm project that needs to handle pg error codes.
  3. **`build: "tsup"` script copy-paste** — agent restored the build script from token-svc's template (T-1.0.0 had dropped it for the schema-only state). Now correct.
  4. **PR title subject-case** — "feat(catalog-svc): Fastify CRUD endpoints (...)" started with capital F. pr-title.yml's `subjectPattern: ^(?![A-Z]).+$` rejected. Renamed to "feat(catalog-svc): add CRUD endpoints (...)". **Lesson**: orchestrator PR titles must follow the same lowercase-subject rule as commit messages.
- **New lessons**:
  - **drizzle-orm wraps pg errors** — any code checking pg SQLSTATE codes must check `err.cause.code`, not just `err.code`. Cross-cut to cc-platform-feedback as a Drizzle gotcha (3rd entry: in addition to the CREATE-SCHEMA emit + the bundled-migrator-vs-least-privilege, now the wrapped-pg-error pattern).
  - **Sonnet's reliability advantage shrinks at higher complexity tasks.** T-1.1.1's spec was the most complex Sonnet has handled this session (3 REST surfaces + Testcontainers + Dockerfile + compose). Sonnet handled the first ~50% cleanly then crashed. Pattern: complexity affects crash rate independent of profile.
- **Decisions made on the fly (orchestrator)**:
  - Hard-delete on guesthouses + owner-profiles (no status column on those tables; T-1.4.x may add via migration if soft-delete becomes a requirement).
  - POST upsert semantics on owner-profiles (PK is owner_id, caller provides). 201 on insert, 200 on update.

### Waves 11 + 12 — 2026-05-16 — T-1.0.2 + T-1.1.0 (parallel launch)

| Agent  | Task ID | Branch           | Profile            | Scope                                                                       | Status                   |
| ------ | ------- | ---------------- | ------------------ | --------------------------------------------------------------------------- | ------------------------ |
| t1-0-2 | T-1.0.2 | jmeireles/t1-0-2 | claude-yolo        | BFF auth integration — token-exchange + Redis JTI cache + secure-by-default | Crashed @ ~70%; rescued  |
| t1-1-0 | T-1.1.0 | jmeireles/t1-1-0 | claude-sonnet-yolo | Drizzle schema for catalog.\* (8 tables) + actions/wishes seed              | Done (clean self-commit) |

**First parallel launch of the session.** Two independent worktrees, no file scope overlap (BFF vs new catalog-svc), only `pnpm-lock.yaml` shared (resolves cleanly on rebase). Started 23:16; both PRs open by 23:32 (~16 min wall clock — t1-0-2 needed the orchestrator rescue, t1-1-0 finished in ~14 min agent + ~5 min orchestrator verify).

#### Agent: t1-0-2 (T-1.0.2) — partial agent + orchestrator rescue

- **Started**: 2026-05-16 23:16
- **Finished**: agent ~5 m before crash (1 autocommit at 23:?? capturing 8 files; agent shipped most of the BFF source cleanly); orchestrator manual completion ~10 m; verification + push ~5 m
- **Predicted time**: 75–100 m
- **Actual time**: ~20 m total
- **Complexity**: High (auth surface + multi-service integration + Redis side-effects + Testcontainers harness + compose extension)
- **LOC changed**: 12 files (+~600 / −20)
- **Commits**:
  - ⚠️ `5716ba6` — cs-agent autocommit-fallback. **8 files clean and high-quality**: package.json (ioredis + @fastify/cookie + jose + Testcontainers devs), config (+ JWT_SIGNING_KEY/TOKEN_SVC_URL/REDIS_URL with zod min(32) on the secret), lib/redis (lazy singleton + `setRedisForTest` seam + key naming convention with `markJtiRevoked` for future n8n use), lib/token-svc-client (typed `TokenExchangeError` + `fetch`), routes/token-exchange (302 graceful degrade + cookie + fire-and-forget Redis cache with logged failure), routes/health (auth-public + rate-limit-disabled), plugins/auth (REPLACE T-0.4.2 stub: verify-only + JTI check + `onRoute` secure-by-default hook), app.ts (+cookie plugin, +URL log redaction).
  - ✅ `3adbf54` — orchestrator manual completion: 5 Testcontainers vitest cases (happy + revoked + unknown opaque + expired JWT + cache-miss authed) with mocked token-svc client, helpers.ts harness, health.test.ts env-before-import fix, token-svc Compose entry in app.yml (internal-only, no Traefik, depends_on bff), `.env.example` JWT_SIGNING_KEY + rotation note, BFF README auth-flow section, infra/README.md service blurb + port table row, 2 small lint fixes.
- **PR**: [#26](https://github.com/zmeireles/daily-tour/pull/26) (merged as `3f8cb39`, all 6 CI checks green; human-merged per doctrine)
- **Acceptance**: 5/5 criteria met. `/r/:token` exchanges + 200 with JWT + `dt_refresh` HttpOnly cookie; `onRoute` hook auto-authenticates feature routes; revoked JTI → 401 within 1 min (test simulates by setting `jti:revoked:<jti>` directly); unknown opaque → 302 `/?reason=expired`; integration test uses Testcontainers Redis (token-svc mocked at boundary since T-1.0.1 covers it E2E).
- **Issues**:
  1. **3rd cs-agent autocommit-fallback this session** (after t1-0-1 and t0-4-2's prior session). Opus crash rate this session: 3/5 (60%); Sonnet: 0/2 (100% self-commit). Pattern is clear: **prefer Sonnet for Phase 1 mechanical tasks**, reserve Opus for the IPv4-pin / custom-migrator class of insight work.
  2. Two trivial lint fixes during orchestrator completion: `routes/token-exchange.ts`'s async-without-await registration (added an `eslint-disable-next-line @typescript-eslint/require-await` matching `routes/health.ts`); unused `afterEach` import in the new auth.test.ts.
- **New lessons**:
  - **`onRoute` hook is the right shape for secure-by-default auth** in Fastify. Routes opt OUT explicitly via `config.auth = "public"`. Future feature routes (discover, place detail) inherit auth for free.
  - **Mock token-svc at the test boundary**, don't spin it up in-process. The point of T-1.0.2's tests is the BFF; T-1.0.1 already covers token-svc E2E with 10 tests.
  - **Fire-and-forget Redis cache** on the happy path — log the failure, don't fail the request. Only the revocation check on the authed path is load-bearing.

#### Agent: t1-1-0 (T-1.1.0) — clean Sonnet self-commit

- **Started**: 2026-05-16 23:16
- **Finished**: agent ~14 m (clean self-commit `52ff412`); orchestrator verify ~5 m; one trivial CI fix-up ~2 m
- **Predicted time**: 60–90 m
- **Actual time**: ~21 m total (significantly under estimate — the prompt's "copy from token-svc + adjust schema name" template paid off)
- **Complexity**: Medium (8 tables + seed; mechanical mirror of T-1.0.0)
- **LOC changed**: 16 files (+~1730 / −0; +1727 in the schema commit, −3 in the build-script fix)
- **Commits**:
  - ✅ `52ff412` — agent's clean Sonnet self-commit. Custom migrator copied from token-svc per the cc-platform-feedback doctrine note I appended right before launch.
  - ✅ `63abdfd` — orchestrator CI fix-up. The agent's package.json had `"build": "tsup"` (copied from token-svc's scaffolding) but no `tsup` devDependency AND no `src/index.ts` entrypoint — the runtime lands in T-1.1.1. Dropped the `build` script + `main` + `dist`-in-`files`.
- **PR**: [#27](https://github.com/zmeireles/daily-tour/pull/27) (merged as `e054530`, all 6 CI checks green after `gh pr update-branch` because PR #26 merged in between)
- **Acceptance**: 3/3 criteria met. 8 tables in `catalog` schema, geometry via lat/lng doubles (PostGIS deferred), 6 actions + 36 wishes seeded idempotently from `05-tourism-domain.md §3`.
- **Issues**:
  1. Build script copy-paste from token-svc scaffolding caused the CI fail. The fix is trivial (drop the script) but the lesson is: **when copying scaffolding from a runtime service to a schema-only one, audit `scripts` and `files` to match the actual deliverables**.
  2. `gh pr update-branch` needed (same as T-1.0.2's PR #17 staleness pattern) because PR #26 merged ~5 min before PR #27's CI completed.
- **New lessons**:
  - **Sonnet's reliability continues to dominate Opus on mechanical tasks.** All 3 Sonnet waves this session (t0-4-3 in earlier reading was Opus actually — recheck; t1-0-0, t1-1-0) committed cleanly. Opus has 2 crashes (t1-0-1, t1-0-2) plus the partial t0-4-2 from the prior session.
  - **Sonnet faithfully followed the "copy from token-svc + adjust" template** — the prompt's reduction in spec verbosity (vs T-1.0.0's full spec) didn't cause any divergence. Smaller prompts work when there's an obvious reference implementation to point at.
  - **Mid-session cc-platform-feedback append worked**: the custom-migrator doctrine note I added right before launch was visible to the agent (via the prompt's link), and the agent applied it without prompting. Confirms the queue → reference pattern.
- **Decisions made on the fly (orchestrator)**:
  - Picked Sonnet for T-1.1.0 despite the T-1.0.0 → T-1.1.0 similarity (both schema work). Validated — 100% clean.
  - Launched in parallel with T-1.0.2 (different worktree, no file overlap). First time this session; pattern worked. Lockfile conflict on `pnpm-lock.yaml` resolved automatically via `gh pr update-branch`.

### Wave 10 — 2026-05-16 — T-1.0.1 (sequential, recovery) — opens token-svc HTTP surface

| Agent  | Task ID | Branch           | Profile     | Scope                                                                    | Status                  |
| ------ | ------- | ---------------- | ----------- | ------------------------------------------------------------------------ | ----------------------- |
| t1-0-1 | T-1.0.1 | jmeireles/t1-0-1 | claude-yolo | token-svc Fastify endpoints (issue/exchange/revoke) + tests + Dockerfile | Crashed @ ~40%; rescued |

#### Agent: t1-0-1 (T-1.0.1) — partial agent + orchestrator rescue

- **Started**: 2026-05-16 22:05
- **Finished**: agent ~5 m before crash (2 autocommits at 22:10:37 + 22:11:15 capturing 7 files); orchestrator manual completion ~40 m; verification + push ~10 m
- **Predicted time**: 90–120 m
- **Actual time**: ~60 m total (agent + orchestrator)
- **Complexity**: High (4 endpoints + Testcontainers harness + Dockerfile + migrator gotcha + cs-agent crash recovery)
- **LOC changed**: 18 files (+~1300 / −15 across 4 commits; ~750 in lockfile)
- **Commits**:
  - ⚠️ `3d253f4` — cs-agent autocommit-fallback (`feat: agent work on t1-0-1 (auto-committed by closer)`) — package.json deps, config.ts, db/client.ts, instrumentation.ts, opaque-token.ts, version.ts
  - ⚠️ `031590d` — second cs-agent autocommit ~40s later — lib/jwt.ts
  - ✅ `802278f` — orchestrator manual completion — 3 routes + app.ts + index.ts + tsup/vitest configs + Dockerfile + dual `.dockerignore` + helpers + 4 test files + **custom migrator** + README updates
  - ✅ `be77dce` — orchestrator README cleanup (duplicate heading + tracking-table location)
- **PR**: [#24](https://github.com/zmeireles/daily-tour/pull/24) (merged as `792eaa6`, all 6 CI checks green; human-merged per doctrine)
- **Acceptance**: all 5/5 criteria met. 3 endpoints + 10 vitest tests (Testcontainers-pg on pgvector/pgvector:pg17). Native smoke green: issue → exchange (JWT decodes with sub/rid/gh/locale/jti) → revoke 204 → re-exchange 401 → idempotent revoke 204 → unknown jti 404 → invalid opaque 401. Log redaction confirmed (opaque NOT in service logs). Docker image 227 MB.
- **Issues**:
  1. **Agent crashed at ~40% via cs-agent's autocommit-fallback closer.** Two autocommit commits ~40s apart suggest the agent did several rounds of work but the cs-agent watchdog killed the tmux session before the agent's own commit. **Pattern observation**: Opus may not be as reliable as the "~100% self-commit" pattern this session had been showing (3 waves of agent self-commits before this). Recovery path: read the partial files, write the rest manually following the prompt. **Lesson**: cs-agent's two-autocommit pattern (vs the usual one) is a tell that the agent was actively working but got truncated; preserve both commits for attribution.
  2. **drizzle-orm bundled migrator incompatible with least-privilege architecture.** The migrator unconditionally emits `CREATE SCHEMA IF NOT EXISTS` for both the data schema (`auth_tokens`) AND its tracking schema (`drizzle` by default). Both require DB-level CREATE which `token_svc` intentionally doesn't have. Tried `migrationsSchema: "auth_tokens"` — still fails because the bundled migrator emits CREATE SCHEMA for the targeted schema too. **Fix**: replaced with ~50 lines of custom migrator in `src/db/client.ts` — creates only `auth_tokens.__drizzle_migrations` (TABLE-level perm in the schema we own), reads SQL files from `drizzle/migrations/` in lexical order, splits on `--> statement-breakpoint`, applies in transactions, records SHA-256 hashes for idempotency. Cross-cut to [`cc-platform-feedback.md`](../../../../.claude/docs/cc-platform-feedback.md).
  3. **`pnpm dev` (tsx watch) doesn't run `main()` correctly.** `/health` responds but migrations never apply. Direct `./node_modules/.bin/tsx src/index.ts` and `node dist/index.js` (Dockerfile CMD) both work. Likely a tsx-watch + initOtel() startup ordering issue. **Prod unaffected** because the container CMD bypasses tsx-watch. Filed as a followup; for now use direct tsx invocation for native dev.
  4. **Lint friction during recovery.** 6 lint errors caught by the project ESLint config:
     - `req.remoteAddress` doesn't exist on `FastifyRequest` in Fastify v5 → use `req.ip` instead.
     - Async functions without `await` (the route registration wrappers) → drop the `async` keyword.
     - Unused imports (`sql`, `and`, `isNull`) → remove.
     - `prefer-const` for `let ctx` that's only assigned once → restructure to `const ctx = await startTestPostgres();` at top-level.
     - `@typescript-eslint/no-unnecessary-type-assertion` for `res.json() as X` → use the generic `res.json<X>()` instead.
     - `tsup.config.ts` + `vitest.config.ts` parsing errors → add to `tsconfig.eslint.json` `include` list.
- **Lessons applied** (from previous waves):
  - Pushed BEFORE killing the worktree (L008). Branch reached origin safely.
  - 10-point migration SQL review carried over from T-1.0.0 to vet any migrator changes.
  - Pre-push audit caught no new CVEs (drizzle was already bumped in T-1.0.0).
- **New lessons**:
  - **cs-agent two-autocommit pattern is the tell for "agent was actively working but got truncated by closer".** Preserve both commits; don't squash them.
  - **drizzle-orm bundled migrator is incompatible with infra-managed schemas.** The custom migrator is ~50 lines and gives full control. Cross-cut doctrine note to cc-platform-feedback.
  - **tsx watch + initOtel() has a startup ordering bug.** Direct tsx works; bundled `node dist/index.js` works. Avoid tsx watch for services that initOtel() at module load.
  - **Fastify v5 dropped `req.remoteAddress` in favor of `req.ip`.** Pattern for future Fastify v5 services.
  - **Recovery PRs are doable but expensive.** ~50 min of orchestrator time vs ~30 min if the agent had finished cleanly. Worth tracking the agent crash rate (1 of 4 Opus-yolo waves this session crashed at autocommit-fallback).
- **Decisions made on the fly (orchestrator)**:
  - Continued manually on the worktree branch rather than re-launching a fresh agent. Faster, more reliable, preserves agent attribution.
  - Picked the (a) design for `jti` (= `sha256(opaque)`) — same as documented in the prompt; one identifier for lookup + revoke.
  - Custom migrator instead of `migrationsSchema: "auth_tokens"` workaround — the latter still failed because drizzle-orm's bundled migrator emits CREATE SCHEMA for the targeted schema too.

| Agent  | Task ID | Branch           | Profile            | Scope                                                                         | Status |
| ------ | ------- | ---------------- | ------------------ | ----------------------------------------------------------------------------- | ------ |
| t1-0-0 | T-1.0.0 | jmeireles/t1-0-0 | claude-sonnet-yolo | Drizzle schema for `auth_tokens.{guest, reservation, token_grant}` + dev seed | Done   |

#### Agent: t1-0-0 (T-1.0.0)

- **Started**: 2026-05-16 02:34
- **Finished**: agent ~7 min (clean Sonnet self-commit `f621009`); orchestrator verification + port/idempotency fix + drizzle CVE bump + verification ~70 min (extended by a cross-cutting infra collision that surfaced mid-verification — see Issue 1 below)
- **Predicted time**: 50–75 min
- **Actual time**: ~77 min wall clock (mostly orchestrator post-agent, not agent work)
- **Complexity**: Low for agent (mechanical schema + seed); High for orchestrator (CVE remediation + cross-project infra fix + drizzle-kit gotcha + idempotency bug)
- **LOC changed**: 14 files (+~1450 net, ~750 of which is lockfile)
- **Commits**:
  - ✅ `f621009` — agent's clean Sonnet self-commit (Drizzle schema scaffold + drizzle.config + seed runner + README)
  - ✅ `92e445b` — orchestrator fix-ups (port 5432 → 27432 in drizzle.config + seed defaults; reservation-seed idempotency bug — added fixed UUIDs since `defaultRandom()` made `onConflictDoNothing` a no-op)
  - ✅ `d2bf70a` — orchestrator CVE fix-up (drizzle-orm ^0.36 → ^0.45.2 to patch [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9) HIGH "SQL injection via improperly escaped SQL identifiers"; drizzle-kit ^0.30 → ^0.31.10 matching; migration regenerated and hand-stripped of re-emitted `CREATE SCHEMA "auth_tokens";` header)
- **PR**: [#22](https://github.com/zmeireles/daily-tour/pull/22) (merged, all 6 CI checks green)
- **Acceptance**: 3/3 criteria met:
  - Tables in `auth_tokens` with proper types (timestamptz everywhere, date for checkin/checkout, uuid PKs with gen_random_uuid()).
  - Drizzle migration generated + hand-reviewed against 10-point checklist (all pass: no CREATE SCHEMA, dep-order tables, 6 check constraints, FK RESTRICT for guest + CASCADE for token_grant, 4 btree indexes, all timestamps timestamptz, no destructive ops).
  - Seed loads 2 guests + 2 reservations + 1 placeholder guesthouse-id; idempotent across re-runs (after the orchestrator fixed the reservation-uuid bug).
- **Issues**:
  1. **Cross-project host-port collision blocked live DB verification.** `docker compose up postgres` failed with `bind: address already in use` on 5432 — held by `cc-dev-postgres` from a sibling project. Rather than stop the other stack, did a structural fix: PR #21 (`chore(infra): remap host ports to 27xxx + hostnames to *.dt.localhost`) — reserved the 27xxx host-port block for daily-tour, templated via `DT_HOST_PORT_*` env vars + `${TRAEFIK_DOMAIN_BASE:-dt.localhost}`, verified end-to-end on the new ports. Then back to T-1.0.0 verification. **Cross-cut into cc-platform-feedback.md** as a recurring multi-project pattern.
  2. **drizzle-kit ALWAYS re-emits `CREATE SCHEMA` for `pgSchema()` targets.** Tested on both drizzle-kit 0.30 (agent's original) and 0.31.10 (post-CVE bump). The `auth_tokens` schema is created by `infra/postgres/init/01-schemas.sql` (shared infra, schema-per-service); applying drizzle-kit's output unmodified would `ERROR: schema "auth_tokens" already exists` in prod. Hand-strip required after every `db:generate`; added a comment to the SQL header explaining the strip. **Cross-cut into cc-platform-feedback.md** — doctrine note for any project using Drizzle with infra-managed schemas.
  3. **Reservation seed wasn't idempotent.** Guests had fixed UUIDs so `onConflictDoNothing` caught the dup PK. Reservations relied on `defaultRandom()` for `id` — new UUID every run, no conflict, rows doubled on re-seed (2 → 4 → 6 …). Fixed by giving reservations `ccc00001-…` fixed UUIDs (mirroring the guest pattern). Verified: count stable at 2/2 across re-runs.
  4. **Pre-push audit caught HIGH CVE in agent's drizzle-orm pin.** Same recurring pattern as T-0.4.2's @fastify/jwt CVE — agent picks the version they trained on; CVE landed since. Bump + re-test; 0.36→0.45 didn't break the schema-definition surface (pgSchema/pgTable/check/index/references stable).
  5. **drizzle-kit's filename naming.** 0.31 emitted `0000_elite_chimera.sql` (random adjective-noun); renamed back to `0000_init.sql` + updated `_journal.json.tag` for readability.
- **Lessons applied** (from previous waves):
  - Pushed BEFORE killing the worktree (L008). Branch reached origin safely.
  - Used `gh pr update-branch` for branch staleness — not needed this round since PR #21 + #22 merged in user-controlled order.
  - Pre-push audit gate fired predictably (Wave 7 pattern); ~2 s wall time saved a 60s CI failure.
- **New lessons**:
  - **Cross-project infra collisions are a recurring tax.** Every dev machine running ≥2 projects of mine will hit port collisions. The fix (env-var templated host-port block + hostname suffix) should be the SCAFFOLD-TIME default for new projects, not a retrofit. Cross-cut to cc-platform-feedback.
  - **Drizzle `pgSchema()` + infra-managed schema = permanent strip requirement.** Doctrine note in service README; consider a lefthook check that flags `CREATE SCHEMA "<known-infra>"` in any new migration. Cross-cut to cc-platform-feedback.
  - **Seed idempotency requires fixed UUIDs on every row, not "most".** `onConflictDoNothing` is a no-op if the PK is random. Lesson: when writing any dev seed, write the assertion FIRST (run twice, expect equal counts), then write the inserts.
  - **CVE recurrence is the new normal at the pre-push audit gate.** 2/2 wave starts (T-0.4.2, T-1.0.0) have surfaced a fresh HIGH/CRITICAL on an agent-picked dep version. Fix is mechanical; expect it; budget ~5 min per occurrence.
- **Decisions made on the fly (orchestrator)**:
  - Did the infra remap (PR #21) BEFORE finishing T-1.0.0 verification. Adds ~1 PR to the cycle but converts a transient port collision into a permanent structural fix. The user explicitly approved this scope expansion.
  - Picked the (a) design for `jti` in the upcoming T-1.0.1: `jti = sha256(opaque)` — one identifier for both lookup and revoke. Documented in the T-1.0.1 prompt. Alternate (b) needed a schema migration; out of scope here.

| Agent  | Task ID | Branch           | Profile     | Scope                                                                              | Status |
| ------ | ------- | ---------------- | ----------- | ---------------------------------------------------------------------------------- | ------ |
| t0-4-3 | T-0.4.3 | jmeireles/t0-4-3 | claude-yolo | Compose app overlay — bff (built) + pwa-static (nginx + bind mount) behind Traefik | Done   |

#### Agent: t0-4-3 (T-0.4.3)

- **Started**: 2026-05-16 00:43
- **Finished**: agent ~9 m (clean Opus self-commit `618e2d5`); orchestrator verify + branch-update + push ~12 m
- **Predicted time**: 35–50 m
- **Actual time**: ~21 m total
- **Complexity**: Medium (compose overlay + nginx config + cross-Compose-file Traefik labels + the IPv4-pin discovery)
- **LOC changed**: +248 / −41 across 3 files (1 new compose file, 1 new nginx conf, 1 README append)
- **Commit verified**: ✅ `618e2d5` — clean Opus self-commit with conventional message and rich body
- **PR**: [#19](https://github.com/zmeireles/daily-tour/pull/19) (merged as `1d9a0ce`, all 6 CI checks green after `gh pr update-branch` to incorporate PR #18)
- **Acceptance**: 2/2 criteria met. `pnpm build && docker compose ... up --build` brings 11 containers healthy in ~3 min; PWA via Traefik on `app.localhost` (200), SPA fallback (200), `/healthz` (200), BFF on `api.localhost` (`{"status":"ok",...}`), CORS preflight (204). Hot-reload dev flow documented in `infra/README.md` "Dev flows" subsection (native `pnpm dev` for PWA + BFF natively, Compose runs the rest). Gitleaks clean (52 commits + `--no-git`).
- **Issues**:
  1. **Agent-discovered IPv4-pin requirement.** BusyBox `wget` (in both `node:22-alpine` and `nginx:1.27-alpine`) prefers IPv6, but Fastify only listens on `0.0.0.0` (IPv4) and the read-only nginx bind-mount blocks the docker-entrypoint from appending `listen [::]:80;` to default.conf. Both healthchecks pinned to `http://127.0.0.1` instead of `localhost` to fix. Documented in inline comments. **Promote to project-wide convention** for any Compose service whose runtime image uses BusyBox userland (alpine variants).
  2. **PR branch was BEHIND main** (PR #18 docs landed in between). Same staleness pattern as PR #17. Fix: `gh pr update-branch 19` — non-destructive, CI re-ran, auto-merge fired ~1 min later. **Lesson**: when running back-to-back doc + feature merges, the second feature PR will always need a branch-update first. Could be automated by having `cs-agent push` always run `gh pr update-branch` if it detects the base branch has moved.
- **Lessons applied** (from previous waves):
  - Pushed BEFORE killing the worktree (L008). Branch reached origin safely.
  - Used `gh pr update-branch` for the staleness instead of force-rebase (L Wave 7).
- **New lessons**:
  - **IPv4 pinning for healthchecks** — dev's most subtle Compose footgun. The container starts, the app listens, the healthcheck returns `connection refused`, the service goes "unhealthy" with no obvious cause. The agent caught this from cold by reading the runtime image's wget behavior — that's the Opus profile earning its rate-limit cost.
  - **`gh pr update-branch` is now a routine step** — if a docs PR merges between agent push and CI green, the feature PR's auto-merge gets stuck on `BLOCKED / BEHIND`. One-line fix.
  - **Phase 0 is closed.** All 15 active tasks done; T-0.4.4 (CI deploy gate) deferred until QA VPS exists. Phase 1 opens at T-1.0.0.
- **Decisions made on the fly (orchestrator)**:
  - Did not block on the `--build` flag being newly required for `up`. Documented in the bring-up snippet; future Phase 5 may pre-build the BFF image and push it to GHCR for image-based deploys (no `--build` needed at compose-up time).
  - Bind-mount serving was kept as the Phase 0 PWA serving strategy. Phase 5 (or T-0.4.4) likely switches to a built nginx image with the dist `COPY`'d in for QA / prod.

### Wave 7 — 2026-05-16 — T-0.4.2 (sequential)

| Agent  | Task ID | Branch           | Profile     | Scope                                                                          | Status |
| ------ | ------- | ---------------- | ----------- | ------------------------------------------------------------------------------ | ------ |
| t0-4-2 | T-0.4.2 | jmeireles/t0-4-2 | claude-yolo | BFF skeleton — Fastify v5.8.5 + OTel + helmet/cors/rate-limit/jwt + Dockerfile | Done   |

#### Agent: t0-4-2 (T-0.4.2)

- **Started**: 2026-05-15 22:27
- **Finished**: agent ~30 m (clean Opus self-commit `93a35b3`); orchestrator verify + CVE remediation + branch-update next session ~50 m
- **Predicted time**: 75 m
- **Actual time**: ~80 m total (across two sessions; agent idle ~24 h between)
- **Complexity**: Medium (BFF code) + Medium (CVE remediation surfaced by pre-push audit)
- **LOC changed**: +1271 / −16 across 22 files (across 2 commits on the branch + 1 GitHub merge commit from `gh pr update-branch`)
- **Commits**:
  - ✅ `93a35b3` — agent's clean conventional commit (Fastify scaffold + OTel + plugins + Dockerfile + vitest smoke)
  - ✅ `021c03d` — orchestrator CVE fix-up (`@fastify/jwt` `^9.0.0` → `^10.0.0` to patch 4 `fast-jwt` advisories)
- **PR**: [#17](https://github.com/zmeireles/daily-tour/pull/17) (merged, all 6 CI checks green)
- **Acceptance**: 5/6 criteria met; **Dockerfile <200 MB acceptance missed at 216 MB** (8 % over). All other criteria green: pnpm package + TS strict, Fastify v5.8.5 on `:8080`, `/health` returns `{"status":"ok",...}` (cold start 4 s under `tsx watch`, 2 s in container), all 4 plugins wired with HS256 dev fallback + `JWT_PUBLIC_KEY` env passthrough, OTel via `@daily-tour/shared-otel`, vitest smoke test for `/health` (1 passing, 132 ms).
- **Issues**:
  1. **Pre-push audit caught 4 critical/high CVEs** in `@fastify/jwt@9.1.0 → fast-jwt@5.0.6` path (GHSA-mvf2-f6gm-w987, GHSA-rp9m-7r4c-75qg, GHSA-gmvf-9v4p-v8jc, GHSA-hm7r-c7qw-ghp6). Same gate the agent's `pnpm install` ran without complaint — the Renovate-style gate now fires at push, not at install. **Fix**: bump `@fastify/jwt` to `^10.0.0` (declares `fast-jwt: ^6.0.2` → resolves to patched 6.2.4). No source changes — auth plugin uses only the stable `register` + `req.jwtVerify()` surface.
  2. **`gh pr update-branch` needed** because the t0-4-2 worktree was branched from PR #15's merge but PR #16 (handoff doc) landed in between. Per the `protect-main` ruleset (require up-to-date), the merge button was blocked until the branch was rebased / merged. Used the GitHub UI's merge approach (non-destructive, no force-push); CI re-ran and went green in ~1 min.
  3. **`Dockerfile.dockerignore` flagged as suspect** in the prior session's handoff (suspected misnamed `.dockerignore`) — turned out to be a deliberate documented BuildKit feature. When `docker build -f services/bff/Dockerfile .` runs from the repo root, BuildKit looks for `<dockerfile-name>.dockerignore` adjacent to the Dockerfile before falling back to the context root's `.dockerignore`. Both files exist with explanatory header comments. **Lesson**: read header comments before assuming a filename is a typo.
- **Lessons applied** (from previous waves):
  - Lesson from Wave 6 — pre-push audit gate caught the CVE in <2 s instead of failing 60 s into CI. Local lefthook ↔ CI parity paid off again.
  - Pushed BEFORE killing the worktree (L008). Branch reached origin safely.
- **New lessons**:
  - **CVE bumps escalate per doctrine** — even when the bump is mechanical and CI is green. Auto-merge counter unchanged at 1/3 (vs the predicted 2/3); headroom preserved for T-0.4.3.
  - **Dual-`.dockerignore` pattern (`<dockerfile>.dockerignore` + `.dockerignore`)** is a real BuildKit feature, not a footgun. Future Dockerfile reviews should respect it when both files exist with parity comments.
  - **`gh pr update-branch` is the right tool for branch-staleness on linear-history-required repos** — creates a merge commit on the feature branch that gets squashed away on final merge. Cheaper than a local rebase + force-push.
- **Decisions made on the fly (orchestrator)**:
  - Pushed with the 216 MB image-size deviation disclosed in the PR body rather than spending a round on optimization (distroless / OTel sidecar split). Tracked as a Phase 0/5 follow-up in [`docs/ai/backlog.md`](../../ai/backlog.md). Phase 0 closes on schedule.
  - Bundled the `@fastify/jwt` bump into the same PR rather than splitting it out — the audit gate would have blocked the push regardless, and the bump is mechanical (no source changes).

### Wave 6 — 2026-05-15 — T-0.2.1 (sequential)

| Agent  | Task ID | Branch           | Profile            | Scope                                                        | Status |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------------------ | ------ |
| t0-2-1 | T-0.2.1 | jmeireles/t0-2-1 | claude-sonnet-yolo | shared-otel (Node OTel SDK helper) + lefthook ↔ CI alignment | Done   |

#### Agent: t0-2-1 (T-0.2.1)

- **Started**: 2026-05-15 ~15:10
- **Finished**: agent ~25 m; orchestrator CVE + alignment fix-ups ~30 m
- **Predicted time**: 55 m
- **Actual time**: ~55 m total
- **Complexity**: Medium (agent work) + Medium (CVE remediation surfaced API surface change)
- **LOC changed**: +2511 / −259 across 16 files (across 3 commits on the branch)
- **Commits**:
  - ✅ `b9c0416` — agent's clean conventional commit
  - ✅ `9fe19f5` — orchestrator CVE fix-up (OTel 0.57 → 0.218 line + Resource→resourceFromAttributes + fastify split)
  - ✅ `5f47ea9` — orchestrator lefthook alignment (audit/tests/lint-affected pre-push, subject-case in commit-msg)
- **PR**: [#6](https://github.com/zmeireles/daily-tour/pull/6) (merged, all 6 CI checks green)
- **Acceptance**: 4 exports (`initOtel`, `readOtelConfig`, `registerShutdownHooks`, `VERSION`); 9 tests pass (mocked SDK); turbo 3/3 green; `pnpm audit --prod --audit-level=high` clean after the bump.
- **Issues**:
  1. Agent picked OTel `0.57.x` line — a 5-month-old version. Transitively pulled `@opentelemetry/exporter-prometheus <0.217.0` which has [GHSA-q7rr-3cgh-j5r3](https://github.com/advisories/GHSA-q7rr-3cgh-j5r3) HIGH (prometheus exporter crash via malformed HTTP). CI's `pnpm audit --prod --audit-level=high` job failed correctly. **Fix**: bumped all OTel deps to the `0.218.x` line (current latest), which required handling two API breaking changes: `new Resource(...)` → `resourceFromAttributes(...)` factory, and fastify being dropped from `auto-instrumentations-node@0.76` bundle (added `@opentelemetry/instrumentation-fastify` as a direct dep and register manually alongside the auto set). Test mocks updated for both.
  2. PR title slip — I set `feat(shared-otel): Node ...` (capital N). pr-title.yml's `subjectPattern: ^(?![A-Z]).+$` correctly rejected it. Renamed to `feat(shared-otel): add Node ...`.
  3. Initial commit blocked by lefthook eslint-staged hook because bare `eslint` finds no root `eslint.config.js`. Same workaround T-0.2.0 used (`.lefthook-local.yml` gitignored opt-out) unblocked, then permanent fix in commit `5f47ea9`.
- **Lessons applied** (from previous waves):
  - Pushed BEFORE killing the worktree this time. Branch reached origin safely.
  - Agent's clean self-commit confirmed the trend continues (pnpm install + conventional message both in the first commit).
- **New lesson**: **CI's `pnpm audit` is now mirrored by a local pre-push hook so HIGH+ CVEs in deps are caught before the push, not 60 s into the runner.** Same for `lint-affected` (via turbo) and `tests`. Wall time for the parallel pre-push gate: ~2 s.
- **Decisions made on the fly (orchestrator)**:
  - When agent's `auto-instrumentations-node@0.76` dropped fastify from its bundle, opted for the explicit-direct-dep approach over silently losing fastify coverage. Acceptance criterion preserved.
  - `commit-msg` validator gains a step-2 subject-case check (`^[A-Z]` → reject) matching pr-title.yml. Two-step validation: type-scope-colon shape first, lowercase-subject second.

### Wave 5 — 2026-05-15 — T-0.2.0 (sequential) — opens Slice 0.2

| Agent  | Task ID | Branch           | Profile            | Scope                                                      | Status |
| ------ | ------- | ---------------- | ------------------ | ---------------------------------------------------------- | ------ |
| t0-2-0 | T-0.2.0 | jmeireles/t0-2-0 | claude-sonnet-yolo | shared-types (14 entity zod schemas + 10 enums + 50 tests) | Done   |

#### Agent: t0-2-0 (T-0.2.0)

- **Started**: 2026-05-14 ~22:04
- **Finished**: agent ~30 m (idled afterwards waiting for input); orchestrator rescue + push next day
- **Predicted time**: 75 m
- **Actual time**: agent ~30 m + orchestrator verify + GH-flake retry ~30 m
- **Complexity**: High (largest task so far — 14 schemas + tests + tsup + tsconfig-eslint workaround)
- **LOC changed**: +2606 / −61 across 29 files (1540 in lockfile)
- **Commit verified**: ✅ `22fc364` — proper conventional message, agent self-committed
- **PR**: [#5](https://github.com/zmeireles/daily-tour/pull/5) (merged)
- **Acceptance**: all 14 entity schemas + helpers + VERSION constant + 50 tests (46 runtime + 4 type-level via `expectTypeOf`). tsup ESM build emits `dist/index.d.ts` 34.93 KB. `pnpm exec turbo run build typecheck test --filter=@daily-tour/shared-types` → 3/3 successful in 2.6 s.
- **Issues**:
  1. cs-agent tmux session went idle at the end-of-work prompt and showed as "running 8h38m past estimate" until the orchestrator inspected. Wasn't stuck — just waiting for orchestrator input. **Lesson**: agent prompts that don't end with a clear "stop here" instruction may idle; the cs-agent status `+8h38m` delta is the tell.
  2. Orchestrator killed the cs-agent session BEFORE pushing the branch. Worktree dir was removed; the `jmeireles/t0-2-0` branch + commit survived in the main repo and was pushed manually. **Lesson**: never `cs-agent kill <name>` before `cs-agent push <name>` — the kill cleans the worktree but the branch is still in the main repo's refs, so it's recoverable via direct `git push`.
  3. GitHub Actions Security workflow on PR #5 hit a backend flake — all 3 jobs queued 14m12s, never started, surfaced as "Internal server error. Correlation ID: c95fb93d…". Same workflow file ran green on the push-to-main and on the rerun. `gh run rerun 25907136770` fixed it. **Lesson**: workflow-as-failed without job logs ≈ runner-allocation flake — always re-run before investigating the YAML.
- **Decisions made on the fly (by the agent, carried in the commit body)**:
  - Added sibling `tsconfig.eslint.json` because typescript-eslint can't follow pnpm symlinks through `@daily-tour/shared-config/tsconfig/node → ../../tsconfig.base.json`. Build/typecheck use the npm-package-based tsconfig; ESLint uses the direct-path one.
  - Created `.lefthook-local.yml` (gitignored) to skip `eslint-staged` pre-commit until per-package ESLint configs land in T-0.4.0 / T-0.4.2.
  - Top-level schemas use `.strict()` to force deliberate schema evolution.
  - tsup ESM-only (no CJS) — every consumer is `type: module`.

### Wave 4 — 2026-05-14 — T-0.1.4 (sequential) — closes Slice 0.1

| Agent  | Task ID | Branch           | Profile     | Scope                                                       | Status |
| ------ | ------- | ---------------- | ----------- | ----------------------------------------------------------- | ------ |
| t0-1-4 | T-0.1.4 | jmeireles/t0-1-4 | claude-yolo | GH Actions CI + security + PR title + Renovate + CODEOWNERS | Done   |

#### Agent: t0-1-4 (T-0.1.4)

- **Started**: ~19:30
- **Finished**: ~19:58 (agent ~13 m + orchestrator verify/fix + CI iteration ~15 m)
- **Predicted time**: 50 m
- **Actual time**: ~28 m total
- **Complexity**: Medium–High (multi-workflow + Renovate + CodeQL)
- **LOC changed**: +348 / −0 (agent) + 1 file +6 / −2 (orchestrator fetch-depth fix)
- **Commit verified**: ✅ `b8bc0d7` (agent auto-commit), `a95f5bd` (orchestrator)
- **PR**: [#4](https://github.com/zmeireles/daily-tour/pull/4) (merged, all 6 CI checks green on its own PR)
- **Acceptance**: every workflow file + Renovate + CODEOWNERS + PR template criteria met. CI ran green on PR #4 after fixes.
- **Issues**:
  1. cs-agent autocommit fallback fired again (third Sonnet/Opus session this run with same symptom). Did NOT introduce scope errors this time. **Pattern**: most cs-agent sessions end before the commit step. Mitigation: tolerate the auto-commit, fix message at squash-merge via PR title.
  2. First CI run failed on the new CI (the meta-test) for two reasons caught by the new workflows:
     - `fetch-depth: 2` left `origin/main` unmaterialised → turbo `--filter=...[origin/main]` errored "unknown revision". Bumped to `fetch-depth: 0` (full history; <1s on a small monorepo).
     - PR title `T-0.1.4:` rejected by `pr-title.yml` (no conventional prefix). Renamed to `ci: …`. **Lesson**: orchestrator PR titles must follow the same Conventional-Commits gate as commit messages.
- **Decisions made on the fly**: pinned actions to major (`@v4`, `@v3`, `@v2`) — Renovate will update digests. Trivy + Python CodeQL both deferred with TODO comments naming the unlock task (T-0.4.4 / T-2.0.x). n8n updates explicitly disabled in Renovate config with reference to [`04-tech-stack.md §6`](../../exploration/04-tech-stack.md).

### Wave 3 — 2026-05-14 — T-0.1.3 (sequential)

| Agent  | Task ID | Branch           | Profile            | Scope                                    | Status |
| ------ | ------- | ---------------- | ------------------ | ---------------------------------------- | ------ |
| t0-1-3 | T-0.1.3 | jmeireles/t0-1-3 | claude-sonnet-yolo | lefthook + gitleaks + .gitignore broaden | Done   |

#### Agent: t0-1-3 (T-0.1.3)

- **Started**: ~18:40
- **Finished**: ~19:02 (agent ~12 m + orchestrator verify/fix ~10 m)
- **Predicted time**: 35 m
- **Actual time**: ~22 m total
- **Complexity**: Medium (non-interactive-shell nvm issue surfaced)
- **LOC changed**: +265 / −1 (agent) + 1 file +13 / −4 (orchestrator nvm fix-up)
- **Commit verified**: ✅ `20e905b` (agent), `39f0766` (orchestrator)
- **PR**: [#3](https://github.com/zmeireles/daily-tour/pull/3) (merged)
- **Acceptance**: all 11 criteria met after fix-up. lefthook installs on `pnpm install`; pre-commit + commit-msg + pre-push all wired; gitleaks system binary detected (`/usr/bin/gitleaks`) and runs cleanly.
- **Issues**:
  1. pre-push hook (`pnpm typecheck`) blocked the first `cs-agent push` because hook shells don't source nvm — pnpm ran under Node 25 and engine-strict bit. Patched each hook to `. ~/.nvm/nvm.sh && nvm use --silent` first; graceful fall-through if nvm absent. **Lesson**: every hook script that uses pnpm must self-activate nvm.
- **Decisions made on the fly**: Conventional-Commits regex explicitly skips merge commits and the cs-agent autocommit-fallback pattern, so we don't hard-block on cs-agent quirks. gitleaks allowlist covers `.mcp.json.template` placeholders and adds a custom `dt_` token rule for future T-1.0.x reservations.
- **Improvements vs T-0.1.2**: agent ran `pnpm install` this round (lesson baked into prompt), so no lock-sync follow-up needed.

### Wave 2 — 2026-05-14 — T-0.1.2 (sequential)

| Agent  | Task ID | Branch           | Profile            | Scope                                            | Status |
| ------ | ------- | ---------------- | ------------------ | ------------------------------------------------ | ------ |
| t0-1-2 | T-0.1.2 | jmeireles/t0-1-2 | claude-sonnet-yolo | shared-config + Prettier (+ Node bump follow-up) | Done   |

#### Agent: t0-1-2 (T-0.1.2)

- **Started**: ~18:05
- **Finished**: ~18:28 (agent ~10 m + orchestrator install/verify/fix-up ~13 m)
- **Predicted time**: 40 m
- **Actual time**: ~23 m total
- **Complexity**: Low–Medium (transitive-dep version pin surfaced)
- **LOC changed**: +222 / −0 (agent) + 2 files (.nvmrc, pnpm-lock) +2251 / −1 (orchestrator follow-up)
- **Commit verified**: ✅ `62de7bd` (agent auto-commit), `0d3536e` (orchestrator fix-up)
- **PR**: [#2](https://github.com/zmeireles/daily-tour/pull/2) (merged)
- **Acceptance**: all 14 criteria met after fix-up. shared-config exports resolve via subpath map; pnpm lint/typecheck green.
- **Issues**:
  1. Agent created files but did not run `pnpm install` before session closed → cs-agent autocommit fallback fired with generic message ("agent work on t0-1-2 (auto-committed by closer)"). **Lesson**: future prompts must list `pnpm install` as a numbered step.
  2. `.nvmrc` 22.11.0 from T-0.1.1 was too conservative — `eslint-visitor-keys@5.0.1` (pulled by typescript-eslint v8) requires Node ≥22.13. Bumped to 22.22.3 in fix-up commit.
- **Decisions made on the fly**: kept root `tsconfig.base.json` (T-0.1.1) as canonical base; shared-config provides per-runtime presets that extend it. Subpath exports map (`./eslint/node`, `./tsconfig/react`, etc.) for clean downstream imports.

### Wave 1 — 2026-05-14 — T-0.1.1 (sequential)

| Agent  | Task ID | Branch           | Profile     | Scope                         | Status |
| ------ | ------- | ---------------- | ----------- | ----------------------------- | ------ |
| t0-1-1 | T-0.1.1 | jmeireles/t0-1-1 | claude-yolo | repo-root scaffold (10 files) | Done   |

#### Agent: t0-1-1 (T-0.1.1)

- **Started**: ~17:34
- **Finished**: ~17:42 (~8 min wall + 5 min orchestrator verification)
- **Predicted time**: 45 m
- **Actual time**: ~8 m
- **Complexity**: Low
- **LOC changed**: +218 / −0 across 10 files
- **Commit verified**: ✅ `685dfcd`
- **PR**: [#1](https://github.com/zmeireles/daily-tour/pull/1) (merged)
- **Acceptance**: all 11 criteria met. `pnpm install` deterministic; `engine-strict=true` correctly rejects Node ≠22; Turborepo 2.x `tasks` schema; TS strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`.
- **Issues**: cs-agent launch initially failed with `can't find pane: 1.1` when name contained dots. Renamed `t-0.1.1` → `t0-1-1` and relaunched cleanly. Lesson: cs-agent names must be hyphen-only, never dotted.
- **Decisions made on the fly**: turbo.json uses `ui: "tui"` for richer terminal output; `globalDependencies` includes `tsconfig.base.json`, `.npmrc`, `.nvmrc`. No deviations from prompt.
