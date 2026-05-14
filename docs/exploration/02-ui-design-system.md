# 02 — UI & Design System

> Visual identity, tokens, components, motion and theming for the São Miguel guesthouse PWA. Editorial-modern, not tourism-brochure. Phone-first, dark-aware, multilingual.

## 1. Visual Identity — "Green Island, Volcanic Bones"

São Miguel is hydrangeas in summer, basalt walls year-round, two lakes (Lagoa Azul + Verde), tea plantations in Gorreana, and steam rising off Furnas. The palette nods to these without becoming a postcard. **Primary brand mark: a deep tea-leaf green; accent: hydrangea blue; danger reserved for true alerts (lava-warm coral).**

### Light palette

```text
--basalt-950:    #0E1413   /* near-black, volcanic */
--basalt-700:    #2A332F
--basalt-500:    #4B5650
--basalt-300:    #97A29B
--cream-50:      #F7F4EC   /* background, lime-washed wall */
--cream-100:     #EFEAD8
--tea-600:       #2F5D43   /* primary — Gorreana tea */
--tea-500:       #3E7A57
--tea-300:       #8FB89C
--hydrangea-600: #5B6FB8   /* accent — blue hydrangea */
--hydrangea-400: #8A9AD6
--lake-500:      #2E8C8A   /* teal — Lagoa Azul */
--coral-600:     #C6553E   /* destructive only */
--sun-400:       #E6B566   /* warning, also "daily tour" highlight */
```

### Dark palette

```text
--bg-950:        #0B1110   /* canvas */
--bg-900:        #11181A
--surface-800:   #1A2322
--surface-700:   #24302E
--tea-400:       #5FA37B   /* primary on dark */
--hydrangea-300: #A6B4E3
--lake-300:      #6EC0BE
--cream-100:     #EAE4D2   /* foreground */
--coral-400:     #E07A65
```

Contrast: tea-600 on cream-50 = 7.2:1; cream-100 on bg-950 = 13:1. Both AAA for body, AA-Large for UI chrome.

## 2. Tailwind Token Strategy

**Recommendation: Tailwind v4 with `@theme` block + CSS custom properties** — no `tailwind.config.ts`. v4's CSS-first model is stable, integrates directly with shadcn/ui's CSS-variable theming, and gives us free runtime theme swaps (dark, sunrise auto-switch) without a JS rebuild.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: var(--cream-50);
  --color-foreground: var(--basalt-950);
  --color-primary: var(--tea-600);
  --color-primary-foreground: var(--cream-50);
  --color-accent: var(--hydrangea-600);
  --color-muted: var(--cream-100);
  --color-muted-foreground: var(--basalt-500);
  --color-destructive: var(--coral-600);
  --color-ring: var(--tea-500);

  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;   /* default for Card, Button */
  --radius-lg: 1rem;       /* Sheet, large media */
  --radius-full: 9999px;

  --font-display: "Fraunces", Georgia, serif;
  --font-sans: "Inter", system-ui, sans-serif;

  --text-xs: 0.75rem;   --text-sm: 0.875rem;
  --text-base: 1rem;    --text-lg: 1.125rem;
  --text-xl: 1.375rem;  --text-2xl: 1.75rem;
  --text-3xl: 2.25rem;  --text-display: 3rem;

  --ease-out-soft: cubic-bezier(.2,.7,.2,1);
  --ease-in-soft:  cubic-bezier(.5,0,.8,.3);
  --duration-fast: 150ms;
  --duration-base: 240ms;
  --duration-slow: 420ms;
}

