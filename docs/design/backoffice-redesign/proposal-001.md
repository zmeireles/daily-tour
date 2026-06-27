# Daily Tour Owner Backoffice — Graphic-Design Proposal 001

> **Status:** DRAFT for review · **Author:** Lead Product Designer (synthesis of per-page UX critiques + 3 research lenses) · **Date:** 2026-06-27
> **Scope:** The owner/admin PWA at `/admin/*` (apps/pwa). NOT the guest app.
> **Design direction (locked):** Standalone best-in-class NOW. Do not constrain to the in-flux Portugal Odyssey platform design. Keep tokens/components clean for later reconciliation — express the admin look as a **scoped overlay**, never by editing `styles/tokens.css`.
>
> **Review decisions (locked 2026-06-27):**
>
> 1. **Sequencing** — the F&F beta (3.H.2) runs on the **current desktop backoffice** (owner-only; it does not gate the guest beta). This redesign's real driver is the **paid subscription launch** (selling to other hosts), so the roadmap priority tier is **"subscription-blocking," not "beta-blocking."** The only pull-forward candidates for the beta window are the two cheap cleanups (§8.11).
> 2. **Aesthetic** — diverge to the denser, Inter-forward console look (§1.8/§2), keeping brand green + warmth as accents. Preview the token overlay on `/admin/beta` before going wide.
> 3. **Mobile nav** — 5-item bottom tab bar as proposed (§5.1).
> 4. **Helpers** — ship both, phased (§7): translate (Phase 3), map picker (Phase 5). Geocoder choice (self-host Photon vs commercial) deferred to Phase 5.

---

## 0. The one-paragraph thesis

The backoffice today is the **guest app's editorial skin (warm cream + Fraunces serif) stretched over CRUD screens, shipped at desktop proportions to a 390 px phone**. The single root defect — a fixed `w-56` (224 px) sidebar in `features/backoffice/shell.tsx` that never collapses — cascades into the 1301 px horizontal overflow on every list page, crushed forms, and a side-by-side chat that can't fit. On top of that the `/admin` index is blank, every loading/error state is a bare muted `<p>`, and the **guest telemetry consent banner leaks into the owner app** and physically covers form fields and the Save button. This proposal turns the backoffice into a **calm, dense, thumb-friendly "host console"**: a responsive shell (bottom tabs + drawer on mobile, rail on desktop), cards-not-tables, a real "Today" dashboard, first-class states, and two signature low-friction helpers (one-tap EN/PT/ES translation and an assisted map pin). Crucially, **almost every primitive needed already exists in-repo and is unused** — `components/ui/sheet.tsx`, `components/bottom-tab-bar.tsx`, `lib/responsive/use-layout-mode.ts`, `components/empty-state.tsx`, `sonner`, `maplibre-gl`, and a full light/dark token ladder. This is mostly assembly, not invention.

---

## 1. Design north-star & principles

**North-star:** _"A busy, non-technical host opens the app on a 390 px phone between guests and, in 3 seconds, knows who arrives today, who messaged them, and what needs action — then acts with one thumb."_

The persona is a **subscriber of the Portugal Odyssey platform**: a small tourism entrepreneur or guesthouse host — tight schedule, low IT literacy, heavy mobile-app user. They are not anonymous guests; they are paying operators who expect the backoffice to feel like Airbnb Host or Booking Pulse, not a developer admin grid.

### Principles (each maps to a concrete defect being fixed)

1. **Mobile-first, thumb-first.** Primary navigation and primary actions live in the thumb zone (bottom tab bar / FAB / sticky save bar), never top-right. Every interactive control ≥ 44 px on touch. _(Fixes: `New Place` top-right, 32–36 px ghost buttons.)_
2. **Glanceable over comprehensive.** Status is color first, text second. The landing answers "what needs me now," not "here is a blank pane." _(Fixes: blank `/admin`, raw enum badges.)_
3. **Cards on phones, tables on desktops.** A multi-column `<table>` is a desktop-only representation. Never horizontal-scroll a table on a phone. _(Fixes: 1301 px overflow.)_
4. **Plain language, host vocabulary.** No raw enums (`owner_approved`, `draft`, `published`), no dev jargon (`Token`, `Slug`, `Cloud API`). Localized friendly labels with one-line helpers. _(Fixes: mixed-language leaks, `Token`/`Slug` columns.)_
5. **No dead ends, no silent failure.** Loading = skeletons shaped like the result. Error = plain message + Retry. Empty = illustration + one CTA. Success = toast. A 500 must never masquerade as infinite loading. _(Fixes: bare `<p>` states, the `/admin/beta` perpetual "Loading metrics…".)_
6. **Assist, never gate.** Helpers (translate, map pin) are optional accelerators with a manual fallback always present; a failed assist never blocks Save. _(New: the two signature helpers.)_
7. **Right context only.** The owner app is not the guest app — guest telemetry consent must not render here. _(Fixes: the consent-banner leak + the `/v1/auth/refresh` 401.)_
8. **Standalone but reconcilable.** Diverge to a denser, Inter-forward console aesthetic now, but as a `data-app="admin"` overlay over the existing semantic vars — so a later PO-platform reconciliation is a token remap, not a rewrite.
9. **Calm motion, honoured reduced-motion.** Transform/opacity only, on drawer/sheet/tab/FAB — never on dense list rows. `prefers-reduced-motion` already globally honoured in `globals.css`; keep it.

---

## 2. Design tokens (concrete, Tailwind-ready)

**Hard rule (from `tokens.css` header):** do **not** edit `styles/tokens.css` — Stitch regenerates it. The admin look is a **semantic-var overlay** added to `globals.css` under a `[data-app="admin"]` root, remapping the shadcn vars the components already consume. Set `data-app="admin"` on the `<html>` element (or the `BackofficeShell` root) so only `/admin` picks it up.

