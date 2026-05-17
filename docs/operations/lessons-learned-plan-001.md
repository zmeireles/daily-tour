# Lessons Learned — Plan-001 (2026-05-17)

> Synthesised from EXECUTION.md wave notes, 28 detailed waves, 83/84 tasks shipped, ~100 PRs.
> High-value only — patterns that were surprising, non-obvious, or changed orchestration strategy mid-session.

---

## L01 — Sonnet handles new-microservice scaffolding cleanly given a mirror + tight scope

**What happened**: T-1.4.0 (new `media-svc`) shipped in ~18 min (predicted 75–120 min). The prompt gave Sonnet an explicit "mirror catalog-svc/token-svc" anchor + a tight scope contract (5 acceptance criteria, explicit `owns:` list). T-1.1.0 similarly completed in ~14 min given "copy from token-svc + adjust schema name."

**Pattern**: Sonnet performs 3–5× faster than estimated on new-service work *when a reference implementation is reachable and in-context*. Without a mirror, complexity is higher and orchestrator rescue more likely.

**Apply**: always include a `mirror: <service-path>` annotation in service-creation prompts. Even a partial mirror (schema only, or Dockerfile only) halves agent work and crash risk.

---

## L02 — `@fastify/jwt` v10 has no native JWKS; use `jose` directly

**What happened**: T-1.6.0 (Authentik OIDC integration) needed JWKS verification. `@fastify/jwt` v10 offers no `jwks` option — it only wraps `@hapi/jwt`. The agent went straight to `jose` (`jwtVerify` + `createRemoteJWKSet`) and avoided a broken `@fastify/jwt` namespace approach.

**Pattern**: any route needing *asymmetric* JWKS verification (Authentik, Auth0, Cognito) should use `jose` directly, not `@fastify/jwt`. The test seam is `createLocalJWKSet(JWKS)` — tests don't need a live OIDC provider.

**Apply**: never prompt for `@fastify/jwt` with `jwks` config. Document this in the BFF service README as a done-decision (D-BFF-JWT).

---

## L03 — Lockfile drift after dep additions; always run `pnpm install` post-merge

**What happened**: Several PRs added new packages (shadcn, @radix-ui, @aws-sdk) and the lockfile conflicted with a parallel PR that also changed `package.json`. `gh pr update-branch` auto-resolved most cases (lockfile conflict = additive rebase), but two cases needed manual `pnpm install` after rebase to regenerate a consistent lockfile.

