---
name: São Miguel Editorial
colors:
  surface: "#0f1514"
  surface-dim: "#0f1514"
  surface-bright: "#343a39"
  surface-container-lowest: "#090f0e"
  surface-container-low: "#171d1c"
  surface-container: "#1b2120"
  surface-container-high: "#252b2a"
  surface-container-highest: "#303635"
  on-surface: "#dee4e2"
  on-surface-variant: "#c1c9c0"
  outline: "#8b938b"
  outline-variant: "#414943"
  primary: "#a0d2b1" # tea-green, lifted for dark surfaces
  on-primary: "#053821"
  primary-container: "#2f5d43" # tea-600 brand anchor
  on-primary-container: "#a2d4b3"
  secondary: "#c9c6bf"
  tertiary: "#b6c4ff" # hydrangea-blue accent, lifted for dark
  tertiary-container: "#3b5097"
  error: "#ffb4ab"
  error-container: "#93000a"
  background: "#0f1514"
  on-background: "#dee4e2"
typography:
  display-lg:
    {
      fontFamily: Newsreader,
      fontSize: 48px,
      fontWeight: "600",
      lineHeight: "1.1",
      letterSpacing: -0.02em,
    }
  headline-lg: { fontFamily: Newsreader, fontSize: 32px, fontWeight: "500", lineHeight: "1.2" }
  headline-lg-mobile:
    { fontFamily: Newsreader, fontSize: 28px, fontWeight: "500", lineHeight: "1.2" }
  headline-md: { fontFamily: Newsreader, fontSize: 24px, fontWeight: "500", lineHeight: "1.3" }
  body-lg: { fontFamily: Inter, fontSize: 18px, fontWeight: "400", lineHeight: "1.6" }
  body-md: { fontFamily: Inter, fontSize: 16px, fontWeight: "400", lineHeight: "1.5" }
  label-md:
    {
      fontFamily: Inter,
      fontSize: 14px,
      fontWeight: "600",
      lineHeight: "1.2",
      letterSpacing: 0.05em,
    }
  label-sm: { fontFamily: Inter, fontSize: 12px, fontWeight: "500", lineHeight: "1.2" }
rounded: { sm: 0.25rem, DEFAULT: 0.5rem, md: 0.75rem, lg: 1rem, xl: 1.5rem, full: 9999px }
spacing: { unit: 4px, gutter: 1.5rem, margin-mobile: 1rem, margin-desktop: 2.5rem, grid-gap: 1rem }
override:
  neutral: "#0e1413" # basalt-950
  primary: "#2f5d43" # tea-600
  secondary: "#f7f4ec" # cream-50
  tertiary: "#5b6fb8" # hydrangea-600
---

# Design System: São Miguel Editorial

> **Stitch-facing design system** for the Daily Tour São Miguel PWA. This is the
> machine-readable system used to generate the mockups in `docs/design/stitch/`
> via the Stitch project `Daily Tour — São Miguel PWA` (`projects/11661203433672958283`,
> design system asset `8a6674ad896243c8881fc985aee6f504`). It is **derived from**
> the source-of-truth visual identity in
> [`docs/exploration/02-ui-design-system.md`](../exploration/02-ui-design-system.md)
> and the shipped tokens in [`apps/pwa/src/styles/tokens.css`](../../apps/pwa/src/styles/tokens.css).
>
> **Direction (chosen 2026-06-15):** evolve the "Green Island, Volcanic Bones"
> system toward **premium / editorial** — "travel magazine, not booking app".
>
> **Reconciliation note:** this Stitch system uses **Newsreader** for display/headline
> where the shipped app uses **Fraunces**. Both are distinctive high-contrast editorial
> serifs; the mockups are a directional guide, and the implementation pass (T-2.B.0
> sibling "reconcile palette + typography") should standardise on **Fraunces** to match code.

## 1. Visual Theme & Atmosphere

A high-end, **Modern Editorial / Field Journal** experience centred on the lush,
volcanic landscape of São Miguel. The aesthetic merges the grit of basalt stone
with the organic softness of botanical tea leaves — sophisticated, curated, immersive.
Dark-first, with high-contrast surfaces, intentional whitespace (even in dark mode),
and structured grids interrupted by fluid horizontal movement. The emotional response:
**calm exploration and reliable expertise.** Density balanced (~4–5), variance offset
(~6, asymmetric), motion fluid (~6).

