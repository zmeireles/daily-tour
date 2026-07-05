# Plan-008 — Owner Backoffice Redesign — Execution Log

Wave-by-wave record. Plan: [`README.md`](./README.md) · tasks: [`TODO.md`](./TODO.md) · design source of truth: [`docs/design/backoffice-redesign/proposal-001.md`](../../design/backoffice-redesign/proposal-001.md).

## Wave 1 — Slice 0: Foundation & the two cleanups (2026-07-02 → 07-03) ✅

**Scope**: T-8.0.1 … T-8.0.5 (all of Slice 0). Three parallel cs-agents (`claude-sonnet-yolo`, non-overlapping file scopes, prompts in `temp/prompt-s702-*.md`), reviewed and shepherded by the session orchestrator.

| PR                                                       | Tasks            | Agent         | Content                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#325](https://github.com/zmeireles/daily-tour/pull/325) | T-8.0.1, T-8.0.2 | `s702-t8-0-1` | `[data-app="admin"]` token overlay in `globals.css` (light+dark paper-white ladder, STATE tokens via `@theme inline`, `--nav-active-*`, `--shadow-card`; `tokens.css` untouched); admin `h2/h3`→sans; `data-app` set in `routes/admin.tsx`; button `touch`/`icon-touch` cva sizes (existing sizes untouched) |
| [#326](https://github.com/zmeireles/daily-tour/pull/326) | T-8.0.3, T-8.0.4 | `s702-t8-0-3` | ConsentBanner render-gated off `/admin/*`; SessionBootstrap guest refresh skipped on `/admin` (mirrors the `/r/` skip). Known limitation noted in the PR: both gates are mount-time (pre-existing pattern), fine for hard-load OIDC owner flows                                                              |
| [#327](https://github.com/zmeireles/daily-tour/pull/327) | T-8.0.5          | `s702-t8-0-5` | 11 primitives hand-rolled over `radix-ui` per the `sheet.tsx` pattern: tabs · input · label · textarea · select · form (RHF+zod) · skeleton · loading-state (cards/table/tiles/thread) · error-state · alert-dialog · tooltip. 49 unit tests, zero new dependencies                                          |

**Verification**: per-PR unit suites green in worktrees (4 + 14 + 49 tests) + full 10-check CI per PR. Not yet deployed to qual (owner-only surface; qual intentionally left on the 06-30 beta build while the F&F beta runs — deploy decision deferred).

**Execution notes**:

- Agent `s702-t8-0-5` hit a Claude usage limit after writing all 22 files; the orchestrator ran the gates, fixed 3 test files that imported the non-dependency `@testing-library/user-event` (→ house `fireEvent`) and 4 eslint errors in `form.test.tsx` (house `(e) => void handleSubmit(…)(e)` pattern), then committed/pushed. Check plan quota before launching multi-agent waves.
- `cs-agent push` generates non-conventional PR titles (`S702 T8 0 1`) — the `pr-title` check fails until retitled. Retitle immediately after `cs-agent push`.
- Merge dance under the repo ruleset: arm `gh pr merge --squash --auto --delete-branch` on all PRs, then loop `update-branch` on whichever goes `BEHIND` after each merge.

## Wave 2 — Slice 1: Responsive shell + first-class states (2026-07-03 → 07-05) ✅

**Scope**: T-8.1.1 … T-8.1.4 (all of Slice 1) + a Fable-5 review-remediation pass + a polish/docs wrap. cs-agents `s703-*` (Opus keystone + Sonnet execution against tight prompts, non-overlapping file scopes), reviewed and shepherded by the orchestrator; **a `model:"fable"` adversarial reviewer gated every merge** (see below).

| PR                                                       | Tasks   | Agent                                          | Content                                                                                                                                                                                                                                |
| -------------------------------------------------------- | ------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#331](https://github.com/zmeireles/daily-tour/pull/331) | T-8.1.1 | `s703-t8-1-1` (opus)                           | Responsive `shell.tsx` — desktop rail (`hidden lg:flex`, grouped nav + `--nav-active-*` + count-badge slots) + mobile `top-app-bar` + 5-item bottom tab bar + DRY `nav.tsx`; LocaleSwitcher +es. Kills the rail-theft 1301px overflow. |
| [#332](https://github.com/zmeireles/daily-tour/pull/332) | T-8.1.3 | `s703-t8-1-3` (sonnet) + `s703-t8-1-3b` (opus) | First-class `LoadingState`/`ErrorState`/`EmptyState` across all admin lists + the 3 form routes. Sonnet under-delivered (3/7 files) → Opus continuation finished it.                                                                   |
| [#333](https://github.com/zmeireles/daily-tour/pull/333) | T-8.1.4 | `s703-t8-1-4` (sonnet)                         | Beta metrics error-not-loading (`retry:false`) + new shared `StatTile` primitive.                                                                                                                                                      |
| [#334](https://github.com/zmeireles/daily-tour/pull/334) | T-8.1.2 | `s703-t8-1-2` (opus)                           | `admin._index.tsx` = "Today" dashboard (KPI tiles → filtered lists, quick actions, view-as-guest, first-run checklist) wired as the default admin child.                                                                               |
| [#335](https://github.com/zmeireles/daily-tour/pull/335) | —       | `s703-fable-fix` (opus)                        | Fable-review remediation of the Wave-1 findings (see below).                                                                                                                                                                           |

**Fable-5 review gate** (new doctrine — [[feedback-fable-review-gate]]): the Fable reviewer caught defects that Opus review + full CI + 40+ passing tests all missed —

- 🔴 **es admin locale never registered** (`lib/i18n/index.ts`): the "Español" switcher silently rendered the whole console in English (fallback); every `es` string was dead. Fixed in #335 with a **fails-on-revert** regression test (`admin-i18n-es.test.tsx`) + the ~50-key es parity gap filled (mechanically verified empty).
- 🟠 **"Pending reservations" KPI permanently 0** — filtered a `status:"pending"` the backend never emits, and its test used an impossible row. Re-specified (owner's call) to _"confirmed booking without an active guest link"_ (`status === "confirmed" && token_state !== "active"`) with a realistic test.
- 🟠 grid-level error blanked all 6 Today tiles when any one query failed → per-tile inline retry.
- 🟠 archived-only place falsely marked "has a place" in the first-run checklist → filter `status !== "archived"`.
- 🟠 ErrorState hardcoded PT (mixed-language on en/es) → i18n'd with prop-override preserved; TopAppBar `h-14` crushed under the iOS safe-area → `min-h-14`; StatTile `<a href>` full-reload → react-router `Link`.
- Polish (post-merge, Fable-flagged): tiles-skeleton column count now matches each grid (no load→settle reflow); 3 es strings moved to the formal _usted_ register.

**Verification**: per-PR CI (10 checks) + targeted vitest per branch; the Fable reviewer re-audited the fix diffs and confirmed all findings durably resolved. **Not deployed to qual.**

**⚠ Deploy gate**: an isolated Slice-0/1 build must NOT reach qual/prod without the _full_ Slice-1 set — mid-slice, the Today tab was blank (no index route) and `es` was broken. Both are resolved on `main` now, so a qual Slice-1 deploy is safe when desired (qual is intentionally still on the 06-30 F&F-beta build).

**Execution notes**: cs-agent "closer" auto-commits + kills tmux on idle, BUT a _self-committing_ agent leaves its session idle-open → `cs-agent wait` hangs; verify completion by **diff-scope, not wait-exit**. Fresh cs-agent worktrees lack `node_modules`/built workspace deps → `pnpm install` + `pnpm --filter @daily-tour/shared-types build` before running gates, else a phantom "Cannot find `@daily-tour/shared-types`" cascade. The responsive shell renders nav in BOTH rail + bottom-bar in jsdom → `getByRole("link")` finds duplicates; use `getAllByRole`.

## Wave 3 — Slice 2: List reflow + plain language (2026-07-05) ✅

**Scope**: T-8.2.1 … T-8.2.5 (all of Slice 2). A foundation task (T-8.2.4) merged first, then the three list reflows in parallel, then the mutation-UX polish — cs-agents `s703-*`, **Fable-gated every merge**. This also resolves the **residual 390px multi-column-table overflow** left by the Slice-1 shell (proposal §4.1 "fix part 2 — tables").

| PR                                                       | Task    | Agent                          | Content                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#337](https://github.com/zmeireles/daily-tour/pull/337) | T-8.2.4 | `s703-t8-2-4` (opus)           | Single status→{label,color} source: `features/backoffice/status.tsx` (`STATUS_MAP` + `StatusBadge`, `satisfies`-exhaustive over the real enums) + `success`/`warning`/`info` `Badge` variants + `status.*` i18n. Consumed by every list. |
| [#338](https://github.com/zmeireles/daily-tour/pull/338) | T-8.2.1 | `s703-t8-2-1` (opus)           | Places table→card reflow (`hidden md:table` + `md:hidden` cards + kebab), `StatusBadge`, new `switch.tsx` Pick control, status/locale filter chips + search + count, FAB.                                                                |
| [#339](https://github.com/zmeireles/daily-tour/pull/339) | T-8.2.2 | `s703-t8-2-2` (sonnet)         | Guesthouses reflow (cover thumbnail + last-updated) + Slug demoted into an "Advanced" `Collapsible` (new `collapsible.tsx`). **`status`/`nº de quartos` descoped** (no backing field).                                                   |
| [#340](https://github.com/zmeireles/daily-tour/pull/340) | T-8.2.3 | `s703-t8-2-3` (opus, 2 passes) | Reservations → day-grouped agenda (Hoje/Amanhã/Esta semana/Mais tarde) via a tested `agenda.ts`; localized dates + "N noites" + party/property chips + reservation & token `StatusBadge` + "Acesso do hóspede".                          |
| [#341](https://github.com/zmeireles/daily-tour/pull/341) | T-8.2.5 | `s703-t8-2-5b` (opus)          | `AlertDialog` for archive (places) + revoke (reservations); **optimistic** Pick + visibility toggles (onMutate/rollback); success toasts per mutation; copy-link toast.                                                                  |

**Fable-5 review gate** caught (before each merge) defects that Opus review + CI + hundreds of passing tests missed:

- 🟠 **"Pending reservations" KPI permanently 0** (Slice-1 carry) — re-specified to "confirmed booking without an active guest link".
- 🟠 guesthouses count not pluralized → "1 alojamentos" → fixed with `count_one`/`count_other`.
- 🟠 **visibility toggle not optimistic** — only Pick was (the AC names both); fixed `useToggleHiddenPlace` with onMutate/rollback + a rollback test.
- 🟡 (approved-with-note) the two greens `confirmed`/`token active` kept in separate zones on the reservation card.
- The Fable reviewer also **proved** the es-locale + optimistic-rollback regression tests bite on revert.

**Verification**: per-PR CI (10 checks) + targeted vitest per branch (13 + 15 + 23 + 24 + a status suite); es↔pt-PT key parity mechanically verified empty on every PR; agenda date-math covered by a 16-case test. **Not deployed to qual.**

**Execution notes**: T-8.2.3 (reservations) stopped after the date helper on the first run (premature closer-fire) → finished with an Opus continuation. T-8.2.5 stalled on a transient API "response stalled mid-stream" → relaunched fresh (nothing committed lost). Same fresh-worktree `pnpm install` + `shared-types build` gotcha before gates. Reflow tests: jsdom renders BOTH `hidden md:table` + `md:hidden` surfaces → scope every query with `within(table)` / `within(cards)`.

## Follow-ups surfaced this slice

- **Guesthouse `status` + `nº de quartos`** — need a backend field (migration + catalog-svc + shared-types) before those two columns can render; descoped from T-8.2.2. Own task.
- Optional polish (Fable 🟡, deferred): restore an `<h1>` on the guesthouses page for heading-hierarchy parity; the reservations `this_week` bucket is a rolling next-7-days window vs the literal "This week" label.

## Next — Wave 4 candidates

Slices 0–2 (subscription-blocking) are **DONE**. Remaining are lower-priority: **Slice 3** (form excellence + Helper A translate, `T-8.3.x`, **beta-desirable**, deps: Slices 0,1 — includes a new `POST /v1/admin/translate` BFF endpoint using `ANTHROPIC_API_KEY` + the ES data-model addition), **Slice 4** (chat experience, **beta-desirable**), **Slice 5** (map picker + polish, **post-beta** — geocoder Photon-vs-commercial decision in T-8.5.1). A priority/sequencing check-in with the owner is the natural next step.
