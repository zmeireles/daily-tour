# @daily-tour/pwa

Daily Tour Progressive Web App — guest-facing shell.

> Phase 0 scaffold: empty app rendering "Hello, Daily Tour". Real routes,
> i18n, MapLibre, stores, and Stitch tokens land in subsequent slices.

## Stack

- Vite 6.4 + React 19 + TypeScript 5.6
- Tailwind CSS v4 (CSS-first `@theme` config in [`src/styles/globals.css`](./src/styles/globals.css))
- shadcn/ui (`@/components/ui/*` — `Button` + `Card` for smoke tests)
- vite-plugin-pwa 0.21 + Workbox 7 (minimal manifest stub; T-1.7.1 expands)
- Vitest 2 + React Testing Library + jsdom (unit + component tests)
- Playwright 1.49 (Chromium e2e against `pnpm preview`)
- ESLint flat config (re-export of [`@daily-tour/shared-config/eslint/react`](../../packages/shared-config/eslint.react.js))

## Layout

```
apps/pwa
├─ index.html              # Vite entry HTML, links manifest + theme-color
├─ public/                 # static assets served at /
│  └─ manifest.webmanifest # PWA manifest stub (icons TBD in T-0.4.1)
├─ src/
│  ├─ main.tsx             # React 19 root
│  ├─ App.tsx              # smoke shell — renders shadcn Button + Card
│  ├─ styles/globals.css   # Tailwind v4 + empty @theme + shadcn CSS vars
│  ├─ components/ui/       # shadcn primitives
│  ├─ lib/utils.ts         # cn() helper (clsx + tailwind-merge)
│  └─ __tests__/           # vitest + RTL setup + smoke tests
└─ e2e/                    # Playwright tests (run against pnpm preview)
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Vite dev server on `:5173` |
| `pnpm build` | `tsc --noEmit` then `vite build` |
| `pnpm preview` | Vite preview on `:5174` (used by Playwright) |
| `pnpm test` | Run vitest once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright e2e (auto-starts `pnpm preview`) |
| `pnpm test:e2e:ui` | Playwright UI mode for debugging |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint flat config |
| `pnpm clean` | Wipe `dist`, `dev-dist`, `node_modules`, `.turbo`, coverage, Playwright reports |

## Running e2e locally

```bash
pnpm install
pnpm --filter @daily-tour/pwa exec playwright install --with-deps chromium
pnpm --filter @daily-tour/pwa test:e2e
```

Playwright spawns its own preview server, so no separate dev server is required.

## What is intentionally NOT here yet

| Concern | Lands in |
|---|---|
| Stitch design tokens (palette, typography) | T-0.4.1 |
| Routes (`react-router` data mode) | T-1.0.3 + Phase 1 routes |
| Zustand stores | Phase 1 |
| TanStack Query providers + loaders | Phase 1 |
| i18n bootstrap (`react-i18next`) | T-1.7.0 |
| MapLibre place map | T-1.3.1 |
| Real PWA install + offline shell | T-1.7.1 |
| App icons + real `theme-color` | T-0.4.1 |
| CI deploy to QA VPS | T-0.4.4 |

See [`docs/implementation-plans/001-roadmap/`](../../docs/implementation-plans/001-roadmap/) for full plan.
