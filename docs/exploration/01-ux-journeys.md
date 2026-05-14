# UX Journeys, IA & Interaction Patterns

Scope: user journeys, information architecture, interaction patterns, accessibility, edge cases. No tech-stack, no visual design.

## 1. Personas

### P1 — Premium Guest "Marta" (primary)
Late-30s, EU traveler, 4 nights at the guesthouse. Opens the URL on the WhatsApp confirmation from the owner. Phone-first, mid-trip mood: short attention, decision fatigue, wants curated answers ("where do I eat tonight?") not a search engine. Roaming data, intermittent connectivity inland. Expects the app to know she's a guest (no login, no signup).

### P2 — Landing Visitor "Tom" (secondary)
Stumbles on the bare domain via Google, considering a stay. Goal: assess credibility and vibe in <30s. No token. Should leave with: who the owner is, what the guesthouses look like, sample places, a clear contact CTA. Should NOT see the chat, the daily-tour agent, or per-guest data.

### P3 — Owner "João" (tertiary, backoffice-led)
Manages 3 guesthouses. Lives in the backoffice; the PWA-side concerns are limited to: being reachable (chat/call toggle), appearing on the premium landing (bio/photo), and reading the chat thread. Owner UX in the guest PWA = "responsive recipient," nothing more.

## 2. Core User Journeys

### J1 — First open via token URL
1. Tap link in WhatsApp → PWA loads → token parsed silently → guest+guesthouse resolved.
2. Permission prompt: location (skippable, default = guesthouse pin). Auto-detect locale from token.preferred_locale (fallback browser).
3. Land on **Home**: greeting by name, owner avatar with "Message João" CTA, theme auto-selected by local clock, "Add to Home Screen" nudge on 2nd visit.
4. Below the fold: action tiles (see IA §3) + "Plan my day" entry-point + "Contact owner."

Verify: Marta reaches a place list in ≤3 taps from email link.

### J2 — "Dinner near the sea" (interest drill-down)
1. Home → tap **Eat** tile.
2. Action page: list of places grouped by **wish** (Romantic, Family, Local cuisine, Sea view, Vegetarian…). Default sort: distance from active location. Range chip visible (default 5 km).
3. Marta opens **Sea view** group; scans 6–8 places.
4. Tap place → **Detail**: hero media, gallery, distance + map pin, hours, reputation, description (locale-aware), 4 actions: *Navigate* | *Call* | *Draft DM* | *Reserve via Agent*.
5. Picks **Reserve via Agent** → modal: party size, time, notes (voice or text), name pre-filled → agent confirms intent → user approves → agent executes → status pill ("Booked," "Pending," "Failed — call instead").

Verify: from Home to reservation submitted in <90s, <6 taps.

