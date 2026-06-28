# Plan-008 — Owner Backoffice Redesign

> **Lifecycle: READY — design decisions locked 2026-06-27; slices + acceptance criteria minted. Awaiting execution kickoff.**
>
> Turns the owner/admin PWA at `/admin/*` from "the guest app's editorial skin stretched over CRUD screens, shipped at desktop proportions to a 390 px phone" into a calm, dense, thumb-friendly **host console**. Design source of truth: [`docs/design/backoffice-redesign/proposal-001.md`](../../design/backoffice-redesign/proposal-001.md) (on branch `docs/backoffice-redesign-proposal`). This plan is the execution layer — it references the proposal's `§`s, it does not restate them.

## Priority tier — SUBSCRIPTION-LAUNCH work, NOT the F&F beta

Locked review decision #1 (2026-06-27): the **F&F beta (Plan-003 · T-3.H.2) runs on the _current_ desktop backoffice**. The backoffice is **owner-only and does not gate the guest beta**. This redesign's real driver is the **paid subscription launch** (selling the backoffice to other hosts), so the roadmap priority tier is **"subscription-blocking," not "beta-blocking."**

The **only pre-beta pull-forward candidates** are the two cheap cleanups in Slice 0 (T-8.0.3 + T-8.0.4) — the consent-banner leak and the `/v1/auth/refresh` 401, both of which degrade the current `/admin` regardless of redesign. Everything else ships on the subscription track.

## Locked decisions (proposal "Review decisions 2026-06-27")

| Topic               | Decision                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequencing          | Priority tier = **subscription-blocking**, not beta-blocking. Beta stays on the current backoffice. Only the §8.11 cleanups are beta pull-forward candidates. |
| Aesthetic           | Diverge to the **denser, Inter-forward console** look (proposal §1.8/§2); keep brand green + warmth as accents. Pilot the overlay on `/admin/beta` first.     |
| Mobile nav          | **5-item bottom tab bar** (proposal §5.1): Today · Reservations · Messages · Places · More.                                                                   |
| Helpers             | Ship both, phased: **translate (Slice 3)**, **map picker (Slice 5)**.                                                                                         |
| Geocoder            | Self-host Photon vs commercial — **TBD, decided in Slice 5 (T-8.5.1)**.                                                                                       |
| i18n                | **pt / en / es from day one** on every string touched — no English leaks.                                                                                     |
| Light/dark + motion | Ride the `[data-app="admin"]` token overlay + existing machinery — **not separate phases**.                                                                   |

## Status note — what already exists (so this plan only covers the genuine gap)

The proposal's central finding: **almost every primitive needed already exists in-repo and is unused** — this is mostly assembly, not invention.

