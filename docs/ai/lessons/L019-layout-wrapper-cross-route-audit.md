# L019 — Layout-wrapper changes need a cross-route audit

**Source**: dt-tests UAT #19 step C → PR #156
**Date**: 2026-05-29

## The rule

When a PR adds, changes, or removes a layout wrapper (max-width container, padding, scroll behavior, z-index, sticky positioning, dark-mode token), audit **every route** that shares the visual surface — not just the obviously-related ones. Don't trust the PR title to define the scope.

## Why it matters

A visual surface (e.g. "the home screen") often dispatches across multiple route components based on auth/session state. PR #150 added `mx-auto max-w-5xl` to `PublicIndex` and the action pages but missed `AuthedIndexRoute` — which is exactly what a token-holding guest sees when they open `/`. UAT #19 step C caught it. The miss happened because `PublicIndex` and `AuthedIndexRoute` were perceived as separate features rather than as two implementations of the same `/` surface. They're not.

## What happened

PR #150 ("clarify public landing + constrain desktop width") wrapped:

- `routes/index.tsx` → `PublicIndex` ✓
- `routes/_authed.a.$action.tsx` (action pages) ✓
- `routes/_authed.index.tsx` → `AuthedIndexRoute` ✗ ← missed

UAT #19 fingerprinted on `db0fd65` (post-#150), tester opened the token URL, dispatcher routed to `AuthedIndexRoute`, which had no wrapper → full-bleed on wide desktop → FAIL on step C only (A/B/D PASS).

PR #156 added the same wrapper to `AuthedIndexRoute` and a regression test in `authed-home.test.tsx` asserting `div.max-w-5xl.mx-auto` exists. Retry UAT (DT-TESTS-20) PASS.

## How to apply

Before merging a layout/wrapper change, run a "route audit":

```bash
# 1. Identify what URL paths the change affects (often "/" or some shared path)
# 2. List every router config that maps that path
rg "path:.*['\"]/" apps/pwa/src/App.tsx -A 1
# 3. For each component the router can mount, verify the wrapper is present
```

Concretely for daily-tour: dispatching at `/` is split between `PublicIndex` (no JWT) and `AuthedIndexRoute` (JWT present) inside `routes/index.tsx`'s `IndexRoute`. Both must be checked.

A regression test asserting the wrapper exists on each dispatched component (see `authed-home.test.tsx`) locks the audit in code. Prefer that over relying on memory.

## Related

- L023 (future) — should formalize "dispatcher-pattern route audit checklist" once we hit this again.
