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
