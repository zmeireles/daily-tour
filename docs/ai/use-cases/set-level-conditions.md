# Use case — conditions over a SET of relations (cc-specs spec 001, volta 2)

**Origin:** question from `cs:Barra`, 2026-08-07. Recorded here because the
charter requires a case to survive the loss of the message.
**Answer:** TENHO — four, all pre-existing, none written in Riff.

Everything below was found by searching prose, markdown tables, pseudocode,
checklists and CI config — not recalled. Paths and line numbers are as of
`main` at the time of writing.

---

## 1 — The auto-merge gate: one rule, five places, four notations

`CLAUDE.md:16` opens with the shape verbatim:

> "You MAY merge a PR autonomously when **all** of:" — followed by five
> numbered conditions.

Condition 1 is itself a set condition: **"All 6 required CI checks are green."**

The same rule is then written again, four more times, in four different
notations, and **none of them is authoritative**:

| where                                        | notation                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `CLAUDE.md:16-22`                            | prose, "when **all** of" + 5 numbered items                            |
| `docs/operations/auto-merge-doctrine.md:15`  | prose enumerating the 6 checks by name                                 |
| `docs/operations/auto-merge-doctrine.md:137` | **pseudocode** — `if not all_required_checks_green:`                   |
| `docs/operations/auto-merge-doctrine.md:174` | **checklist** — `- [ ] Required status checks: pick the 6 listed in …` |
| GitHub branch protection on `main`           | **config**, outside the repo entirely                                  |

That last one is the only place the rule is _enforced_. The other four are the
places a human or agent actually reads. They can drift apart silently, and the
count "6" is hardcoded in prose in two of them.

**This is the strongest instance I have**, because it shows the failure is not
"we lack a place to put it" — we have five — but that none of them can be
queried or checked against the others.

## 2 — Phase exit gates: conjunction in prose, with a named exception

Six of them, `docs/implementation-plans/001-roadmap/TODO.md`, each a
semicolon-separated conjunction of 3–7 conditions. Example, `:1163`:

> **Phase 5 exit gate**: PWA installs and works offline; 5 + pt-BR locales done;
> WCAG 2.2 AA passes; LCP/INP/CLS budgets met; Grafana dashboards live;
> post-stay review loop sending; WhatsApp Business API operational for **at
> least one owner**.

Note the **nesting**: a seven-way AND whose last term is itself a k=1-of-N.

And `:234` carries something I did not expect — an **explicit exclusion from the
set**:

> **Phase 0 exit gate (local-only)**: … CI green. The QA-deploy step (T-0.4.4)
> is **deferred until the VPS is acquired and does not block Phase 0 exit.**

So the real condition is _"all tasks in Phase 0, except this named one"_. The
exception is a sentence in the same paragraph as the rule. Nothing connects it
to T-0.4.4's own card, and nothing stops T-0.4.4 being counted by anyone reading
the task list instead of the paragraph.

## 3 — STRIDE re-run trigger: a disjunction over six events

`docs/security/README.md:20`:

> "Re-run a full STRIDE pass when **any of the following** occur:" — six
> bullets (new public BFF endpoint · owner auth flow changes · new chat driver ·
> new internal service handling user input · after a CVE-response bump to a
> security-critical package · before each major phase deploy).

k=1 of 6, and the members are **events**, not tasks — which is the same shape as
my earlier case 2 (blocked by a deploy), now on the trigger side rather than the
blocking side.

## 4 — A running count over past events

`CLAUDE.md:21` and `:28`:

> "Fewer than **3 consecutive** auto-merges since the human's last `continue` /
> `merged` / explicit ack."
> "Always-escalate: … any PR **after 2 CI flakes**."

Both are thresholds over a _history_, not over a static set of edges. I include
them because they are the same class of thing — a policy about a collection —
and because the second one bit us in practice on 2026-08-04: PR #390 hit two CI
flakes from an unrelated pre-existing problem (#393), which converted a routine
merge into a manual escalation.

---

## Where these are written today, in one sentence

**Prose paragraphs, markdown tables, a pseudocode block, a markdown checklist,
and a GitHub branch-protection setting.** Four of the five are read by people
and enforce nothing; the one that enforces is invisible from the repository.

## The honest limit of this evidence

Only case 2 is genuinely a condition over a set of _task relations_. Case 1 is
over checks, case 3 over events, case 4 over history. If the spec's requirement
is scoped strictly to task→task edges, only the exit gates qualify — and I would
rather say that than let four instances be counted where one belongs.
