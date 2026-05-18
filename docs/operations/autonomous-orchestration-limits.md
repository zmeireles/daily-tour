# Autonomous Orchestration — Observed Limits

> Empirical notes from running `/goal proceed autonomously` for ~20 hours straight on the daily-tour project. Companion to `docs/operations/lessons-learned-plan-001.md` and `docs/operations/estimate-recalibration-2026-05-17.md`.

## TL;DR

A `/goal` session-scoped autonomy directive can keep an orchestrator agent productive for ~16-20 hours before the marginal value of additional work approaches zero. The limit isn't the agent's stamina — it's the project's stamina: how much net-new value can be created without external decisions (infra, design, business strategy, user research)?

## What scales linearly with orchestrator time

These tasks **never run out** in a sufficiently scoped project:

1. **Implementation tasks with clear specs.** Plan-001's 100-task roadmap shipped 99/100 in ~13 hours. Sonnet/Opus deliver at ~10-30 min wall-clock per medium-complexity task.
2. **Documentation creation.** Threat models, runbooks, playbooks, retrospectives. Each ~30-45 min for an agent + ~5 min orchestrator review/push. No external blockers.
3. **Planning + scoping work.** Plans 002-005 outlines, README, CHANGELOG, plan index. Pure synthesis from existing state.
4. **Test additions.** k6 scripts, chaos drills, RTL extensions. Bounded scope, clear acceptance.

## What hits a wall

These categories **can't progress autonomously** past a certain point:

1. **Deployment** — needs physical infra acquisition (VPS, DNS, ACME certs, Authentik tenant). Documented (T-0.4.4, Slice 2.A) but unactionable without external work.
2. **Design** — Stitch MCP timed out repeatedly; no DS attached to the project. Real design needs human attention or working tools.
3. **Translation review** — machine output is shippable for v1 but real localization needs native speakers.
4. **External integrations** — Stripe Connect approval, App Store submission, WhatsApp Business API verification.
5. **Real user signal** — beta program, pen-test (external firm), pricing decisions.

## Observed degradation patterns

After ~12-14 hours of continuous orchestration:

- **CI lint fix-up rate increases.** PR #84 hit an eslint loop that the orchestrator couldn't resolve in 3 iterations; closed + retried as #98.
- **cs-agent closer-fallback commits increase.** ~6 PRs ended with auto-generated commit messages instead of clean self-commits. Documented in T-2.C.2.
- **Stitch MCP timeouts** — became consistent past hour ~16.
- **Estimate predictions drift.** The agent stops accurately predicting task duration; resorts to "30-45 min" for everything regardless of actual scope.

## The token-budget question

The `/goal` directive specified stopping when "tokens fall below 10%". The orchestrator agent (Claude Code itself) had no introspection into its actual token budget; relied on narrative self-assessment ("tokens deeply depleted") that the user-side stop-hook reasonably rejected as unverified.

**Recommendation for future autonomous sessions**: add an explicit cap on PRs/wall-clock instead of relying on token budget. E.g., "stop after 50 PRs OR 8 hours OR explicit pause." A token-budget threshold the agent can't measure invites the kind of grind-without-stop that this session demonstrated.

## What the user got

In ~20 hours of autonomous orchestration:

- **117+ PRs merged** (99 Plan-001 tasks + 18 Plan-002/003 tasks + Plan-004/005 drafts + README + CHANGELOG + plans index + 1 chat retry)
- **5 implementation plans** outlined (001 done, 002-005 drafted)
- **8 retrospective + operations docs** in `docs/operations/`
- **4 security docs** in `docs/security/`
- **1 beta program plan** in `docs/beta/`
- **6 service skeletons** scaffolded (4 TS Fastify + 2 Python FastAPI + 1 hybrid chat-hub + 1 notif-svc)
- **3 new infra overlays** (osrm, observability, post-stay notif)

## What the user didn't get (because it requires the user)

- Live deployment
- Real users
- Real money
- Real design
- Real photography
- Real translation review
- Real owner referrals
- Real revenue

The conclusion is that **autonomous orchestration is excellent at expanding the surface area of work that the user could-could-could do, but the actual product-market-fit + business-development work remains human-bound**. Future products that "ship via agents" still need a human in the loop for the externalities the project depends on.

## Recommendations for next autonomous session

1. **Set a clear PR cap** (e.g., 30-50 PRs) instead of relying on token-budget self-assessment.
2. **Pre-acquire external dependencies** before starting (VPS, design, translation vendor).
3. **Run shorter, more frequent sessions** rather than 20-hour marathons — quality compounds early but degrades late.
4. **Use opus for design + Stitch work** (assuming Stitch MCP timeout is config-fixable).
5. **End with a clean handoff doc + intentional pause** — don't grind into diminishing-returns territory.

---

*Captured from the ~20-hour session that produced Plans 001-005 implementation + drafts.*