[data-theme="dark"] {
  --color-background: var(--bg-950);
  --color-foreground: var(--cream-100);
  --color-primary: var(--tea-400);
  /* … */
}
```

Tokens follow shadcn's `--color-{role}` naming so generators drop in clean. Spacing stays on Tailwind's default 0.25rem scale — no overrides.

## 3. Typography — Fraunces + Inter

- **Display: Fraunces** (Google Fonts, variable). Soft serif with optical sizing, gentle warmth, full Latin-Extended-A — covers pt-PT (ã, õ, ç), fr (œ, ï), es (ñ), de (ä, ö, ü, ß). Use for hero, place names, daily-tour title.
- **Body: Inter** (variable). The most battle-tested multilingual sans on the web; tight, neutral, handles German compounds (`Frühstücksbuffet`) without word-break gymnastics.

Both load via `font-display: swap` with preconnect to `fonts.gstatic.com`. Locale strings frequently expand 30% from English to German — body sizes lean on `text-balance` for headings and `text-wrap: pretty` for paragraphs; line-height stays at 1.55 for body, 1.15 for display.

## 4. shadcn/ui Inventory

**v1 critical** (ship blocker):
`Button`, `Card`, `Sheet` (right-side filters), `Drawer` (mobile bottom — place details preview), `Dialog`, `Tabs`, `Badge`, `Avatar`, `Input`, `Textarea`, `Form` + `Label`, `Select`, `Slider` (distance), `Switch`, `ToggleGroup` (location toggle), `Skeleton`, `Sonner` (toasts), `Tooltip`, `DropdownMenu`, `ScrollArea`, `Separator`, `Alert`.

**v1.1 (chat + AI tour)**:
`Command` (place search), `Popover`, `HoverCard`, `Progress` (agent thinking), `Carousel` (place gallery — embla), `Accordion` (wish groups), `Collapsible`.

**Later**:
`Calendar` (only if check-in/out becomes user-editable), `ContextMenu`, `Menubar`, `NavigationMenu` (desktop only), `Resizable`, `Pagination`. Skip `Table` — this product has zero tabular surfaces.

## 5. Custom Patterns

All compose existing shadcn primitives — no reinvention.

### `PlaceCard`
Image-led (16:9, `object-cover`, low-bandwidth `srcset`), title in Fraunces 1.125rem, distance pill top-left (`Badge variant="secondary"`), reputation stars inline. Action chips at bottom render as horizontally-scrollable `Badge` row (`overflow-x-auto snap-x`). Tap target ≥56px on mobile.

### `ActionGroupHeader`
Section header for top-level interests ("Eat", "Hike", "Swim"). Left: icon + label in Fraunces 1.375rem. Right: `→ Explore` link as ghost Button with `chevron-right` rotating 90° on hover. Drill-down affordance is the *whole row* on touch.

### `DailyTourTimeline`
Vertical timeline; each stop = sticky time gutter (left, 64px, `tabular-nums`) + connector line in `--tea-300` + content card. Meals get `--sun-400` dot; activities get `--tea-500`; transit segments are dashed `--basalt-300`. Reorder via drag on desktop; long-press on mobile.

### `ChatBubble`
Two variants (`me` / `them`). `them` shows a 16px channel badge (WhatsApp green check, Telegram paper plane, in-app dot) at bubble corner — same shape regardless of source, only the icon swaps. Bubbles use `rounded-2xl` with one corner squared toward the avatar. Realtime "typing" uses three dots animated at `--duration-slow` with `prefers-reduced-motion` fallback to a static `…`.

### `RangeSlider`
shadcn `Slider` wrapped with a label that swaps unit by locale (`km` for EU, fallback also `km` — no imperial; tourists here use metric). Value renders above the thumb in `tabular-nums`, debounced 250ms before triggering refetch.

### `LocationToggle`
Two-state `ToggleGroup`: `📍 Me` ⇄ `🏠 Guesthouse`. Disabled side dims to `--basalt-300` when geolocation permission denied. Switching animates the active pill with `motion`'s `layoutId`.

### `MapPin`
Custom SVG marker — basalt-black teardrop with tea-green inner dot, white halo for cluster context. Selected state: scales 1.15 + adds `--hydrangea-400` outer ring.

### `VoiceInputButton`
FAB-sized (56px), `--tea-600` resting. Recording: morphs to a pulsing ring (`--coral-600` at 60% opacity, 1.4s breath cycle), waveform bars inside. Permission-denied state: muted icon + Tooltip.

## 6. Motion Language

Use `motion` (framer-motion) sparingly — motion is seasoning, not the meal.

- **Page transitions**: 240ms cross-fade + 8px slide-up on route change. AnimatePresence at the route layer.
- **List reveal**: stagger children 30ms, fade + 4px y-translate. Cap at 8 items animated; rest snap.
- **Drill-down**: shared `layoutId` between `ActionGroupHeader` and the focused page title.
- **Sheet/Drawer**: 320ms `--ease-out-soft`.
- **Micro-feedback** (button press, toggle): 150ms scale 0.97.

Durations live in tokens so we tune globally. **Always respect `prefers-reduced-motion: reduce`** — disable transforms, keep opacity changes ≤120ms, kill stagger.

## 7. Theming

**Light/dark via `data-theme` on `<html>`**, three modes: `light`, `dark`, `auto`. `auto` resolution order:

1. If user has explicit pref in localStorage → use it.
2. Else compute sunrise/sunset for **São Miguel (37.74°N, 25.67°W)** using `suncalc` (1KB) keyed off device date — *not* device location (tourists from Berlin still want island-time dark mode while on the island).
3. Fallback to `prefers-color-scheme`.

Re-evaluate at app focus and every 30 minutes. Crossfade theme swap over 200ms to avoid jarring flash.

## 8. Responsive Strategy

Phone-first, four breakpoints:

```text
sm  640px   large phones / small tablets portrait
md  768px   tablets
lg  1024px  desktop
xl  1280px  wide desktop (rare, gracefully scales)
```

- **Container queries** (Tailwind v4 native `@container`) on `PlaceCard` and `ChatBubble` — they live in sidebars on desktop and full-width on mobile; sizing should follow the parent, not the viewport.
- Sheets/Drawers: bottom drawer on `< md`, right sheet on `≥ md`.
- Daily Tour: single column < lg, two-column (timeline + map) ≥ lg.
- Touch targets ≥44px everywhere; ≥56px for primary actions.
- Safe-area insets honoured for iOS PWA (`env(safe-area-inset-*)`).

## 9. Stitch MCP Integration

Stitch slots in at **Phase 1, week 1**, *before* any component code lands. Workflow:

1. Feed Stitch the palette + typography + brand brief above to generate the first round of mood frames and a few key screens (Home, Place Detail, Daily Tour, Chat).
2. Export Stitch's design tokens → reconcile against the `@theme` block above; Stitch is the source for *visual* tokens, this doc is the source for *structural* tokens (radius, motion, breakpoints).
3. Stitch-generated screens become reference comps in `/docs/design/` — Storybook stories track parity.
4. Re-run Stitch only for net-new surfaces (e.g., owner profile page in v1.1), never for token churn — token edits go through this file + a PR.

Stitch is upstream of shadcn install commands: palette locked → `@theme` written → `shadcn add` for the v1-critical list above → custom patterns built on top.