The guest brand is _warm cream + serif_. The admin console keeps the **brand green and the warmth as accents** but moves the working surfaces to a **cooler, higher-contrast, paper-white/ink ladder** so dense data reads cleanly and serif stops fighting scannability.

### 2.1 Color — light + dark (admin overlay)

Add to `globals.css`:

```css
/* ─── Admin console overlay — scoped, layered over the guest semantic vars ─ */
[data-app="admin"] {
  /* Surfaces: paper-white working canvas instead of cream-on-cream */
  --background: #f6f7f5; /* app canvas — faint cool stone */
  --foreground: var(--basalt-950);
  --card: #ffffff; /* elevated working surface (was cream-50) */
  --card-foreground: var(--basalt-950);
  --popover: #ffffff;
  --popover-foreground: var(--basalt-950);

  --primary: var(--tea-600); /* brand green — PRIMARY ACTIONS ONLY */
  --primary-foreground: #ffffff;
  --secondary: #eef0ed; /* neutral chips/secondary buttons */
  --secondary-foreground: var(--basalt-700);
  --muted: #eef0ed;
  --muted-foreground: #5b665f; /* AA on white (>= 4.5:1) */
  --accent: var(--hydrangea-600); /* informational accent (links, focus echoes) */
  --accent-foreground: #ffffff;
  --destructive: var(--coral-600);
  --destructive-foreground: #ffffff;

  --border: #dce0db; /* visible hairlines (was basalt-300 on cream) */
  --input: #cfd5cd; /* defined field borders */
  --ring: var(--tea-500);

  /* Semantic STATE tokens (new — used by badges, dashboard tiles) */
  --success: var(--tea-500);
  --success-foreground: #ffffff;
  --warning: var(--sun-400);
  --warning-foreground: var(--basalt-950);
  --info: var(--hydrangea-600);
  --info-foreground: #ffffff;

  /* "You are here" navigation must NOT reuse --primary (which marks actions).
     Use a distinct, lower-chroma nav-active token so state != action. */
  --nav-active-bg: #e7efe9; /* tea tint */
  --nav-active-fg: var(--tea-600);
}

[data-app="admin"][data-theme="dark"],
[data-app="admin"] .dark,
.dark [data-app="admin"] {
  --background: #0e1413; /* basalt canvas */
  --foreground: #e7ece9;
  --card: #18211f; /* one step up from canvas */
  --card-foreground: #e7ece9;
  --popover: #18211f;
  --popover-foreground: #e7ece9;

  --primary: var(--tea-400);
  --primary-foreground: #0b1110;
  --secondary: #232c2a;
  --secondary-foreground: #e7ece9;
  --muted: #232c2a;
  --muted-foreground: #9fb0a8; /* AA on dark card */
  --accent: var(--hydrangea-300);
  --accent-foreground: #0b1110;
  --destructive: var(--coral-400);
  --destructive-foreground: #0b1110;

  --border: #2b3633;
  --input: #2b3633;
  --ring: var(--tea-400);

  --success: var(--tea-400);
  --success-foreground: #0b1110;
  --warning: var(--sun-400);
  --warning-foreground: #0b1110;
  --info: var(--hydrangea-300);
  --info-foreground: #0b1110;

  --nav-active-bg: #1f2b27;
  --nav-active-fg: var(--tea-400);
}
```

Then expose the new state tokens as utilities in the existing `@theme inline` block (so `bg-success`, `text-warning`, etc. work):

```css
@theme inline {
  /* …existing… */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-nav-active-bg: var(--nav-active-bg);
  --color-nav-active-fg: var(--nav-active-fg);
}
```

**Status → color mapping (single source of truth, used by every Badge):**

| Domain status           | Friendly label (en / pt-PT / es)             | Token         | Badge variant     |
| ----------------------- | -------------------------------------------- | ------------- | ----------------- |
| place `published`       | Live / Publicado / Publicado                 | `success`     | `default` (green) |
| place `owner_approved`  | Awaiting review / Em revisão / En revisión   | `warning`     | `warning`         |
| place `draft`           | Draft / Rascunho / Borrador                  | `muted`       | `outline`         |
| place `archived`        | Archived / Arquivado / Archivado             | `muted`       | `secondary`       |
| reservation `confirmed` | Confirmed / Confirmada / Confirmada          | `success`     | `default`         |
| reservation `pending`   | Pending / Pendente / Pendiente               | `warning`     | `warning`         |
| token `active`          | Link active / Ligação activa / Enlace activo | `success`     | `default`         |
| token `revoked`         | Revoked / Revogada / Revocado                | `destructive` | `destructive`     |
| place hidden            | Hidden / Oculto / Oculto                     | `muted`       | `secondary`       |

### 2.2 Typography

Reuse the existing ramp in `globals.css` (`--text-xs … --text-display`). Two admin-specific rules:

- **Reserve Fraunces (`--font-display`) for the page `<h1>` and empty/marketing surfaces only.** Data rows, table headers, form labels, badges, and `<h2>`/`<h3>` inside dense screens use **Inter (`--font-sans`)**. Today `globals.css` `@layer base` applies `--font-display` to all of `h1,h2,h3` — under `[data-app="admin"]` override `h2, h3` back to `--font-sans` for tool density:

```css
[data-app="admin"] h2,
[data-app="admin"] h3 {
  font-family: var(--font-sans);
  font-weight: 600;
}
[data-app="admin"] h1 {
  font-family: var(--font-display);
} /* keep serif brand moment */
```

- **Admin type usage:** page title `text-2xl` (1.75rem) serif; section/card titles `text-base`/`text-lg` semibold sans; body & data `text-sm` (0.875rem); meta/labels `text-xs` (0.75rem) `text-muted-foreground`. Line-height 1.4–1.5 for data legibility.

