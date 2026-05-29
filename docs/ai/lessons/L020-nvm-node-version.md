# L020 — Source nvm + `nvm use` before any pnpm command

**Source**: session 2026-05-28 (Vite startup failed `ERR_PNPM_UNSUPPORTED_ENGINE`)
**Date**: 2026-05-28

## The rule

In any shell that's going to run `pnpm` against daily-tour, the very first commands must be:

```bash
source /home/jmeireles/.nvm/nvm.sh
nvm use 22.22.3   # or just `nvm use` to read .nvmrc
```

This applies to **background commands launched via the Bash tool** as well — they don't inherit nvm state from the parent shell automatically.

## Why it matters

The shell's default `node` resolves to Node 25 (the most recent install). The repo's `.nvmrc` pins 22.22.3 and `package.json` has `"engines": { "node": ">=22 <23" }`. Running `pnpm` under Node 25 fails immediately with:

```
ERR_PNPM_UNSUPPORTED_ENGINE
Expected version: >=22 <23
Got: v25.4.0
```

That kills Vite, kills test runs, kills CI-mirroring scripts. The error is loud but not always traced — sometimes it appears as "background task failed exit code 1" with no other context.

## What happened

On session resume 2026-05-28 the first attempt to start Vite was:

```bash
pnpm --filter @daily-tour/pwa dev
```

Direct shell — no nvm setup. Failed with `ERR_PNPM_UNSUPPORTED_ENGINE`. After:

```bash
source /home/jmeireles/.nvm/nvm.sh && nvm use 22.22.3 > /dev/null && pnpm --filter @daily-tour/pwa dev
```

Vite came up clean on :5173.

Same pattern repeated for: the docs-PR commit (prettier needed Node 22), every cs-agent prompt explicitly told to source nvm first, and every ad-hoc pnpm invocation in this session.

## How to apply

- **Bash tool invocations**: always `source /home/jmeireles/.nvm/nvm.sh && nvm use 22.22.3 > /dev/null && <command>`.
- **cs-agent prompts**: include the nvm setup as step 1 of "Setup notes". The agents' tmux sessions don't inherit it either.
- **CI**: GitHub Actions reads `.nvmrc` via `setup-node@v4 with: node-version-file: .nvmrc` — that path is already correct in the workflows.

## Related

- L021 — Vite SIGTERM is a separate failure mode but often co-occurs (death + restart needs both fixes).
