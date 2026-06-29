# Daily Tour — Closed Beta Programme 2026

> **10-guest cohort. Invite-only. Real stays only.**
> Gate: Plan-002 Slice 2.A deployed + first owner-1 catalog import complete.

---

## 1. Selection Criteria

### Who qualifies

| Criterion                                                                        | Rationale                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Staying (or will stay) at **owner-1's guesthouse** on São Miguel                 | Real reservation = real token URL = real journey                                                 |
| Speaks **English or European Portuguese (pt-PT)** as primary or working language | Only en + pt-PT strings are reviewed; other locales have machine-grade quality not yet auditable |
| Travelling as a **couple or solo** (party size ≤ 2)                              | Simpler logistics for beta logistics; Daily Tour planner handles this cleanest                   |
| **Phone-first**: uses their smartphone as the primary travel tool                | Core design assumption for P1 "Marta"; avoids desktop-only outliers skewing UX signal            |
| Willing to share a **5-question post-stay survey** before checking out           | Completion rate is a success criterion; confirm willingness at invite time                       |

### Friends-and-family fallback

If owner-1 acquisition is not complete when the beta window opens, invite up to 10 people from the owner's personal network who meet the language + phone-first criteria and can roleplay a 2–3 day visit using a **manually-issued test token** (no real reservation required). Mark these as `source: f_and_f` in the beta tracking sheet.

### Disqualifiers

| Disqualifier                                          | Reason                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Primary language is German, Spanish, French, or pt-BR | de/es/fr/pt-BR strings are unreviewed machine translations; feedback would reflect translation bugs, not product bugs |
| Staying fewer than 24 hours                           | Insufficient time to trigger the Daily Tour journey                                                                   |
| Travelling in a group ≥ 4                             | Complex logistics; group dynamics may dominate feedback over product signals                                          |
| Under 18                                              | Data-processing consent complexity out of scope for v1                                                                |

### Cohort target

| Slot type                                | Count    |
| ---------------------------------------- | -------- |
| Real reservations at owner-1             | Up to 10 |
| F&F substitute (if owner-1 not yet live) | Up to 10 |
| **Total beta cohort**                    | **10**   |

---

## 2. Invite Copy

### 2.1 WhatsApp message (≤ 300 chars)

**English**

> Hi [Name]! We're testing a new digital guide for your stay at [Guesthouse]. It shows the best local spots, builds day plans, and connects you to us. 5 min after your stay to share thoughts? I'll send a special link when you arrive. 🌊

**pt-PT**

> Olá [Nome]! Estamos a testar um guia digital para a tua estadia no [Guesthouse]. Mostra os melhores locais, cria planos para o dia e liga-te a nós. 5 min depois da estadia para partilhares impressões? Envio um link especial à chegada. 🌊

---

### 2.2 Email message (1 paragraph + link)

**English**

> Subject: Your personal guide for São Miguel — a small favour

> Hi [Name], welcome (almost) to São Miguel! As part of your stay at [Guesthouse], I'd like to share something we've been quietly building: a personal digital companion that puts the best local restaurants, hikes, viewpoints, and day trips at your fingertips — curated by us, not an algorithm. When you arrive, you'll receive a private link that opens directly on your phone. There are no downloads, no accounts, and no ads. All I ask is that you use it at least once and answer five quick questions at the end of your stay. The link is ready — I'll send it to you on the morning of your check-in.

**pt-PT**

> Assunto: O teu guia pessoal para São Miguel — um pequeno favor

> Olá [Nome], bem-vindo/a (quase) a São Miguel! Como parte da tua estadia no [Guesthouse], gostaria de partilhar algo que temos construído em silêncio: um companheiro digital pessoal que coloca os melhores restaurantes locais, trilhos, miradouros e programas para o dia ao teu alcance — curado por nós, não por um algoritmo. Quando chegares, receberás um link privado que abre diretamente no telemóvel. Sem downloads, sem contas, sem publicidade. Tudo o que peço é que o uses pelo menos uma vez e respondas a cinco perguntas rápidas no final da estadia. O link estará pronto — envio-o na manhã do teu check-in.

---

### 2.3 In-person script (3–4 sentences for the host)

**English**

> "This is your Daily Tour — a private guide built just for guests here. Open this link on your phone; it works like a website, no app needed. Tap 'Plan my day' when you want ideas, or browse by what you feel like — eat, drink, explore. I'll ask for five minutes of your thoughts before you leave — no pressure, but it really helps us improve."

**pt-PT**

> "Este é o teu Daily Tour — um guia privado feito só para os nossos hóspedes. Abre este link no telemóvel; funciona como um site, sem precisar de instalar nada. Carrega em 'Planear o meu dia' quando quiseres ideias, ou navega pelo que te apetecer — comer, beber, explorar. Antes de saíres, peço-te cinco minutos para partilhares a tua opinião — sem pressão, mas ajuda-nos muito a melhorar."