## 2. Color Palette & Roles

Rooted in the natural environment of the Azores. Dark canvas; cream surfaces provide
"paper-on-stone" lift via contrast, not shadow.

- **Basalt-950** (`#0E1413`) — foundational canvas / Level 0 background (near-black, green-tinted volcanic charcoal). Never pure black.
- **Tea-leaf Green** (`#2F5D43`, lifted `#A0D2B1` on dark) — primary: iconography, active states, primary CTAs, place titles on cream cards. Organic, never neon.
- **Cream-50** (`#F7F4EC`) — high-elevation editorial card surface; the "paper-on-stone" content plane for long-form readability.
- **Hydrangea Blue** (`#5B6FB8`) — single functional accent: category chips, distance chips, notification dots, subtle links. Used sparingly.
- **Lake Teal** (`#2E8C8A`) — secondary accent, used rarely (water/map motifs).
- **Sun Amber** (`#E6B566`) — warning, and the "Daily Tour" highlight (travel-time connectors, itinerary overline).
- **Lava Coral** (`#C6553E`) — destructive only.

Contrast: tea-600 on cream-50 = 7.2:1; cream-100 on bg-950 = 13:1 (AAA body).

## 3. Typography Rules

- **Display / Headlines:** Newsreader (→ **Fraunces** in code) — track-tight, weight-driven hierarchy, editorial elegance at large scale. Not screaming.
- **Body:** Inter — relaxed leading (1.5–1.6), max ~65 characters per line, neutral secondary colour. Kept deliberately for its broad multilingual coverage (pt-PT ships now; de/es/fr staged).
- **Labels / Overlines:** Inter, uppercase, `0.05em` tracking — magazine-style structured hierarchy for category tags and section overlines.

## 4. Component Stylings

- **Editorial Cards:** Cream-50 surfaces, `rounded-lg` (1rem). Titles in tea-green, body in basalt. No drop shadow — contrast against the dark canvas provides the lift.
- **Primary Buttons:** Solid tea-green, cream text, `rounded-md`. No shadow; subtle scale-down on press.
- **Ghost Buttons:** Transparent, 1px tea-green border — secondary actions ("View Map", "Website").
- **Chips & Tags:** Hydrangea-blue for category/distance/"special" tags; `label-sm` text.
- **Lists:** Clean, borderless, 1px basalt dividers; tea-green leading icons.
- **Input Fields:** Basalt-tinted fill, 1px subtle border; focus = tea-green border + soft inner glow.
- **Horizontal "Peek" Ribbons:** Smooth `overflow-x` scroll, next card partially visible to signal scrollability; no visible scrollbar on mobile.
- **Loaders:** Skeletal shimmer matching layout dimensions — never circular spinners.

## 5. Layout Principles

12-column grid (desktop) / flexible 2- or 1-column (mobile). Featured content in
asymmetric modules, not 3-equal-card rows. Horizontal ribbons for secondary discovery.
Generous safe-area margins (24px tablet/desktop) to protect the editorial feel.
Full-height sections use `min-h-[100dvh]`. Single-column collapse below 768px; no
horizontal overflow on mobile.

## 6. Elevation & Depth

Tonal layering over heavy shadows. Level 0 = basalt-950; Level 1 = surface-tinted
basalt for inputs/secondary containers; high elevation = cream-50 cards (lift via
contrast). Modals: 40% blur on a dark backdrop to keep environmental context.

## 7. Motion & Interaction

Spring physics (`stiffness 100, damping 20`) — no linear easing. Staggered cascade
reveals for lists. Perpetual, restrained micro-loops on active elements. Animate
`transform`/`opacity` only; honour `prefers-reduced-motion`. Tokens: `--ease-out-soft`
cubic-bezier(.2,.7,.2,1), durations 150/240/420ms.

## 8. Anti-Patterns (Banned)

No emojis. No pure black (`#000000`). No neon / outer-glow shadows. No oversaturated
accents. No 3-column equal-card feature rows. No centered hero sections. No fabricated
metrics or statistics (uptime %, response times, "by the numbers" cards). No
`LABEL // YEAR` typography. No AI copywriting clichés ("Elevate", "Seamless", "Unleash").
No filler UI ("Scroll to explore", bouncing chevrons). No generic placeholder names —
use real São Miguel places (Lagoa do Fogo, Sete Cidades, Furnas, Gorreana, Terra Nostra).
