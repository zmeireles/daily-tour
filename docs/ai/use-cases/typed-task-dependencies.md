# Use case — typed task dependencies (cc-specs spec 001)

**Origin:** elicitation from `cs:Barra`, 2026-08-05. Recorded here because the
charter requires a use case to survive the loss of the message.
**Answer:** TENHO CASO.

All four cases below are things that happened in this project, most of them in
the session of 2026-07-27 → 08-05. None is hypothetical.

---

## Case 1 — verification is not sequence, and conflating them cost us a wrong label

Daily Tour has a documented forward-flow protocol
(`docs/human/how-to/testing-protocol.md`): **a plan or PR cannot flip to DONE
until a paired UAT task exists and at least one has passed.**

The UAT task does not block the PR from being _written_, _reviewed_, or
_merged_. It blocks it from being **closed**. That is a different relationship
from "A must finish before B starts", and Riff cannot express it, so the
protocol lives in prose and in the engineer's memory.

What we did instead: nothing structural. The pairing exists only as a
convention. On 2026-07-27 four UAT cards (#25–#28) sat verified-but-open for
days because nothing connected them to the work they verified — the connection
was in a handoff document, and handoff documents are read by whoever remembers
to read them.

**What I needed to distinguish:** "blocks completion of" vs "blocks start of".

---

## Case 2 — blocked on an event, not on a task

UAT #30 and #31 were created before the code they verify was deployed. There was
no task to depend on — the blocker was **a deploy**, an event with no card.

What Riff gave us: a label, `blocked-on-deploy`, plus a prose warning at the top
of each card ("⚠️ Blocked until `main` is deployed to qual. Do not start before
that."). Both went stale the moment the deploy happened. I removed the labels by
hand on 2026-07-27 and had to edit the descriptions too, because the prose
warning outlived the condition it described.

**What I needed to distinguish:** a dependency on _state of the world_ from a
dependency on _another task_. A label cannot clear itself; a typed edge with a
condition could at least be queried.

---

## Case 3 — blocked on a decision, which is not blocked on work

Issue #383 (`pt-BR`/`de` guests get an all-English UI) splits cleanly in two:

- the PWA half — two lines of i18next config, no decision needed;
- the token-svc half — narrowing a CHECK constraint, which is a **schema
  change**, always-escalate in this project, and needs the owner's call.

The second half is not waiting on engineering. It is waiting on a human to
decide. Same for #379 (making a check fail CI is a gate change) and #371
(a dependency-audit policy question).

What we did: three `AskUserQuestion` prompts in a chat session. Durable record:
none, until I wrote it into a handoff by hand.

**What I needed to distinguish:** "blocked on work" from "blocked on a
decision". They have different owners, different unblock actions, and different
escalation paths — but on a board they look identical.

---

## Case 4 — "would have caught" is a real relation, and it is not blocking

The `t()`-callsite scan (#379) relates to #370, #375, #378 and #389: it is the
systemic guard that would have caught each of them. None blocks the others —
they were all fixed by hand first, and the guard came after.

Today that relationship is expressed by pasting issue numbers into prose. It is
the single most useful relation in the set for answering "why does this check
exist?", and it is invisible to any query.

**What I needed to distinguish:** "prevents recurrence of" from "blocks".

---

## The shape of the problem, stated once

Every case above is a _different_ answer to "what does this edge mean", and all
four currently degrade to the same thing: an undifferentiated link, a label, or
a sentence in a description. The two lossy failure modes we actually hit were:

1. **Labels do not clear themselves.** `blocked-on-deploy` outlived its
   condition and had to be reaped manually across two cards.
2. **Prose does not answer queries.** "What is blocking this?" and "what does
   this unblock?" traverse the same edge in both directions and return a list
   in which a hard blocker and a see-also are indistinguishable.

## Risk I would flag

Typing the edge only helps if the _unblock condition_ is typed with it. A
`blocks` edge that still needs a human to notice the blocker cleared is the same
label problem with better vocabulary. Case 2 is the test: if the new type cannot
express "blocked until a deploy carrying commit X reaches qual", it will be
worked around with a label again.