### 2.3 Spacing scale

Tailwind v4 default 4 px base step (`1`=4px … `4`=16px … `6`=24px). Admin density conventions:

- Card padding: `p-4` mobile, `p-6` desktop.
- Stack gap between cards/sections: `gap-4` (16px) mobile, `gap-6` desktop.
- Form field vertical rhythm: `space-y-4` within a section card, `space-y-6` between section cards.
- Touch hit area: min `44px` height for any control on mobile (see §3 button size).
- Safe-area: bottom tab bar + sticky save bar must add `pb-[env(safe-area-inset-bottom)]` (already modelled in `bottom-tab-bar.tsx`).

### 2.4 Radius

Reuse existing: `--radius: 0.625rem` → `radius-sm 0.375 / md 0.5 / lg 0.625 / xl 1rem`. Cards `rounded-lg`, inputs/buttons `rounded-md`, badges/chips `rounded-full`, FAB `rounded-full`.

### 2.5 Elevation

The guest app is intentionally flat. The admin console needs **just enough elevation to separate working surfaces** without going skeuomorphic:

```css
[data-app="admin"] {
  --shadow-card: 0 1px 2px rgb(14 20 19 / 0.04), 0 1px 3px rgb(14 20 19 / 0.06);
}
[data-app="admin"][data-theme="dark"] {
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.3);
}
```

- Cards: `shadow-[var(--shadow-card)]` + 1px border.
- Drawer/Sheet & dialogs: existing Sheet `shadow-lg`.
- Sticky save bar / bottom tab bar: top border + subtle upward shadow `shadow-[0_-1px_3px_rgb(14_20_19/0.06)]`.
- FAB: `shadow-lg`.

### 2.6 Motion

Reuse the existing motion tokens (`--ease-out-soft`, `--duration-fast/base/slow`). `motion` (framer-motion) is already a dep. **Allowed surfaces only:** drawer/sheet slide-in (`x`, `--duration-base`), bottom-sheet map picker (`y`), tab/segment cross-fade (`opacity`, `--duration-fast`), FAB press (`scale`), page transition (subtle `opacity`). **Forbidden:** per-row list animation, badge pulsing, anything on scroll. All gated by the global `prefers-reduced-motion` rule already in `globals.css`.

---

## 3. Component system on shadcn/ui

**Critical pitfall (from research):** this repo uses the unified `radix-ui` meta-package with hand-rolled shadcn-style components — **not** `@radix-ui/react-*` and **not** the shadcn CLI registry. Do **not** run `npx shadcn add …`; it forks the primitive style and breaks the token contract. Build new primitives by hand in `components/ui/`, matching the existing `sheet.tsx`/`button.tsx`/`card.tsx` conventions (cva variants, `cn()`, semantic vars).

### 3.1 Already in-repo (reuse, do not rebuild)

`button`, `badge`, `card`, `avatar`, `dropdown-menu`, `sheet` (Radix Dialog drawer), `toggle` / `toggle-group`, `carousel`, `slider`, `sonner` Toaster (in App.tsx), `empty-state`, `bottom-tab-bar`, `desktop-app-shell`, `map-view`/`map-pin` + `lib/map/*` (MapLibre+PMTiles), `lib/responsive/use-layout-mode`, `lib/theme/use-theme-auto`.

### 3.2 To build (hand-rolled, in `components/ui/` unless noted)

| Component                                                                          | Why / used by                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs.tsx` (Radix Tabs)                                                            | Locale tabs EN/PT/ES on forms; replaces hand-rolled `activeTab` toggles in place-form/guesthouse-form.                                         |
| `input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx`                             | DRY field primitives — kill the ~15 repeated `px-3 py-2` input class strings; defined borders + white fill + focus ring + ≥44px mobile height. |
| `form.tsx` (RHF + zod field wrapper)                                               | `Field`/`FormLabel`/`FormMessage` for consistent inline error rendering; both forms already use RHF+zod.                                       |
| `skeleton.tsx`                                                                     | Loading placeholders shaped like cards/rows/tiles.                                                                                             |
| `loading-state.tsx` (in `components/`)                                             | Sibling to `empty-state.tsx` — renders skeleton list/table/tiles by `variant`.                                                                 |
| `error-state.tsx` (in `components/`)                                               | `AlertTriangle` + plain message + **Retry** button wired to react-query `refetch`.                                                             |
| `alert-dialog.tsx` (Radix AlertDialog)                                             | Destructive confirms (archive place, revoke link) — replaces the cramped inline confirm in place-list.                                         |
| `dialog.tsx` + `drawer.tsx`                                                        | Map picker host: Dialog on desktop, bottom-sheet Drawer on mobile. (Drawer can be a thin wrapper over the existing `sheet.tsx side="bottom"`.) |
| `tooltip.tsx`                                                                      | Field helper hints, jargon explanations.                                                                                                       |
| `command.tsx` (combobox)                                                           | Address search box for the map picker; later, jump-to palette.                                                                                 |
| `top-app-bar.tsx` (in `components/`)                                               | Mobile chrome: brand, page title, account menu, theme + locale, hamburger.                                                                     |
| `stat-tile.tsx` (in `features/admin-dashboard/`)                                   | Dashboard KPI/action tile (count + label + icon + tap-through).                                                                                |
| `data-card-list.tsx` pattern                                                       | The `md:hidden` card list shared by places/guesthouses/reservations (may be per-feature rather than generic).                                  |
| `TranslatableField` + `useFieldTranslation` (in `features/backoffice/components/`) | Signature helper A (see §7a).                                                                                                                  |
| `LocationPicker` (in `features/backoffice/components/`)                            | Signature helper B (see §7b).                                                                                                                  |

### 3.3 Button sizing change (touch targets)

`button.tsx` sizes are below the 44 px minimum (`default h-9`=36, `sm h-8`=32, `icon h-9`=36). **Do not enlarge globally** (it would bloat desktop tables). Add a mobile-aware bump scoped to the admin overlay, or add a `touch` size variant used on mobile card lists / forms:

```ts
// button.tsx — add to size variants
size: {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
  touch: "min-h-11 px-4 py-2.5",   // 44px — mobile primary actions
  "icon-touch": "h-11 w-11",        // 44px — mobile icon/kebab buttons
}
```

Forms and mobile card actions use `size="touch"`; desktop tables keep `sm`.

### 3.4 The app shell (the keystone)

Rewrite `features/backoffice/shell.tsx` to fork on `useLayoutMode("lg")` (1024 floor — phones never paint desktop chrome, per the SSR-safe default). Prefer **pure CSS `hidden lg:flex` / `lg:hidden`** for the rail vs mobile chrome to avoid any JS-fork flicker; use the hook only where DOM must differ (e.g. which `Sheet` mounts).

```
Desktop (≥ lg):  [ collapsible rail 224px ] [ main content ]
                  rail: brand · grouped nav (icons + labels + active state + count badges)
                        · footer: account menu, theme toggle, LocaleSwitcher