### J3 — Daily Tour
1. Home → **Plan my day** → form prefilled (date = today if pre-checkout, else next valid day; start 09:30; end 18:30; party size from token).
2. Voice-or-text area: "We're tired, light walking, want a viewpoint and a long lunch."
3. Submit → loading state with skeleton itinerary + cancel.
4. Result: vertical timeline (stops with time, place card, transit hint, meal flag). Per-stop actions: *Swap*, *Remove*, *Lock*. Global: *Regenerate*, *Save*, *Share*, *Send to chat with owner*.
5. Edits trigger partial re-plan (don't re-plan locked stops).

Verify: a failed plan never leaves a blank screen — fallback to a 3-stop default near guesthouse + "Try again."

### J4 — Contact owner mid-stay
Persistent owner chip in header. Tap → **Chat** screen. Channel is abstracted: input bar says "Message João" — the user doesn't pick WhatsApp vs Telegram, backend routes. Show channel badge subtly ("via WhatsApp") for trust. Voice-call button shown only if owner enabled it. Read receipts and typing optional; **delivery state is mandatory** (Sent / Delivered / Read or "Owner usually replies in ~30 min").

### J5 — Tokenless landing
Bare domain → **Public landing**: hero (island/guesthouse imagery), 3-line owner pitch, sample places (read-only, no distance-from-you unless IP geolocation succeeds), trust signals (reviews, location map). Blocked: Daily Tour, Chat, Reserve-via-Agent, per-guest greeting. CTAs: "Check availability" (mailto / external booking) + locale switcher.

## 3. Information Architecture

Hierarchy: **Interest = Action + Wish → Place**.

**Recommendation: 6 top-level Actions** — tested ceiling for at-a-glance tile grids (3×2 on phones), aligns with Hick's law:

1. **Eat** — restaurants, bakeries, markets
2. **Drink** — bars, wineries, cafés-as-destination
3. **See** — viewpoints, lagoons, churches, museums
4. **Do** — hikes, hot springs, whale-watching, surf
5. **Buy** — local crafts, cheese, pineapple, souvenirs
6. **Move** — car rental, taxis, transfers, fuel

Rationale: covers 95% of guest needs on São Miguel; **Sleep** excluded (they're already lodged); **Move** kept because car-dependence on the island is real. "Daily Tour" and "Contact Owner" are **not** actions — they're top-level shortcuts, separately surfaced.

**Wishes** are action-scoped, max 6 per action, e.g., Eat → {Sea view, Romantic, Family, Local cuisine, Vegetarian, Quick}. Wishes are tags, not folders — a place can carry multiple, surfacing in multiple groups.

## 4. Interaction Patterns

- **Location toggle**: segmented control in list headers — `[Near me] [Near guesthouse]`. Disabled state when no permission, with inline "Enable location" link. Switching refetches; show transient toast.
- **Range slider**: discrete steps (1/3/5/10/25 km) not free-scrub — fewer accidental refetches, easier on thumb. Persist per session.
- **List affordances**: sort menu (Distance, Rating, Name); group toggle (Group by wish / Flat); favorite star (per token, server-persisted). Group headers collapse.
- **Theme**: auto by local sunrise/sunset (not just clock) with manual override in settings; respect `prefers-color-scheme` on first load.
- **Locale switcher**: in header overflow menu, not in main nav. Flag + native name ("Português"). Persist per token.
- **Voice input**: same widget across Daily Tour and Agent reservation. Visible transcript while recording, editable before submit.
- **Agent actions**: always show a **dry-run preview** ("I'll book Restaurante X for 4 at 20:00") with explicit confirm — never silent side effects.

## 5. Edge Cases & Failure Modes

- **No location permission**: silently use guesthouse pin, hide "Near me" toggle, surface a dismissible banner on first list view only.
- **Offline / poor signal**: cache last-visited place details + home shell. Show stale-data badge with timestamp. Queue chat messages with retry. Daily Tour requires connectivity — show explicit offline screen, not a spinner.
- **Token expired (post-checkout)**: graceful downgrade to public landing + a one-liner ("Your stay ended on DD/MM — come back soon"). Preserve favorites for 30 days if they return.
- **Token invalid / tampered**: same as tokenless, no error shaming.
- **Locale not translated**: per-field fallback (place description in pt-PT or en), never mixed UI chrome. Mark fallback strings subtly ("shown in English").
- **Agent fails to plan**: return partial plan + explicit reason ("Couldn't fit a viewpoint in 2h"), offer manual seed (pick 1 place, retry).
- **Place data stale** (closed, moved): "Report issue" link on detail page → owner's backoffice.
- **Multiple guests on one token**: assume shared device; no per-person personalization beyond what token carries.

## 6. Accessibility

- Target **WCAG 2.2 AA** across PWA and public landing. AAA for body text contrast where the green palette permits.
- Voice input: always paired with text fallback. Never the only path.
- Touch targets ≥44×44 CSS px; bottom-third primary actions (one-handed use).
- Screen-reader: action tiles labeled with action + place count; list items announce name, distance, rating in that order.
- Locale: full RTL not needed for pt/en/fr/es/de, but plan typography for German compounds (long words break layouts). Date/time/number formatting via `Intl`; address format per locale.
- Motion: respect `prefers-reduced-motion` — disable parallax, slide transitions; keep state changes instant.
- Color: don't encode meaning in green-vs-red alone (open/closed, available/full) — pair with icon and text.

## 7. Open UX Questions

1. **Token sharing**: is the URL per-reservation or per-guest? Affects favorites, chat identity, agent reservations.
2. **Agent autonomy**: does "Reserve via Agent" actually transact, or draft + human-approve at the venue? UX confidence depends on this.
3. **Chat scope**: owner-only, or does it route to a concierge/staff pool? Affects expected response time copy.
4. **Public landing depth**: should tokenless visitors see *which* guesthouses exist, or only the brand? Conversion vs. privacy.
5. **Multi-guesthouse**: can one token jump between properties (mid-trip relocation)? IA implications for "guesthouse location."
6. **Daily Tour persistence**: one active plan per stay, or history of plans? Affects nav.
7. **Reputation source**: in-app reviews, Google import, or curated by owner? Trust + moderation flow differs sharply.
8. **Post-checkout window**: 24h grace period to access the PWA for receipts, photos, "thanks" message?