**Pattern**: `pnpm-lock.yaml` is the most-conflicted file across parallel branches. It always resolves additively (both PRs' deps survive), but the resulting lockfile must be regenerated, not just merged.

**Apply**: add to the orchestrator post-merge checklist: after any PR that installs new deps, run `pnpm install` on the base branch before launching the next parallel pair. The `cs-agent push` step could auto-detect lockfile-only conflicts and run `pnpm install` before pushing.

---

## L04 — ESLint flat-config `no-unsafe-*` rules need test-file overrides

**What happened**: T-2.C.3 (resolved prior to this plan) surfaced `@typescript-eslint/no-unsafe-assignment`, `no-unsafe-member-access`, and `unbound-method` false positives in test files. The issue: `vi.fn()` and Vitest mock types aren't fully inferred by typescript-eslint's type-aware rules. Fix was an `overrides` block in `eslint.config.ts` scoped to `**/__tests__/**` and `**/*.test.ts`.

**Pattern**: typescript-eslint's `no-unsafe-*` rules are correct for production code but generate noise in test files that use mock factories with `any`-typed return shapes. Disable them per-file-pattern, not project-wide.

**Apply**: new project templates should ship with this override pre-wired. The cc-platform-feedback queue has this entry (#5 — cross-project ESLint test override doctrine).

---

## L05 — Parallel pairs with disjoint `owns:` scopes ship 2× throughput

**What happened**: starting from Wave 11 (T-1.0.2 + T-1.1.0 in parallel), disjoint-scope pairs consistently shipped without conflicts. The only overhead was `gh pr update-branch` (one command) when the first PR merged before the second's CI finished. Waves 17+18, 19+20, 21+22, 24+25 all used this pattern.

**Pattern**: two agents running on disjoint file sets (e.g., BFF vs new service, PWA route A vs PWA route B) complete in the same wall-clock time as one — effectively halving delivery time for separable work.

**Apply**: always decompose slices into parallel-safe pairs when `owns:` scopes don't overlap. The TODO.md `parallel-with:` field is load-bearing. Worth investing 5 min of decomposition to save 20–40 min of wall-clock.

**Caveat**: `pnpm-lock.yaml` and `lib/i18n.ts` (before the namespace refactor in T-1.7.0) were the two files that needed post-merge attention. The i18n conflict is now gone (namespaced files); the lockfile conflict is mechanical and `update-branch` handles it.

---

## L06 — `gh pr update-branch` resolves most BEHIND conflicts; additive merges (i18n) need manual resolve

**What happened**: the `i18n.ts` merge conflict between T-1.2.1 and T-1.3.2 was the only case where `gh pr update-branch` couldn't auto-resolve. Both PRs added new keys to the same `resources` object; the merge produced `<<<<<<<` markers. Resolution was always additive (keep both `home.*` and `place_detail.*`).

**Pattern**: structural JSON merge conflicts (both branches add to the same object, neither deletes) are always additive. A scripted "keep both sides" resolve handles them without human read-through.

**Apply**: the post-T-1.7.0 refactor (12 separate namespace JSON files) eliminates this conflict class entirely. For any pre-refactor project, add an orchestrator utility that recognises the `<<<<<<< HEAD ... ======= ... >>>>>>>` pattern in a JSON resource file and applies additive merge automatically.

---

## L07 — cs-agent closer-fallback masks self-commits; file recovery via worktree path

**What happened**: detailed in `docs/operations/cs-agent-closer-fallback.md` (T-2.C.2). The autocommit-fallback fires when the watchdog kills the tmux session before the agent reaches its own commit step. Two autocommit commits ~40s apart is the tell that the agent was actively working but got truncated.

**Crash rate this session**: Opus 3/8 (38%) vs Sonnet 4/17 (24%). Neither profile is reliable at high complexity; Opus's advantage is insight quality, not stability.

**Recovery path**:
1. `cs-agent diff <name>` — shows what files changed in the worktree.
2. Worktree at `~/.claude-squad/worktrees/jmeireles/<name>/` — still intact until `cs-agent kill`.
3. Manual completion from the autocommit state; push as a follow-up commit.
4. Never `cs-agent kill` before `cs-agent push` (L008 canonical).

**Apply**: treat autocommit-fallback as expected behaviour, not a failure. Budget +15–25 min of orchestrator time for high-complexity tasks that crash at the final step.

---

## L08 — ASCII fast paths (haversine) as fallback for external services

**What happened**: T-1.2.0 (discover aggregator) used inline haversine for geo-filtering when location is known. T-3.3.0 (OSRM) introduced real drive times for the planner validator, but the v1 fast path (haversine straight-line) remained as a fallback for when OSRM is down or not configured.

**Pattern**: any feature that depends on an external geo service (OSRM for drive times, IPMA for weather, pgvector for similarity) should have a deterministic ASCII fallback that degrades gracefully. The haversine fallback for discovery is ~10 LOC and removes an infra dependency from the critical path.

**Apply**: budget 15–20 LOC for a haversine fallback in any new service that needs geo-filtering. Document the fallback activation condition (env var or 5xx upstream) in the service README.

---

## L09 — Stub auth postures as a feature, not a compromise

**What happened**: T-1.4.0 (`media-svc`) launched with X-Internal-Token + X-Owner-Id header-based auth instead of Authentik JWKS. The prompt explicitly framed this as "stub auth posture as a feature — internal-only services on `dt_internal` with header-based identity." The swap to real Authentik `aud:staff` verification was documented as T-1.6.x and didn't block T-1.4.0 delivery.

**Pattern**: shipping a well-documented stub posture that names its swap task (T-1.6.x) is correct architecture, not tech debt. It keeps new services unblocked from the Authentik configuration lifecycle and makes the auth boundary explicit in code (header names + service README).

**Apply**: use this pattern for any internal service where the Authentik/IdP config is not yet stable. The auth posture swap becomes a single-file PR (replace header check with JWKS verify) with no downstream changes needed.

---

## L10 — LLM provenance validation: assert RAG-sourced IDs in planner output

**What happened**: T-3.0.2 (planner validators) included a check that rejects any `place_id` in the LLM output that was not in the retrieval set for that slot. This prevents hallucinated place IDs from passing through the planner and surfacing invalid deep-links on the PWA timeline.

**Pattern**: any LLM output that includes entity IDs retrieved from a data store must have a provenance check — assert the output IDs are a subset of the input retrieval set. This is a 5-line validator that eliminates an entire class of hallucination.

**Apply**: add provenance validation as a standard step in any RAG pipeline that produces entity references. The validator belongs in the service layer, not the prompt, so it can be tested independently of the LLM.

---

## Meta observations

**Sonnet vs Opus**: Sonnet is the right default for Phase 1+ mechanical tasks (PWA, BFF routes, schema mirrors). Opus earns its rate-limit cost only for non-mechanical insight work (custom migrators, IPv4 pin discovery, blueprint authoring, first-principles protocol debugging).

**Session hygiene**: the entire 83-task burst ran in a single day. Context hygiene (per-task worktrees, explicit `owns:` scopes, self-contained prompts) made this sustainable. Without isolation, context bleed between agents would have caused scope violations.

**Prompt quality is the multiplier**: well-scoped prompts with a reference implementation, explicit `owns:` list, and acceptance criteria produced clean self-commits 76% of the time (Sonnet) or 62% of the time (Opus). Vague prompts drove the crash rate up.