---

## 3. Beta Participant Tasks

Participants are not told these are "tasks" — they experience them as natural suggestions from the host.

### Task 1 — Request a Daily Tour

> "Use the 'Plan my day' feature to plan a full day out. Pick your start time, tell it whether you have a car, and let it build the itinerary. Then look at at least one of the suggested places in detail."

**Signals captured**: Tour generation end-to-end success rate, plan render fidelity, stop detail opens.

### Task 2 — Find a vegetarian dinner option

> "Without asking us, use the guide to find somewhere for dinner that works for a vegetarian. Navigate to Eat → find the right filter, and save the one you like."

**Signals captured**: Discover drill-down UX clarity, wish/filter discoverability, favourite star usage.

### Task 3 — Contact the host through the app

> "If you have a question during your stay — anything at all — try reaching us through the guide first instead of WhatsApp."

**Signals captured**: Chat entry-point findability, channel badge clarity, message round-trip success.

---

## 4. Post-Stay Survey (5 questions, ≤ 3 min)

Delivered as a link in a WhatsApp/email message sent 1 hour before check-out.

**Live form (n8n on qual):** <https://n8n.qual.stay.portugalodyssey.pt/form/dt-beta-survey>

Responses land in the n8n **Executions** history — the owner views/exports them in the n8n editor (`https://n8n.qual.stay.portugalodyssey.pt`; owner login). Add a Google-Sheet/DB export node later if a tabular view is wanted. The form is **English-only** for now; add a pt-PT variant if the cohort needs it.

| #   | Question                                                                  | Format                                            |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| Q1  | "Overall, how useful was the Daily Tour guide during your stay?"          | 1–5 star rating                                   |
| Q2  | "Did you use 'Plan my day' to create a day itinerary?"                    | Yes / No / Tried but had a problem                |
| Q3  | "The hardest part of using the guide was…"                                | Open text (max 200 chars)                         |
| Q4  | "If a friend was staying here next month, would you tell them to use it?" | Definitely yes / Probably yes / Probably not / No |
| Q5  | "Anything else — a bug, a missing place, a confusing moment?"             | Open text (max 400 chars)                         |

**Opt-in for follow-up interview (appended to Q5 screen)**

> "We'd love to hear more in a 15-minute call (phone or video, your language). Can we reach out to arrange one?" — Yes, contact me at [phone/email field] / No thanks.

---

## 5. Success Criteria

| Metric                          | Target                              | How measured                           |
| ------------------------------- | ----------------------------------- | -------------------------------------- |
| Daily Tour journey completion   | 8 / 10 guests reach a finished plan | Server-side `tour.completed` event     |
| Post-stay survey completion     | 6 / 10 guests submit the survey     | Form submission count                  |
| P0 incidents during beta period | 0                                   | Production incident log                |
| Follow-up interview booked      | ≥ 1                                 | Calendar booking from opt-in responses |

### What a P0 incident looks like in this context

- Token URL fails to exchange → guest locked out entirely
- Daily Tour plan returns a blank screen or unhandled 5xx with no fallback
- Chat messages not delivered to owner for > 30 min during waking hours
- PII leak (guest name / contact visible to another guest session)

### Kill switch

If 3 or more guests report the same critical blocker within 48 hours, pause new invites, fix, and re-invite only. Do not push through the full cohort on a known P0.

---

## 6. Timeline

| Milestone             | Condition                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Beta window opens     | Plan-002 Slice 2.A complete + first owner-1 reservation imported                              |
| Invite first 5 guests | Smoke tests pass; owner briefed on in-person script                                           |
| Invite remaining 5    | First 5 complete survey; no kill-switch events                                                |
| Beta closes           | All 10 stays ended + surveys collected (or 4 weeks after window opens, whichever comes first) |
| Readout               | Within 1 week of beta close; synthesise survey + interviews → backlog items                   |

---

## 7. Operational Checklist (owner-1 briefing)

Before opening the beta, confirm with the owner:

- [ ] Owner can log in to backoffice and access the reservation list
- [ ] At least 15 places are published in the catalog (covers Eat/Drink/See/Do/Move with ≥2 each)
- [ ] Token URL generation works end-to-end on a test reservation
- [ ] Owner has read the in-person script and is comfortable with it
- [ ] Owner knows how to access chat inbox (FR-BO-06) and check message delivery
- [ ] Survey link is tested and form submissions land in owner-accessible sheet
- [ ] Escalation path: owner has a direct line to the dev team for P0 reports (WhatsApp, not email)
