# `e2e/` — UAT specs and diagnostic probes

Standalone Node scripts that drive **system Chrome** through `playwright-core`
against a running deployment (usually qual). They are not part of any test
runner: you invoke them directly with `node`, and they print a pass/fail list.

For the Playwright-runner specs, see `apps/pwa/e2e/*.spec.ts` — different thing,
different tool.

## Why this directory is tracked

It was not, for a long time. Four consecutive session handoffs described "the
perennial untracked `e2e/`" and listed the specs it held as assets for the next
session. On 2026-08-15 that directory was found to be **gone** — six specs with
it, including an 89-scenario router regression, a reservation-revoke suite and a
map-tile diagnostic. They had never been `git add`ed, so git had no copy and
nothing was recoverable.

`temp/` is in `.gitignore`. Anything that lives only there is one crash, one
`git clean`, or one stash-drop from being lost. **Specs are versioned here.
Evidence stays disposable in `temp/`.**

A pre-commit guard (`scripts/dev/check-uat-specs.sh`) fails the commit if a
`.mjs` spec reappears under `temp/`, because a convention alone already failed
four times.

## The split: spec vs evidence

|                                | lives in      | tracked | why                                   |
| ------------------------------ | ------------- | ------- | ------------------------------------- |
| the spec (`*.e2e.mjs`, probes) | `e2e/`        | ✅ yes  | small, reusable, expensive to rewrite |
| screenshots, `evidence.json`   | `temp/<run>/` | ❌ no   | large, run-specific, reproducible     |

Specs write their output to `temp/…` by design. That path is created on demand,
so a spec still runs correctly on a fresh clone.

## Secrets — never inline them

Two guest redemption tokens **were** hardcoded across 13 of these files. They
never reached git only because `temp/` happened to be ignored. Versioning the
specs would have turned that accident into a real leak, so they are now read
from the environment:

```bash
RTOKEN="$(make qual-token | grep -oE '[^/]+$')"  node e2e/uat-2d-home/uat-2d-home.e2e.mjs
AK_PW=…                                          node e2e/uat-6a3.mjs
```

| variable                     | what                      | where to get it                             |
| ---------------------------- | ------------------------- | ------------------------------------------- |
| `RTOKEN`                     | guest redemption token    | `make qual-token`                           |
| `AK_PW` / `AKADMIN_PASSWORD` | owner console (Authentik) | `temp/qual-uat-secrets.env` (gitignored)    |
| `BASE_URL`                   | target deployment         | defaults to qual                            |
| `CHROME_BIN`                 | Chrome binary             | defaults to `/usr/bin/google-chrome-stable` |

A spec that needs a credential reads it from `process.env` and exits non-zero
when it is missing. Do not reintroduce a literal, not even "just for qual".

## Running one

```bash
nvm use 22
node e2e/locale-verify/uat-locale-two-profiles.e2e.mjs
```

Most of these are **archives** — written for one investigation, kept because
rewriting them costs hours and storing them costs kilobytes. They are not
maintained, may target surfaces that have since changed, and are not run by CI.
Read the header comment before trusting one.

## The one to copy from

`locale-verify/uat-locale-two-profiles.e2e.mjs` is the current reference. It is
the only one written after the lesson that produced it, and it demonstrates the
three habits worth keeping:

1. **A vacuity control.** It asserts the four locale taglines are distinct
   before asserting anything about them. If they ever collide, every downstream
   assertion would pass while proving nothing — so it fails loudly instead.
2. **Two profile states per case.** The locale bug shipped "fixed and green"
   three times. The third time, negotiation was genuinely correct and returning
   guests were still broken, because the detector reads its own localStorage
   cache before the browser's languages. A spec that only ever uses a fresh
   context cannot see that class of defect at all.
3. **It exits non-zero.** Several older specs here are report-only (`exit 0`) by
   design, for exploratory UAT. A spec used as a **gate** must be able to fail,
   and must be _seen_ failing against the bug it guards before anyone trusts a
   green from it. That one was run against the broken build first: 8/25.
