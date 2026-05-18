# Plan-004 — Scale & Monetize

> Sequential after Plan-003 (beta complete). Plan-004 takes Daily Tour from 1 owner / 10 guests to 5-10 owners / 100-500 guests with sustainable unit economics.

## Premise

Plan-003 validates product-market fit with one guesthouse. Plan-004 answers: *can this scale to a portfolio of owners without proportional ops cost, and at what unit economics?*

## Scope

### Slice 4.A — Owner onboarding self-service

Today onboarding requires the founder to manually import Authentik users + seed places via SQL. **This slice makes it a self-service flow**.

- T-4.A.0 — Owner signup form (`/signup-owner`) collecting business info + verification doc
- T-4.A.1 — Authentik user provisioning API (admin-initiated for v1; self-service in v2)
- T-4.A.2 — Onboarding wizard inside `/admin` (first-place creation, photo upload, first invite to a guest)
- T-4.A.3 — Owner welcome email + 7-day nurture sequence (via notif-svc + n8n)

### Slice 4.B — Multi-tenant data isolation

Currently `guesthouse_scope = {"all": true}` on every place. Multi-owner requires real scoping.

- T-4.B.0 — Schema: `place.guesthouse_id` non-null FK (migrate seed data)
- T-4.B.1 — Catalog-svc owner-scoped CRUD (catalog enforces owner_id in WHERE clauses)
- T-4.B.2 — BFF admin routes pass-through owner_id from JWT; no cross-owner leakage
- T-4.B.3 — Discover endpoint shows global catalog filtered to the guest's guesthouse's catchment (configurable km radius)

### Slice 4.C — Billing & subscriptions

Owners pay monthly per active guest or per active guesthouse.

- T-4.C.0 — Stripe Checkout integration (BFF + Stripe Connect for marketplace)
- T-4.C.1 — Subscription tiers: free (1 guesthouse, 10 guests/mo), pro (3 gh, 100 gp/mo), team (unlimited)
- T-4.C.2 — Usage metering via analytics.tour_event aggregations + Stripe metered billing
- T-4.C.3 — Owner billing dashboard inside /admin
- T-4.C.4 — Failed-payment grace + downgrade workflow

### Slice 4.D — Marketing surface

Today the public landing serves the guest entry point. Add a marketing surface for prospective owners.

- T-4.D.0 — Marketing route /for-hosts with pricing + features
- T-4.D.1 — Public testimonial section with social proof from beta cohort
- T-4.D.2 — Blog/changelog at /journal (static MDX content)
- T-4.D.3 — SEO + OpenGraph + sitemap.xml

### Slice 4.E — Mobile app shell

The PWA is great but the App Store presence matters for trust. Wrap the PWA with Capacitor.

- T-4.E.0 — Capacitor wrap of the PWA (iOS + Android targets)
- T-4.E.1 — App Store + Play Store metadata + screenshots
- T-4.E.2 — Native push notifications via Capacitor Push (replacing the web push)
- T-4.E.3 — Native deep-link handling (custom URL scheme + universal links)

## Exit criteria

- 5+ owners onboarded self-service
- 100+ guests across all owners in a 30-day window
- MRR ≥ €500
- Native iOS + Android apps in stores
- Multi-tenant data isolation pen-tested (no cross-owner leakage)

## Dependencies

- Plan-003 complete (beta validated)
- Stripe Connect approval
- Apple Developer account + Google Play account
- Real owner referrals (founder relationship work)

## Estimated wall-clock

Plan-004 is operationally heavy (Stripe integration, multi-tenant migrations, native shell). Estimated 60-80h of orchestrator engagement plus a similar amount of external/ops work (Stripe verification, store submissions, owner referrals).

## Open questions for Plan-004 kickoff

1. **Stripe Connect or basic** — Connect adds platform-fee complexity but enables payouts to owners; basic is simpler if Daily Tour is the merchant of record for all transactions.
2. **Pricing anchor** — €15/mo/guesthouse? Per-guest €0.50/active? Hybrid? Needs market research with the beta cohort.
3. **iOS vs Android first** — most São Miguel guests are iOS (EU travelers); Android matters for Brazilian Portuguese expansion later.
4. **Multi-language store listings** — at launch (EN, pt-PT) or wait until pt-BR users surface?
5. **Brand presence on the marketing site** — same DT placeholder OR commission a real designer? Cost €1500-5000.