Mobile (< lg):   top app bar (brand · page title · hamburger → Sheet for secondary nav + account/theme/locale)
                 main content (full width)
                 bottom tab bar (5 items, thumb zone, safe-area)
                 + FAB for the page's primary create action where relevant
```

This single change removes the 224 px theft and the 1301 px overflow at the source.

---

## 4. Responsive strategy

### 4.1 How the 390 px horizontal overflow is killed — root cause → fix

- **Root cause:** `shell.tsx` line 20 — `<nav className="flex w-56 shrink-0 …">` renders verbatim at every width. On a 390 px phone it eats 224 px, leaving ~166 px; the 6-column `<table>` in `place-list.tsx` (line 269, `w-full text-sm`, six `px-4` cells) cannot fit and forces `scrollWidth` to ~1301 px.
- **Fix part 1 — shell:** rail becomes `hidden lg:flex`. Below `lg`, render the top app bar + bottom tab bar; secondary nav lives in a left `<Sheet side="left">` (the component already exists). Main content gets the full viewport width.
- **Fix part 2 — tables:** every multi-column `<table>` becomes `hidden md:table`; a `md:hidden` **card list** renders the same rows. No table is ever visible below `md`, so there is nothing wide to overflow.
- **Guardrail:** never "fix" overflow with `overflow-x-auto` on the table — horizontal-scrolling a 6-column grid is exactly the anti-pattern non-technical phone users fail at.

### 4.2 Table → card reflow (the universal list pattern)

For places, guesthouses, reservations:

```
≥ md:  <table className="hidden md:table"> … existing columns … </table>
< md:  <ul className="md:hidden flex flex-col gap-3">
         <Card> per row:
           line 1: <h3> primary identifier (place/guest/guesthouse name)
           line 2: secondary meta (locality / date range / slug-free)
           inline: status Badge (color-coded) + any flag badges (Pick / Hidden)
           trailing: ONE primary action (Edit / Issue link) + kebab DropdownMenu (secondary + destructive)
         </Card>
       </ul>