| Already in-repo (reuse, do **not** rebuild)                                                                                                                                                                                                                                                                                                                                                                   | Genuinely missing (this plan builds)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/{button,badge,card,avatar,dropdown-menu,sheet,toggle,toggle-group,carousel,slider}`, `components/{empty-state,bottom-tab-bar,desktop-app-shell}`, `map-view`/`map-pin` + `lib/map/*` (MapLibre+PMTiles), `lib/responsive/use-layout-mode` + `breakpoints`, `lib/theme/use-theme-auto`, `sonner` Toaster (App.tsx), `motion` (framer-motion) dep, full light/dark token ladder in `globals.css` | **Primitives:** `tabs`, `input/label/textarea/select`, `form`, `skeleton`, `loading-state`, `error-state`, `alert-dialog`, `tooltip`, `dialog`+`drawer`, `command`, `top-app-bar`, `stat-tile`. **Shell:** responsive fork (kills the 1301 px overflow). **Screens:** Today dashboard (`/admin` is blank), table→card reflow, agenda reservations, chat detail pane. **Helpers:** EN/PT/ES translate (+ `es` in the data model) and assisted map picker. **States:** first-class loading/error/empty everywhere. **Overlay:** `[data-app="admin"]` token + state-token utilities. |

Central reframe: **Plan-008 = assemble the unused primitives into a responsive, plain-language host console.**

---

## Premise

The single root defect — a fixed `w-56` (224 px) sidebar in `features/backoffice/shell.tsx` that never collapses — cascades into the **1301 px horizontal overflow** on every list page, crushed forms, and a side-by-side chat that can't fit on a phone. On top of that the `/admin` index is **blank**, every loading/error state is a bare muted `<p>`, the **guest telemetry consent banner leaks into the owner app** (physically covering the Save button), and `SessionBootstrap` fires a guest `/v1/auth/refresh` that **401s on every hard `/admin` load**. The bar for this plan: **a non-technical host opens `/admin` on a 390 px phone and, in 3 seconds, knows who arrives today, who messaged them, and what needs action — then acts with one thumb**, in their own language, with no horizontal scroll and no dead-end states.

---

## Task-ID scheme

`T-8.<phase>.<task>` — phase = the plan number (8), the middle digit holds the **proposal phase number (0–5)**, which maps 1:1 to a plan slice. E.g. `T-8.0.1` = Plan-008, proposal Phase 0, task 1. Matches the repo's `T-<phase>.<slice>.<task>` convention.

---

## Slices

> Each slice = one proposal phase. Priority tags are the proposal's own (§9): Slices 0–2 **subscription-blocking**; Slices 3–4 **beta-desirable** (high-value but below the 0–2 core for the subscription MVP); Slice 5 **post-beta polish**. All of it is subscription-track. i18n pt/en/es applies to every string in every slice.

### Slice 0 — Foundation & the two cleanups · subscription-blocking · Size: M

_Rationale: the overlay + primitives every later slice consumes, plus the two cheap degradations that hurt the current `/admin` today._ **deps: none (foundational).**

- **T-8.0.1** — `[data-app="admin"]` token overlay in `globals.css` (light + dark color ladder, semantic STATE tokens exposed via `@theme inline` so `bg-success`/`text-warning`/`bg-nav-active-bg` work, `--shadow-card` elevation, `--nav-active-*` so "you are here" ≠ "primary action"); set `data-app="admin"` on the admin root; override admin `h2/h3` → `--font-sans` (keep `h1` serif). Implements **§2, §2.1–2.6**.
  - **AC:** `/admin` renders the cooler paper-white/ink ladder; `bg-success`/`text-warning`/`bg-info` utilities resolve; admin `h2/h3` are sans, `h1` stays Fraunces; dark mode rides the overlay (no separate work); **`styles/tokens.css` is NOT edited.**
- **T-8.0.2** — `button.tsx` touch sizes: add `touch` (`min-h-11`, 44 px) + `icon-touch` (`h-11 w-11`) variants; do **not** enlarge existing `default/sm/icon`. Implements **§3.3**.
  - **AC:** new size variants compile and render ≥44 px; desktop `default`/`sm` table buttons unchanged.
- **T-8.0.3** — **Cleanup 1 (beta pull-forward candidate):** route-scope `ConsentBanner` out of `/admin` — gate its render so it does not mount under `/admin/*` (owners aren't anonymous guests). Preserve the intentional plain `<a href="/privacy">`. Implements **§8.11**.
  - **AC:** consent banner does not render under any `/admin/*` route; still renders on guest routes; the Save button on owner forms is never overlapped.
- **T-8.0.4** — **Cleanup 2 (beta pull-forward candidate):** in `SessionBootstrap`, skip the guest `refreshSession()` when `pathname.startsWith("/admin")` (mirroring the existing `/r/` skip) so the owner shell bootstraps only its own OIDC session. Implements **§8.11**.
  - **AC:** a hard `/admin` load fires **zero** `/v1/auth/refresh` 401s; guest `/r/` + guest routes unaffected; owner OIDC (`ownerUserManager`) still bootstraps.
- **T-8.0.5** — Base primitives, hand-rolled in `components/ui/` (and `components/`) over the `radix-ui` meta-package — **no `npx shadcn add`**: `tabs`, `input`, `label`, `textarea`, `select`, `form` (RHF+zod `Field`/`FormLabel`/`FormMessage` wrapper), `skeleton`, `loading-state`, `error-state`, `alert-dialog`, `tooltip`. Implements **§3.1–3.2, §6.1–6.3**.
  - **AC:** each primitive exists, uses cva variants + `cn()` + semantic vars matching `sheet.tsx`/`button.tsx`; field primitives have defined borders + white fill + focus ring + ≥44 px mobile height; `loading-state` exposes `cards`/`table`/`tiles`/`thread` variants; `error-state` has an `AlertTriangle` + plain message + Retry wired to `refetch`.

### Slice 1 — Responsive shell + first-class states · subscription-blocking · Size: L

_Rationale: the keystone. The shell rewrite removes the 224 px theft and the 1301 px overflow at the source; states + the Today dashboard make first contact non-blank and non-dead-end._ **deps: Slice 0 (overlay + primitives).**

- **T-8.1.1** — Rewrite `features/backoffice/shell.tsx` forking on `useLayoutMode("lg")` (prefer pure CSS `hidden lg:flex` / `lg:hidden`): **desktop rail** (`hidden lg:flex`, grouped nav with lucide icons + labels + count badges + distinct `--nav-active-*` state, brand top, account/theme/locale footer); **mobile** top app bar (`top-app-bar.tsx`: brand · page title · hamburger → `Sheet side="left"` for secondary nav + account/theme/locale) + **5-item bottom tab bar** (Today · Reservations · Messages · Places · More; "More" → `Sheet` with Guesthouses/Profile/Metrics/theme/locale/sign-out). Implements **§3.4, §4.1, §5.1**.
  - **AC:** at 390 px there is **no horizontal overflow** on any list page; rail paints only ≥`lg`; bottom tabs + More sheet paint only <`lg`; nav-active uses `--nav-active-*` not `--primary`; count-badge slots exist on Reservations + Messages.
- **T-8.1.2** — Add `routes/admin._index.tsx` = the **Today** dashboard, wired as the default admin child in `App.tsx`. Greeting header (property anchor); tappable `StatTile`s (check-ins today, check-outs today, pending reservations [warning if >0], unread messages, places needing attention, active guest links) → filtered lists; 2–3 thumb-reachable quick actions; "View as a guest" link; first-run setup checklist. Promote/extend `features/admin-beta/beta-dashboard.tsx` scaffold. Implements **§5.2, §8.1**.
  - **AC:** `/admin` is no longer blank; each tile taps through to its filtered list; every tile shows a skeleton while its query loads and an inline error+retry on failure (never a blank tile); first-run checklist appears only when places/guesthouse/profile-photo are missing.
- **T-8.1.3** — Replace **every** bare `<p>Loading…</p>`/`<p>Failed…</p>` with `LoadingState`/`ErrorState` across `place-list`, `reservation-list`, `chat-inbox`, `profile-form`, `guesthouse-list`, `beta-dashboard`; extend `EmptyState` to every list (host-oriented localized copy + one CTA). Implements **§6.1–6.3**.
  - **AC:** no bare `<p>` loading/error string remains in the backoffice; loading skeletons are shaped like the result (no reflow on arrival); every error has a Retry calling `refetch`; every list has an empty state with one CTA; copy is pt/en/es.
- **T-8.1.4** — Fix the `/admin/beta` loading-vs-error degradation: distinguish `isLoading` (skeleton tiles) from `isError` (`ErrorState` + Retry) so a failed fetch never shows infinite "Loading metrics…"; localize the hardcoded English string. Implements **§6.3, §8.10**. _(The backend 500 root cause — `bff` missing SELECT on `analytics` — is **already fixed in #159**; this task is the **front-end degradation only**, so any future fetch error never masquerades as infinite loading.)_
  - **AC:** an injected fetch error on `/admin/beta` shows `ErrorState` + Retry, not infinite loading; "Loading metrics…" is localized pt/en/es; this page is the **pilot** for the overlay + state stack.

### Slice 2 — List reflow + plain language · subscription-blocking · Size: L

_Rationale: turn desktop-only multi-column tables into phone-friendly cards and strip raw enums / dev jargon — the bulk of the day-to-day host surface._ **deps: Slice 1 (shell + states), Slice 0 (`alert-dialog`, `dropdown-menu`).**

- **T-8.2.1** — Places list table→card reflow: `<table className="hidden md:table">` + `md:hidden` card list (name title + status/Pick/Hidden badges + Edit + kebab `DropdownMenu` for secondary/destructive); FAB on mobile + sticky `New Place` on desktop; search + status/locale filter chips (`ToggleGroup`) + total count. Implements **§4.2, §8.2**. **Guardrail: never `overflow-x-auto` the table.**
  - **AC:** no `<table>` is visible below `md`; the card carries name + color-coded status + Pick/Hidden flags + one primary action + kebab; FAB ≥44 px; filters + count render.
- **T-8.2.2** — Guesthouses list reflow (same pattern) with hospitality signal: cover photo/avatar, status, nº de quartos, last updated; **demote `Slug`** out of the list (auto-generate; tuck into an advanced collapsible in the edit form); FAB + first-run empty state. Implements **§8.5**.
  - **AC:** no `Slug` column in the list; each row/card shows a cover thumbnail; count subtitle ("1 alojamento"); FAB on mobile.
- **T-8.2.3** — Reservations table → **agenda card list grouped by day** (Hoje / Amanhã / Esta semana, sorted by upcoming check-in): guest name (title), `Check-in → Check-out` + "N noites" helper, party-size chip, localized status badge. **Reframe `Token` → "Acesso do hóspede"** with a Link activo / Link revogado badge + explanatory line; outcome-based action wording ("Enviar link ao hóspede" / "Revogar acesso"); **fix the green-button/state mismatch**; property chip for multi-property hosts; localized dates. Implements **§8.7**.
  - **AC:** reservations render grouped by day; no raw "Token"/enum strings; the action button color aligns with the state it acts on; dates localized ("25 jun 2026").
- **T-8.2.4** — Localize all enums/jargon to friendly pt/en/es labels from a **single status→color source of truth** (proposal §2.1 table): `published`→Live/Publicado, `owner_approved`→Awaiting review/Em revisão, `draft`→Draft/Rascunho, `confirmed`→Confirmada, `revoked`→Revogada, etc. Used by every `Badge`. Implements **§2.1, principle 4**.
  - **AC:** no raw enum string renders anywhere in the backoffice; one badge/label map is the single source consumed by all lists + the dashboard.
- **T-8.2.5** — `AlertDialog` for destructive confirms (archive place, revoke link) replacing the cramped inline confirm in `place-list`; **optimistic** host's-pick + visibility toggles (update react-query cache immediately, roll back + `toast.error` on failure); success toast on every mutation ("Guardado", "Link enviado"); copy-to-clipboard + toast on issue-link. Implements **§6.4, §8.2, §8.7**.
  - **AC:** archive + revoke route through `AlertDialog`; a toggle updates the UI instantly and rolls back on a forced failure; every mutation emits a success toast; issue-link copies to clipboard.

### Slice 3 — Form excellence + Helper A (translation) · beta-desirable · Size: L

_Rationale: the create/edit surfaces the subscriber lives in — onto a shared form system, plus the signature one-tap EN/PT/ES translation that removes per-language hand-typing._ **deps: Slice 0 (`form`, `tabs`, `tooltip`, `alert-dialog`), Slice 1 (shell).**

- **T-8.3.1** — Refactor `place-form`, `guesthouse-form`, `profile-form` onto `form.tsx`: single-column **sectioned Cards** (Identidade · Localização · Estado e visibilidade · Contactos · Horário · Multimédia), **sticky bottom save bar** (`pb-[env(safe-area-inset-bottom)]`, suppress the bottom tab bar on form routes), required-field markers, inline zod errors via `FormMessage`, ≥44 px controls, char counters, dirty-state unsaved-changes guard, media dropzone with format/size hints + thumbnail preview grid; drop the duplicate `Cancelar` on the edit form. Implements **§6.5, §8.3, §8.4, §8.6, §8.9**.
  - **AC:** all three forms use the shared `Field`/`FormMessage`; the save bar is reachable above the keyboard on mobile; media shows a preview grid, not a bare dashed box; leaving a dirty form prompts a guard.
- **T-8.3.2** — Opening-hours redesign: per-day Aberto/Fechado toggle, "Aberto 24h", "Copiar para todos os dias", larger stacked time controls on mobile; surface the hours rule inline (currently hidden behind the consent banner on desktop). Implements **§8.4**.
  - **AC:** per-day toggles + 24h + copy-to-all-days work; the hours rule is visible inline; controls ≥44 px on mobile.
- **T-8.3.3** — Profile re-scope: only translatable text (Bio) inside EN/PT/ES `Tabs`; move language-invariant fields (Telefone, Email, Foto, Opções de contacto) into a shared "Comum a todos os idiomas" section; **default the tab to Português**; rename "WhatsApp (Cloud API)" jargon + one-line helper per contact option (what guests see); brand-styled switches (≥44 px); avatar preview + tap-to-upload copy; inline email/phone validation; center at a sensible max-width on desktop. Implements **§8.9**.
  - **AC:** only Bio is per-locale; default tab is PT; no "Cloud API" jargon; checkboxes are brand switches; desktop form is width-capped (no ~45 % waste).
- **T-8.3.4** — **Data model: add `es`** (blocker for the translate helper). Add `"es"` to the zod `FormSchema`, the `TABS` const, the body builders (`name`/`description` maps), and shared-types — driven from **one config array** so EN/PT/ES stays DRY across both forms. Implements **§7a step 0**.
  - **AC:** an ES field exists in schema + payload for places, guesthouses, and profile bio; a single config array drives the EN/PT/ES tab set in both forms (no per-form locale literals).
- **T-8.3.5** — Build `POST /v1/admin/translate` in the BFF (Claude via `ANTHROPIC_API_KEY`, already present): `{ source_locale, target_locales[], fields }`. The prompt **must** constrain output to **European Portuguese, pré-AO** (`ptpt-excellence` doctrine — generic MT drifts to PT-BR, a trust-killer) and honour a **do-not-translate list** (proper nouns: guesthouse/place names, "Calheta", POI names); the business `name` field is not translated, only `description`/`bio`. Implements **§7a backend**.
  - **AC:** the endpoint returns PT-PT pré-AO output; the do-not-translate list is respected; owner-auth-gated; per-guest/owner rate-limited (mirror the Plan-003 T-3.C.3 pattern) to cap Anthropic spend.
- **T-8.3.6** — Ship `TranslatableField` + `useFieldTranslation` (in `features/backoffice/components/`) with EN/PT/ES `Tabs`: per-field globe/sparkle trigger (Tooltip) + "Traduzir tudo" bulk action (fills **only empty** targets); **suggest, never silently overwrite** (an already-non-empty target requires an `AlertDialog` confirm + keep undoable); per-field in-flight shimmer/`Loader2`; an "Auto-translated" `Badge` that clears on edit; mark targets "out of sync" when the source changes; `setValue` into RHF + mark dirty + toast on done/fail; **never block Save on a translation failure**. Extract once, shared by place + guesthouse + profile forms. Implements **§7a UX**.
  - **AC:** per-field and bulk translate work; a non-empty target requires confirm before replace; Save is never blocked by an MT failure (degrades to manual entry); the component is shared, not duplicated per form.

### Slice 4 — Chat experience · beta-desirable · Size: M

_Rationale: the highest-leverage friction cut for a busy host — a real, mobile-first conversation surface with quick replies._ **deps: Slice 0 (primitives), Slice 1 (shell + nav badge slot).**

- **T-8.4.1** — Chat layout: two-pane at `lg+`; **single-pane master→detail push on mobile** (list → tap → full-height thread → back); strengthen pane borders. Implements **§4.3, §8.8**.
  - **AC:** mobile uses single-pane push navigation; desktop keeps two-pane; back returns to the list.
- **T-8.4.2** — Redesign conversation rows around host data: colored-initials avatar, guest **display name** (bold primary), property + last-message preview (secondary), relative timestamp ("há 2 dias"), unread dot/bold. **Replace opaque `aaa00001…` / `smoke-…` IDs entirely.** Implements **§8.8**.
  - **AC:** rows show real guest name + property + last-message preview + relative time; no raw IDs render.
- **T-8.4.3** — Real detail pane: message bubbles (sender + timestamp), **sticky reply composer**, and **Quick Reply template chips** (wifi, check-in, recomendações); thread header with guest + property + booking context. Implements **§8.8**.
  - **AC:** bubbles render with sender/time; composer is sticky above the keyboard; tapping a quick-reply chip inserts its template; thread header shows booking context.
- **T-8.4.4** — Unread-count badge on the Messages nav item (rail + bottom tab); search/filter bar; skeleton (`thread` variant)/empty/error states. Implements **§8.8**.
  - **AC:** the unread badge reflects unread conversations in both rail and bottom tab; search filters the conversation list; thread skeleton on load.

### Slice 5 — Helper B (map picker) + polish · post-beta · Size: M

_Rationale: the assisted map pin (a non-technical host cannot hand-enter coordinates), the real beta-metrics dashboard, and the calm motion layer._ **deps: Slice 0 (`dialog`/`drawer`, `command`), Slice 3 (forms host the picker).**

- **T-8.5.1** — **Geocoder decision (TBD) + BFF proxy.** Decide self-host **komoot Photon** vs a commercial geocoder (Geoapify/MapTiler/LocationIQ) and record it. Add a **BFF proxy** (`POST /v1/admin/geocode`) to debounce, cache, bias to Portugal (`countrycodes=pt`) + an Azores bbox, and hide keys. **Do NOT use the Nominatim public API client-side** (ToS forbids autocomplete). Implements **§7b backend**.
  - **AC:** the proxy returns PT-biased typo-tolerant suggestions; no geocoder key is in the client bundle; the Photon-vs-commercial choice is recorded in this plan/EXECUTION.
- **T-8.5.2** — `LocationPicker` (in `features/backoffice/components/`, shared by place + guesthouse forms): `Drawer` (bottom-sheet) on mobile / `Dialog` on desktop; full-bleed MapLibre via the **existing** `lib/map/*` (no second map engine); a `Command` combobox address search (debounce ~300 ms, `AbortController` cancel, ≤10 suggestions); a **fixed center pin** (move-the-map-under-pin, no draggable `Marker` on touch); "Usar a minha localização" (`navigator.geolocation`); "Confirmar localização" → `setValue("geom_lat"/"geom_lng")`. Reverse-geocode on `moveend` **only if the pin moved >~50 m**. Collapse raw lat/lng behind a `Collapsible` (they remain the zod-validated RHF source of truth); replace the "Map picker deferred to Phase 2" placeholder. Implements **§7b UX**.
  - **AC:** the picker writes coordinates into RHF; the map is **not blank** in the Dialog/Drawer (the 0-height bug is handled — explicit height + `map.resize()` after the open transition); the numeric fallback is always present; built as a shadcn `Command`, **not** `@maplibre/maplibre-gl-geocoder`.
- **T-8.5.3** — Beta-metrics real dashboard on `/admin/beta`: responsive grid of branded KPI stat-cards (reservas, visualizações, conversão, mensagens) with trend deltas + a date-range control; page header + on-page H1 "Métricas beta" + one-line description. Implements **§8.10**.
  - **AC:** real KPIs render with trend deltas and a working date range; the page uses the overlay/skeleton/error/i18n stack from Slice 1.
- **T-8.5.4** — Calm motion polish: `motion` (framer-motion) micro-interactions on **allowed surfaces only** (drawer/sheet slide, bottom-sheet `y`, tab cross-fade, FAB press, subtle page-transition opacity), honouring `prefers-reduced-motion` (already global in `globals.css`); theme toggle in the top bar / rail. Implements **§2.6, §9 Phase 5**.
  - **AC:** motion appears only on the allowed surfaces (no per-row list / badge-pulse / scroll animation); reduced-motion is honoured; the theme toggle works in both shells.

---

## Gotchas (carry-through from the proposal — read before touching code)

- **No `npx shadcn add …`.** This repo hand-rolls shadcn-style components over the unified `radix-ui` meta-package (not `@radix-ui/react-*`, not the shadcn CLI registry). The CLI forks the primitive style and breaks the token contract. Build by hand in `components/ui/`, matching `sheet.tsx`/`button.tsx`/`card.tsx`. _(§3)_
- **Never edit `styles/tokens.css`** — Stitch regenerates it. The admin look is a `[data-app="admin"]` **semantic-var overlay** in `globals.css` only. _(§2)_
- **Never `overflow-x-auto` a table** to "fix" overflow — horizontal-scrolling a 6-column grid is exactly the anti-pattern non-technical phone users fail at. Tables become `hidden md:table` + a `md:hidden` card list. _(§4.1)_
- **Keep `useLayoutMode`'s mobile SSR/jsdom default** so phones never flash desktop DOM; prefer pure CSS `hidden lg:flex`/`lg:hidden` over JS forks where possible. _(§4.4)_
- **MapLibre in a Dialog/Drawer initializes at 0 height** → give the container an explicit height and call `map.resize()` after the open transition (or via `ResizeObserver`), or the picker ships blank. _(§7b)_
- **PWA vitest navigation tests fail locally** (undici `AbortSignal`) but pass in CI — don't chase them while reworking the shell; rely on CI + the existing `playwright.owner.config.ts`. _(§9 testing)_
- **i18n pt/en/es from day one** on every string touched (no English leaks). **Light/dark + motion ride the overlay** + existing machinery — not separate phases. _(§9)_

---

## Dependency / execution order

```
Slice 0  Foundation + cleanups        (none)         — overlay, primitives, 2 cleanups
Slice 1  Responsive shell + states    (needs 0)      — KILLS the 1301px overflow; keystone
Slice 2  List reflow + plain language (needs 0,1)
Slice 3  Forms + translate helper     (needs 0,1)    — adds `es`; BFF /translate
Slice 4  Chat experience              (needs 0,1)    — can run parallel to 3
Slice 5  Map picker + polish          (needs 0,3)
```

Critical path: **Slice 0 → Slice 1 → Slice 2** (the subscription-blocking core). Slices 3 + 4 can run in parallel after Slice 1; Slice 5 closes the plan. The two §8.11 cleanups (T-8.0.3/T-8.0.4) are the only items eligible to pull forward into the beta window.

---

## Risk register

| Risk                                                                                    | Likelihood | Impact                    | Mitigation                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Someone runs `npx shadcn add` and forks the primitive style / breaks the token contract | Med        | High (silent token drift) | Gotcha called out per-slice; primitives are hand-rolled in T-8.0.5; review checks new components against `sheet.tsx`/`button.tsx` conventions. |
| `tokens.css` edited directly (Stitch overwrites it next regen)                          | Med        | High (overlay lost)       | Overlay lives only in `globals.css` under `[data-app="admin"]`; AC on T-8.0.1 forbids touching `tokens.css`.                                   |
| MT output drifts to PT-BR (trust-killer for a PT host)                                  | High       | High (subscriber trust)   | T-8.3.5 prompt constrains to European-Portuguese pré-AO + do-not-translate list; run `ptpt-excellence`/`revisor-ptpt` on sampled output.       |
| Anthropic spend blowout via `/v1/admin/translate` abuse                                 | Med        | Med ($)                   | T-8.3.5 rate-limits the endpoint per owner (mirror T-3.C.3); owner-auth-gated.                                                                 |
| Map picker ships blank (0-height in Dialog/Drawer)                                      | Med        | Med                       | T-8.5.2 AC requires explicit height + `map.resize()` after open; numeric fallback always present.                                              |
| Shell rewrite regresses owner auth / route flicker                                      | Med        | High                      | Keep `useLayoutMode` mobile default + CSS forks; verify via `playwright.owner.config.ts` (local vitest nav tests are a known false-negative).  |
| ES added to UI before the data model → silent no-op translate buttons                   | Med        | Med                       | T-8.3.4 (add `es` to schema/payload) is an explicit blocker sequenced before T-8.3.6.                                                          |

---

## Out of scope (this plan)

- **Anything in the guest app** (`/`, `/r/*`, Discover, Daily Tour, Place Detail, guest Chat) — owner `/admin/*` only.
- **Bulk-select / command-palette jump-to** beyond the noted later nicety (mentioned in §8.2/§5 as future).
- **Multi-owner scoping / billing / Stripe** — that is Plan-004 / Plan-006 territory; this plan redesigns the existing single-owner backoffice surface.
- **The `/admin/beta` backend 500** — already fixed in **#159**; only the front-end degradation (T-8.1.4) is in scope.
- **Reconciliation to the in-flux Portugal Odyssey platform design** — deliberately deferred; the overlay keeps it a future token-remap, not a rewrite (proposal principle 8).

---

## Sizing summary + suggested order

| Order | Slice                                | Priority              | Size |
| ----- | ------------------------------------ | --------------------- | ---- |
| 1     | Slice 0 Foundation + cleanups        | subscription-blocking | M    |
| 2     | Slice 1 Responsive shell + states    | subscription-blocking | L    |
| 3     | Slice 2 List reflow + plain language | subscription-blocking | L    |
| 4     | Slice 3 Forms + translate helper     | beta-desirable        | L    |
| 4'    | Slice 4 Chat experience              | beta-desirable        | M    |
| 5     | Slice 5 Map picker + polish          | post-beta             | M    |

The §8.11 cleanups (T-8.0.3/T-8.0.4) are the only beta-window pull-forward candidates; everything else ships on the subscription track. This is mostly **assembly of unused in-repo primitives**, not invention.

---

## Exit criteria

- `/admin` renders at 390 px with **no horizontal overflow** on any list page; the shell forks rail (≥`lg`) vs top-bar+bottom-tabs (<`lg`).
- `/admin` index is the **Today** dashboard (no blank pane); the consent banner no longer leaks into `/admin`; a hard `/admin` load fires zero `/v1/auth/refresh` 401s.
- Every list (places/guesthouses/reservations/chat) reflows to cards below `md`; no raw enums or dev jargon (`Token`, `Slug`, `owner_approved`) render; all strings are pt/en/es.
- Every loading state is a shaped skeleton, every error has a Retry, every list has an empty state; `/admin/beta` never shows infinite "Loading metrics…".
- Forms run on the shared `form.tsx` with sticky save bar + ≥44 px controls; EN/PT/ES tabs with one-tap translate (PT-PT pré-AO) work and never block Save.
- The assisted `LocationPicker` writes coordinates into RHF and is not blank in its Dialog/Drawer; the numeric fallback is always present.
- Light/dark + calm motion ride the overlay; `prefers-reduced-motion` honoured; `tokens.css` untouched.

---

> Design source of truth: [`docs/design/backoffice-redesign/proposal-001.md`](../../design/backoffice-redesign/proposal-001.md). This plan references its `§`s; it does not restate the design rationale.
