# Brand mark — Daily Tour

The Daily Tour mark is a **map pin carrying a tea leaf** (T-2.B.1).

## Rationale

- **Location-agnostic.** A pin marks _any_ place on the island. We deliberately avoided
  depicting a single landmark (e.g. the Sete Cidades twin lakes) — Daily Tour covers the
  whole of São Miguel and shouldn't privilege one spot over the others.
- **Carries the island identity.** The leaf inside the pin is a **Gorreana tea leaf**
  (Europe's oldest tea plantation, on São Miguel) — the "Green Island" half of the
  "Green Island, Volcanic Bones" system.
- **Evolution, not replacement.** It refines the original placeholder (pin + leaf) rather
  than introducing an unrelated mark.

## Specification

- **Source of truth:** [`apps/pwa/public/logo.svg`](../../apps/pwa/public/logo.svg)
  (64×64 viewBox).
- **Colours:** cream canvas `#F7F4EC` (= manifest `background_color`), tea-green pin
  `#2F5D43` (= `theme_color`), cream leaf with tea-green spine + lateral veins.
- **Wordmark lockup:** the mark + **"Daily Tour"** in **Fraunces** (display serif) with a
  tracked **"SÃO MIGUEL"** overline in Inter.

## Icon set

The PWA icon set is generated from `logo.svg` by `@vite-pwa/assets-generator`
(`minimal-2023` preset; config at `apps/pwa/pwa-assets.config.ts`):
`pwa-64x64`, `pwa-192x192`, `pwa-512x512`, `maskable-icon-512x512`,
`apple-touch-icon-180x180`, `favicon.ico`.

**To regenerate after editing `logo.svg`:**

```sh
cd apps/pwa && pnpm exec pwa-assets-generator
```