```

Row actions that are inline buttons today (`Edit` / `Archive` / toggles) collapse into the existing `DropdownMenu` kebab on mobile. Destructive actions route through `AlertDialog`.

### 4.3 Mobile-first layout rules

- One column below `md`; labels-on-top; `inputMode`/native input types (`tel`, `email`, `url`, `decimal` for coords).
- Long forms get a **sticky bottom save bar** (`sticky bottom-0 border-t bg-card p-4 pb-[env(safe-area-inset-bottom)]`) so Save is always reachable above the keyboard — and it sits above the bottom tab bar (mind the stacking; on form routes the tab bar can be suppressed in favour of the save bar).
- Chat collapses two-pane → single-pane master→detail push (list → tap → full-height thread → back).
- FAB for the dominant create action sits above the bottom tab bar with safe-area padding.

### 4.4 Breakpoint policy

Use the repo authority: `lib/responsive/breakpoints.ts` (`md=768`, `lg=1024`) and `useLayoutMode`. The shell forks at **`lg`** (hard floor — full desktop chrome). Table↔card reflow uses **`md`** (tablet can take a table). Keep `useLayoutMode`'s SSR/jsdom default of `mobile` so phones never flash desktop DOM.

---

## 5. Information architecture & navigation

### 5.1 Nav model

Six destinations exist today (`guesthouses, reservations, chat, places, profile, beta`) plus a missing **Home/Today**. Group and prioritize:

- **Operations** (daily): Today (new), Reservations, Messages
- **Catalogue** (setup): Places, Guesthouses
- **Account**: Profile, Metrics (beta), + theme/locale/sign-out

**Mobile bottom tab bar — 5 items (thumb zone):** `Today` · `Reservations` · `Messages` · `Places` · `More`. "More" opens a `Sheet` with Guesthouses, Profile, Metrics, theme toggle, locale, sign-out. (Host apps cap bottom tabs at ~5.) Add **count badges** on Reservations (today's arrivals) and Messages (unread).

**Desktop rail:** grouped sections with the same items, icons + labels, a distinct active state using `--nav-active-*` (NOT `--primary`, so "you are here" ≠ "primary action"), count badges, brand at top, account/theme/locale at the bottom.

Every nav item gets a **lucide icon** (e.g. `LayoutDashboard`, `CalendarCheck`, `MessageSquare`, `MapPin`, `Home`, `User`, `BarChart3`) to lower scanning effort for low-IT users.

### 5.2 A real `/admin` dashboard — "Today" (the index route)

Today `/admin` renders `BackofficeShell` with an `Outlet` and **no index child** → blank pane on first contact. Add `routes/admin._index.tsx` wired as the default child in `App.tsx`'s admin `children` array, rendering a **Today** screen. (Promote/extend the existing `features/admin-beta/beta-dashboard.tsx` metric-card scaffold rather than starting blank.)

**Today layout (mobile: stacked; desktop: responsive grid):**

1. **Greeting header** — "Bom dia, {name}" + the active property name (brand anchor: logo + property = "you are in the right place").
2. **KPI / action tiles** (each a `StatTile`, tappable → filtered list):
   - **Check-ins today** (count) → Reservations filtered to today's arrivals.
   - **Check-outs today** (count) → Reservations filtered to departures.
   - **Pending reservations** (count + warning color if > 0) → Reservations `pending`.
   - **Unread messages** (count + dot) → Messages.
   - **Places needing attention** (draft / awaiting review / missing photos) → Places filtered.
   - **Active guest links** (count) → Reservations with active token.
3. **Quick actions** (2–3 big buttons, thumb-reachable): "Add a place", "Today's reservations", "Reply to messages".
4. **Preview link**: "View as a guest" → opens the guest Daily Tour (uses the existing guest-token preview path) so the host sees the result of their edits.
5. **Setup checklist (first-run only):** if no places/guesthouse/profile photo, show a progress checklist funnelling into the first listing — the first-run moment currently missing everywhere.

Each tile uses skeletons while its query loads and an inline error+retry if it fails (never a blank tile).

---

## 6. State design

Replace **every** bare `<p>Loading…</p>` / `<p>Failed…</p>` (in `place-list.tsx` 215–222, `beta-dashboard.tsx`, reservation-list, chat-inbox, profile, guesthouse-list) with three first-class, localized (pt/en/es) patterns.

### 6.1 Loading — skeletons, never spinners or text

`components/loading-state.tsx` with `variant`:

- `variant="cards"` — N skeleton cards mirroring the mobile card list.
- `variant="table"` — skeleton header + rows mirroring the desktop table.
- `variant="tiles"` — skeleton KPI tiles for the dashboard.
- `variant="thread"` — skeleton message bubbles for chat.

Skeletons match the final layout's shape so data arrival causes **no reflow**. Built on `skeleton.tsx` (`animate-pulse bg-muted rounded`).

### 6.2 Empty — illustration + one CTA (already have the pattern)

`empty-state.tsx` is already the right calibre and already used for empty places. Extend it to **every** list and to the dashboard first-run. Copy is host-oriented and actionable, e.g. guesthouses: "Adicione o seu primeiro alojamento" → `/admin/guesthouses/new`. Reservations empty: "Ainda não tem reservas — aparecerão aqui quando um hóspede reservar." Chat empty: "As suas conversas com hóspedes aparecerão aqui."

### 6.3 Error — plain language + Retry (never a red sentence, never silent)

`components/error-state.tsx`: `AlertTriangle` icon, plain-language title ("Não foi possível carregar…"), a short line, and a **Retry** button calling the query's `refetch`. **The `/admin/beta` 500-masquerading-as-loading is the canonical bug this fixes:** distinguish `isLoading` (skeletons) from `isError` (ErrorState + retry) so a failed fetch never shows infinite "Loading metrics…".

### 6.4 Success & optimistic updates — toasts (infra already wired)

`sonner` `<Toaster>` is mounted in App.tsx and `toast.error/warning` already used in place-list. Extend to **success** on every mutation (save/create/archive/revoke/issue-link → "Guardado", "Link enviado"). Make the host's-pick and visibility toggles **optimistic** (update the react-query cache immediately, roll back + `toast.error` on failure) so the UI feels instant on a weak phone connection. For "Issue link" add **copy-to-clipboard** + success toast.

### 6.5 Form states

Required-field markers, inline zod errors via `form.tsx` `FormMessage`, char counters on bio/description, in-flight disabled Save with spinner, dirty-state unsaved-changes guard, and a save-success toast. Media dropzone gets format/size hints + a thumbnail/preview grid (not a bare dashed box).

---

## 7. Helper features

### 7a. In-form auto-translation across EN / PT / ES tabs

**Today:** locale tabs are hand-rolled `["en","pt-PT"]` toggles — **ES is missing from the data model and UI**, and there is no translation aid; the host hand-types every field per language.

**Step 0 — extend the data model first (blocker):** add `"es"` to the zod `FormSchema`, the `TABS` const, the body builders (`name`, `description` maps), and shared-types, driven from **one config array** so EN/PT/ES stays DRY across both forms. _(Adding an ES translate button with no ES field to write into is a silent no-op.)_

**Backend (no client-side MT, no 3rd-party key in the bundle):** add `POST /v1/admin/translate { source_locale, target_locales[], fields }` that calls Claude with `ANTHROPIC_API_KEY` (already present). The prompt **must** constrain output to **European Portuguese, pré-AO** (per the `ptpt-excellence` doctrine — generic MT/`pt` drifts to PT-BR, a trust-killer for a PT host) and honour a **do-not-translate list** (proper nouns: guesthouse/place names, "Calheta", POI names). The `name` field for a business arguably should not be translated at all — only `description`/`bio`.

**UX flow (`TranslatableField` + `useFieldTranslation`):**

1. Designate a **source locale** (the tab the host actually wrote in). Translation always flows source → targets.
2. **Per-field trigger:** a small ghost globe/sparkle icon-button (with Tooltip) beside each translatable field re-translates just that field.
3. **Bulk trigger:** a "Traduzir tudo" action in the sticky form toolbar fills **only empty** target fields across all locale tabs in one tap.
4. **Suggest, never silently overwrite:** machine output lands as an editable value and marks the field dirty. If a target field is **already non-empty**, require an `AlertDialog` confirm before replacing, and keep it undoable.
5. **Visible state:** per-field shimmer/`Loader2` while in-flight; an "Auto-translated" `Badge` that clears on edit/confirm; mark targets **"out of sync"** when the source changes after translation.
6. **Wire into RHF without leaving it:** on success `setValue("name_es", …)` / `setValue("description_pt", …)`, mark dirty; `sonner` toast on done/fail. **Never block Save on a translation failure** — degrade to manual entry.

Extract as a shared component so place-form and guesthouse-form (and future entity forms) stay DRY.

### 7b. Assisted map / coordinates finder

**Today:** raw `type="number"` lat/lng inputs defaulting to `37.75 / -25.67`; guesthouse-form literally says _"Map picker deferred to Phase 2 — use numeric inputs for now."_ A non-technical host cannot hand-enter coordinates.

**Reuse the existing map stack** — `maplibre-gl` + PMTiles via `lib/map/init.ts` (`ensurePmtilesProtocol`) and `lib/map/style.ts` (same engine as the guest `discover-map`). Ship **no second map engine**.

**Geocoding backend (do NOT use Nominatim public API client-side — its ToS forbids autocomplete and caps 1 req/s):** self-host **komoot Photon** (typo-tolerant autocomplete, `lang` param for Portuguese names) to match the self-hosted-tiles ethos, OR a commercial geocoder (Geoapify/MapTiler/LocationIQ). **Proxy through the BFF** to debounce, cache, bias to Portugal (`countrycodes=pt`) + an Azores bbox, and hide keys.

**UX flow (`LocationPicker`, shared by both forms):**

1. Collapse raw lat/lng behind a `Collapsible` "Introduzir coordenadas manualmente" (they remain the zod-validated RHF source of truth; the map writes into them).
2. Primary affordance: a **static-map thumbnail** (or "Definir localização no mapa" button) → opens the picker as a **Drawer (bottom-sheet) on mobile, Dialog on desktop**.
3. Inside: full-bleed MapLibre canvas centered on current `geom_lat/geom_lng` (fallback `37.75,-25.67`); a `Command` combobox **address search** pinned top (debounce ~300 ms, `AbortController` cancel, ≤10 suggestions, closest first); a **fixed center pin** (absolute over the canvas — move-the-map under the pin, the established mobile pattern; do NOT use a draggable `Marker` on touch); a "Usar a minha localização" button (`navigator.geolocation` + `LocateFixed`); and a primary **"Confirmar localização"** that `setValue("geom_lat"/"geom_lng")` and closes.
4. Selecting a suggestion flies the map and writes coordinates. **Reverse-geocode on `moveend`** to keep the address text in sync, but **only overwrite if the pin moved > ~50 m** (so tiny nudges don't flicker the address to a neighbouring street). Reverse-geocode failure is non-fatal.
5. **Build the search as a shadcn `Command` combobox** — do NOT import `@maplibre/maplibre-gl-geocoder`; its DOM/CSS fights the Tailwind reset and won't theme/i18n.

**Known bug to pre-empt:** a MapLibre map mounted in a Dialog/Drawer initializes at **0 height** — give the container an explicit height and call `map.resize()` after the open transition (or via `ResizeObserver`), or the picker ships blank. Keep it keyboard/screen-reader accessible (real combobox + the numeric fallback).

Both helpers degrade gracefully: a host with no internet/geocoder still types text and numbers.

---

## 8. Page-by-page redesign notes

### 8.1 Dashboard landing `/admin` — _currently blank_

- Add `routes/admin._index.tsx` = the **Today** dashboard (§5.2). No more blank pane.
- Add the top app bar / rail brand anchor (logo + property name).
- KPI/action tiles + quick actions + "View as guest" + first-run checklist.
- Per-tile skeleton/error states. Remove consent banner (§8.10). i18n pt/en/es.

### 8.2 Places list `/admin/places`

- Shell fork kills the overflow. `<table>` → `hidden md:table`; add `md:hidden` card list (name title + status/Pick/Hidden badges + Edit + kebab).
- Map enum → friendly localized status label (no raw `published`/`owner_approved`). Collapse the Pick "pill + two buttons" into one clear **switch**; rename the cryptic "Guests/Hide" to a labelled **visibility** control.
- Replace inline archive confirm (lines 329–351) with `AlertDialog`; archive lives in the kebab.
- Add search + status/locale filter chips (`ToggleGroup` exists) + total count; keep sortable headers (desktop). Bulk-select is a later nicety.
- `New Place`: sticky header on desktop, **FAB** on mobile (thumb zone). ≥44px targets. Skeleton/empty/error states.

### 8.3 Place create `/admin/places/new` & 8.4 Place edit `/admin/places/:id`

- Single-column sectioned **Cards**: Identidade · Localização · Estado e visibilidade · Contactos · Horário · Multimédia. Sticky bottom Save bar; drop the duplicate `Cancelar` (edit form has two).
- Refactor onto `form.tsx` (DRY error rendering); defined-border white inputs + focus ring; required markers; localized enum `<select>` (Rascunho/Em revisão/Publicado/Arquivado).
- **Locale tabs EN/PT/ES on `Tabs`** with the auto-translate helper (§7a); drop redundant "(EN)" suffixes; per-tab completeness badge.
- **Replace raw lat/lng with `LocationPicker`** (§7b).
- **Opening-hours redesign:** per-day Aberto/Fechado toggle, "Aberto 24h", "Copiar para todos os dias", larger stacked time controls on mobile; surface the hours rule inline (it's currently hidden behind the consent banner on desktop).
- Media dropzone: format/size hints + thumbnail preview; mobile copy "tocar para escolher da câmara/galeria".

### 8.5 Guesthouses list `/admin/guesthouses`

- Same shell + table→card reflow. **Demote `Slug`** out of the list (auto-generate; tuck into an advanced/collapsible section of the edit form). Replace with host-meaningful signal: **cover photo/avatar**, status, nº de quartos, last updated.
- De-dup the H1 against the active nav label; add count subtitle ("1 alojamento") + breadcrumb on drill-in. Each row/card gets a cover thumbnail (hospitality brand moment).
- First-run empty state → "Adicionar o seu primeiro alojamento". FAB on mobile.

### 8.6 Guesthouse form (new/edit)

- Same card/sticky-save/locale-tabs/LocationPicker treatment as places. **Replace the "Map picker deferred to Phase 2" placeholder with the live `LocationPicker`.** Native blue checkboxes (if any) → brand-styled switches.

### 8.7 Reservations `/admin/reservations`

- Table → **agenda card list** grouped by day (Hoje / Amanhã / Esta semana), sorted by upcoming check-in. Each card: guest name (title), `Check-in → Check-out` + "2 noites" helper, party-size chip, **status badge** (localize `confirmed`→Confirmada), and the link action.
- **Reframe `Token`** for non-technical hosts → "Acesso do hóspede" with a clear badge (Link activo / Link revogado) + explanatory line. Action wording outcome-based: "Enviar link ao hóspede" / "Revogar acesso", revoke behind an `AlertDialog`. **Fix the color/state mismatch** (green button must align with the state it acts on). Add property column/chip for multi-property hosts.
- Header count ("2 reservas") + search + date/status filters. Skeleton/empty/error states. Localize dates ("25 jun 2026").

### 8.8 Chat inbox `/admin/chat`

- Two-pane at `lg+`; **single-pane master→detail push on mobile** (list → tap → full-height thread → back). Strengthen pane borders.
- **Redesign the conversation row** around host data: colored-initials avatar, **guest display name** (bold primary), **property + last-message preview** (secondary), relative timestamp ("há 2 dias"), unread dot/bold. Replace opaque `aaa00001…` / `smoke-…` IDs entirely.
- **Real detail pane:** message bubbles (sender + timestamp), **sticky reply composer**, and **Quick Reply template chips** (wifi, check-in, recomendações) — the highest-leverage friction cut for this persona. Thread header shows guest + property + booking context.
- Search/filter bar; **unread-count badge on the Messages nav item**. Skeleton/empty/error states.

### 8.9 Owner profile `/admin/profile`

- Responsive shell; full-width single column on mobile.
- **Re-scope language tabs:** only translatable text (Bio) goes inside EN/PT/ES tabs; move language-invariant fields (Telefone, Email, Foto, Opções de contacto) into a shared "Comum a todos os idiomas" section. **Add the missing ES tab.** Default the tab to **Português** (PT host), not English.
- Auto-translate helper on Bio (§7a); char counter + placeholder prompt ("Apresente-se aos hóspedes em 2-3 frases…").
- Native blue checkboxes → brand-styled switches (≥44px); rename "WhatsApp (Cloud API)" jargon + one-line helper per contact option explaining what guests see.
- Avatar preview + mobile tap-to-upload copy. Loading skeleton (distinguish "failed to load" vs "new profile"); inline email/phone validation; save toast + dirty-state guard. Center at sensible max-width on desktop (stop wasting ~45%).

### 8.10 Beta metrics `/admin/beta`

- **Fix the broken loading pattern:** skeleton KPI tiles while fetching; explicit localized **ErrorState + Retry** on 500 (never infinite "Loading metrics…"); real empty state. Localize the hardcoded English "Loading metrics…". _(The backend 500 root cause — `bff` missing SELECT on `analytics` — is already fixed in **#159**; this item is the front-end degradation so any future fetch error never masquerades as infinite loading.)_
- Build the actual dashboard: responsive grid of branded KPI stat-cards (reservas, visualizações, conversão, mensagens) with trend deltas + date-range control.
- Page header + brand anchor + on-page H1 "Métricas beta" with a one-line plain-language description. Use this page as the **pilot** for the full token/skeleton/motion/i18n/light-dark stack.

### 8.11 Two scan-found cleanups (cross-cutting)

- **Kill the guest consent-banner overlap.** `ConsentBanner` mounts in `App.tsx` (line 85) as a sibling of `RouterProvider` (`fixed bottom-0 z-50`) so it overlays owner forms/Save on `/admin`. **Route-scope it out of `/admin`**: gate the render so it does not mount under `/admin/*` (owners are not anonymous guests). Preserve its intentional plain `<a href="/privacy">` (it sits outside router context on purpose — see the component comment). If owner-level telemetry consent is ever needed, give it its own dismissible, non-overlapping surface in Profile/Settings.
- **Kill the per-page `/v1/auth/refresh` 401 inside `/admin`.** `SessionBootstrap` (App.tsx, wraps all routes) calls the **guest** `refreshSession()` → `GET /v1/auth/refresh` on every hard load. The owner app authenticates via a **separate** OIDC manager (`ownerUserManager` in `routes/admin.tsx`) and has no guest `dt_refresh` cookie, so every fresh `/admin` load 401s. **Fix:** in `SessionBootstrap`, skip the guest refresh when `window.location.pathname.startsWith("/admin")` — mirroring its existing `/r/` skip — so the owner shell bootstraps only its own session and the spurious 401 disappears.

---

## 9. Phased implementation roadmap

> i18n is **pt/en/es from day one** on every string touched (no English leaks). Light/dark and motion ride along via the token overlay and existing machinery; they are not separate phases. **Subscription-blocking** = must ship for the paid subscription launch (this redesign's real driver). The **F&F beta runs on the current desktop backoffice** — it is owner-only and does not gate the guest beta — so nothing here blocks the beta except the two cheap **cleanups** (§8.11), which are pull-forward candidates for the beta window.

### Phase 0 — Foundation & the two cleanups (SUBSCRIPTION-BLOCKING, ~1 slice)

- Add the `[data-app="admin"]` token overlay to `globals.css` + new state-token utilities; set `data-app="admin"` on the admin root. Add `button.tsx` `touch`/`icon-touch` sizes; admin `h2/h3` → sans.
- **Cleanup 1:** route-scope `ConsentBanner` out of `/admin`.
- **Cleanup 2:** gate `SessionBootstrap` guest refresh off `/admin` (kill the 401).
- Build base primitives: `tabs`, `input/label/textarea/select`, `form`, `skeleton`, `loading-state`, `error-state`, `alert-dialog`, `tooltip`.

### Phase 1 — Responsive shell + states (SUBSCRIPTION-BLOCKING, highest impact)

- Rewrite `shell.tsx`: desktop rail (`hidden lg:flex`, grouped nav, icons, distinct active state, brand, account/theme/locale footer) + mobile top app bar + bottom tab bar (reuse `bottom-tab-bar.tsx` pattern) + `Sheet` "More" drawer. **This kills the 1301 px overflow.**
- Add `routes/admin._index.tsx` = **Today** dashboard (greeting, KPI/action tiles, quick actions, view-as-guest, first-run checklist) wired as the default admin child.
- Replace **all** bare `<p>` loading/error states with `LoadingState`/`ErrorState`; extend `EmptyState` to every list. **Fix `/admin/beta`** loading-vs-error.

### Phase 2 — List reflow + plain language (SUBSCRIPTION-BLOCKING)

- Table → card reflow for places, guesthouses, reservations (`hidden md:table` + `md:hidden` card list + kebab menu). Reservations → agenda-by-day.
- Localize all enums/jargon (status labels, `Token`→Acesso, demote `Slug`, `confirmed`→Confirmada, localized dates). `AlertDialog` for archive/revoke. Optimistic toggles + success toasts. FAB/sticky create on mobile. Count + filter chips.

### Phase 3 — Form excellence + Helper A (translation) (beta-desirable)

- Refactor place/guesthouse/profile forms onto `form.tsx`: sectioned Cards, sticky save bar, required markers, inline validation, ≥44px controls, media preview, opening-hours redesign, profile tab re-scoping + PT default.
- **Data model: add `es`.** Build `POST /v1/admin/translate` (Claude, PT-PT pré-AO, do-not-translate list). Ship `TranslatableField`/`useFieldTranslation` with EN/PT/ES `Tabs`, per-field + bulk translate, suggest-not-overwrite, out-of-sync state.

### Phase 4 — Chat experience (beta-desirable)

- Chat master→detail push on mobile; real conversation rows (avatar/name/property/preview/unread); message bubbles + sticky composer + **Quick Reply templates**; unread nav badge; search/filter.

### Phase 5 — Helper B (map picker) + polish (post-beta)

- BFF geocoder proxy (Photon or commercial); `LocationPicker` (Drawer/Dialog, fixed-center pin, `Command` address search, current-location, 50 m reverse-geocode threshold, `map.resize()` fix); collapse raw lat/lng; replace the "deferred to Phase 2" placeholder.
- Beta metrics real dashboard (KPI cards + trends + date range). Calm `motion` micro-interactions (drawer/sheet/tab/FAB/page) honouring reduced-motion. Theme toggle in the top bar/rail. Bulk-select, command-palette jump-to.

### Testing & known gotchas

- PWA vitest navigation tests fail locally (undici AbortSignal) but pass in CI — don't chase them while reworking the shell; rely on CI + the existing `playwright.owner.config.ts`.
- Do not run `npx shadcn add …` (this repo hand-rolls over `radix-ui`). Do not edit `tokens.css`. Don't `overflow-x-auto` tables. Keep `useLayoutMode`'s mobile-default SSR behaviour.

---

## Appendix — grounding (verified files)

- Shell defect: `apps/pwa/src/features/backoffice/shell.tsx` (`w-56 shrink-0`).
- Overflow source: `apps/pwa/src/features/backoffice/places/place-list.tsx` (6-col `<table>`, bare `<p>` states, inline archive confirm).
- Blank index: `apps/pwa/src/routes/admin.tsx` (`<Outlet>` with no index child) + `App.tsx` admin `children`.
- Consent leak: `apps/pwa/src/components/consent-banner.tsx` + `App.tsx` line 85 (`fixed bottom-0 z-50` sibling of RouterProvider).
- 401 source: `apps/pwa/src/components/session-bootstrap.tsx` → `apps/pwa/src/lib/auth/refresh.ts` (`/v1/auth/refresh`), vs owner OIDC in `routes/admin.tsx` (`ownerUserManager`).
- Tokens: `apps/pwa/src/styles/tokens.css` (do-not-edit) + `apps/pwa/src/styles/globals.css` (semantic-var mapping; overlay goes here).
- Reusable primitives: `components/ui/sheet.tsx`, `components/bottom-tab-bar.tsx`, `components/empty-state.tsx`, `lib/responsive/use-layout-mode.ts` + `breakpoints.ts`, `lib/map/init.ts` + `style.ts`, `sonner` Toaster (App.tsx).
- Form/helper targets: `place-form.tsx` & `guesthouse-form.tsx` (`TABS = ["en","pt-PT"]`, raw `type="number"` lat/lng `37.75/-25.67`, "Map picker deferred to Phase 2").
