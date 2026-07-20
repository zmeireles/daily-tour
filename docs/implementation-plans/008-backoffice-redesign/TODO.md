# Plan-008 — Owner Backoffice Redesign — TODO

Status: **CODE-COMPLETE** — **all 6 slices (0–5) DONE**, every merge Fable-gated. Slice 5 (map picker + polish) landed 2026-07-11, main `4f62245` (PRs #355–#358). **Deploy state**: Slices 0–2 + 4 on qual (main `12cc6d5`); **Slice 3 deployed to qual 2026-07-09** (main `4c2c4d7`, browser-UAT 9/9, guest app not regressed); **Slice 5 deployed to qual 2026-07-11** (`4f62245`, guest-regression 9/9). **Slice-5 follow-ups (#363 blank-coord guard · #364 real inbound-only messages KPI + exclude cancelled) + Geoapify go-live DEPLOYED 2026-07-20** (main `b88541d`, run `29733412603`) — **map picker LIVE**. **Owner-feature UAT DONE** — Slices 3–5 **25/25** (2026-07-11) + live geocode picker **7/7** (2026-07-20). Full detail + acceptance criteria in [`EXECUTION.md`](./EXECUTION.md) + [`README.md`](./README.md). Design source of truth: [`docs/design/backoffice-redesign/proposal-001.md`](../../design/backoffice-redesign/proposal-001.md). Task IDs `T-8.<phase>.<task>` (middle digit = proposal phase 0–5).

## Priority tier

**Subscription-launch work, NOT the F&F beta.** The beta runs on the current desktop backoffice (owner-only; does not gate the guest beta). Only the two §8.11 cleanups (T-8.0.3, T-8.0.4) are beta-window pull-forward candidates. Slices 0–2 = subscription-blocking; Slices 3–4 = beta-desirable; Slice 5 = post-beta polish.

## Locked decisions

Denser Inter-forward console look (brand green + warmth as accents) · 5-item bottom tab bar (Today/Reservations/Messages/Places/More) · helpers phased (translate Slice 3, map picker Slice 5) · geocoder Photon-vs-commercial **TBD in T-8.5.1** · **i18n pt/en/es from day one** · light/dark + motion ride the `[data-app="admin"]` overlay (not separate phases).

## Gotchas

No `npx shadcn add` (hand-roll over `radix-ui`) · never edit `styles/tokens.css` (overlay in `globals.css` only) · no `overflow-x-auto` on tables (use `hidden md:table` + `md:hidden` card list) · keep `useLayoutMode` mobile SSR default · MapLibre-in-Dialog needs explicit height + `map.resize()` · PWA vitest nav tests fail locally (undici) but pass in CI — rely on CI + `playwright.owner.config.ts`.

## Progress

| Slice | Title                              | Priority              | Size | Status                        |
| ----- | ---------------------------------- | --------------------- | ---- | ----------------------------- |
| 0     | Foundation & two cleanups          | subscription-blocking | M    | ☑ 2026-07-03 (#325 #326 #327) |
| 1     | Responsive shell + states          | subscription-blocking | L    | ☑ 2026-07-05 (#331–#335)      |
| 2     | List reflow + plain language       | subscription-blocking | L    | ☑ 2026-07-05 (#337–#341)      |
| 3     | Form excellence + translate helper | beta-desirable        | L    | ☑ 2026-07-06 (#347–#352)      |
| 4     | Chat experience                    | beta-desirable        | M    | ☑ 2026-07-06 (#345)           |
| 5     | Map picker + polish                | post-beta             | M    | ☑ 2026-07-11 (#355–#358)      |

---

## Slice 0 — Foundation & the two cleanups · subscription-blocking · deps: none

- [x] **T-8.0.1** — `[data-app="admin"]` token overlay in `globals.css` (light+dark ladder, STATE tokens via `@theme inline`, `--shadow-card`, `--nav-active-*`); set `data-app="admin"` on admin root; admin `h2/h3`→sans, keep `h1` serif. _(§2, §2.1–2.6)_ — **AC:** cooler paper-white ladder on `/admin`; `bg-success`/`text-warning`/`bg-info` utilities resolve; dark mode rides the overlay; `tokens.css` NOT edited.
- [x] **T-8.0.2** — `button.tsx` `touch` (`min-h-11`) + `icon-touch` (`h-11 w-11`) sizes; do not enlarge existing. _(§3.3)_ — **AC:** new variants render ≥44 px; desktop `default`/`sm` unchanged.
- [x] **T-8.0.3** — **Cleanup 1 (beta pull-forward candidate):** route-scope `ConsentBanner` out of `/admin/*`; preserve the plain `<a href="/privacy">`. _(§8.11)_ — **AC:** banner never renders under `/admin/*`; still on guest routes; Save never overlapped.
- [x] **T-8.0.4** — **Cleanup 2 (beta pull-forward candidate):** gate `SessionBootstrap` guest refresh off `/admin` (`pathname.startsWith("/admin")`, mirror the `/r/` skip). _(§8.11)_ — **AC:** hard `/admin` load = zero `/v1/auth/refresh` 401s; guest routes + owner OIDC unaffected.
- [x] **T-8.0.5** — Base primitives (hand-rolled over `radix-ui`, **no `npx shadcn add`**): `tabs`, `input`, `label`, `textarea`, `select`, `form` (RHF+zod), `skeleton`, `loading-state`, `error-state`, `alert-dialog`, `tooltip`. _(§3.1–3.2, §6.1–6.3)_ — **AC:** cva+`cn()`+semantic vars match `sheet.tsx`; fields have defined borders + ≥44 px mobile height; `loading-state` has `cards`/`table`/`tiles`/`thread`; `error-state` has Retry→`refetch`.

## Slice 1 — Responsive shell + first-class states · subscription-blocking · deps: Slice 0

- [x] **T-8.1.1** — Rewrite `shell.tsx`: desktop rail (`hidden lg:flex`, grouped nav + icons + count badges + `--nav-active-*`, brand, account/theme/locale footer) + mobile top app bar (`top-app-bar.tsx` + `Sheet` drawer) + 5-item bottom tab bar (Today/Reservations/Messages/Places/More). **Kills the 1301 px overflow.** _(§3.4, §4.1, §5.1)_ — **AC:** no horizontal overflow at 390 px; rail only ≥`lg`; bottom tabs only <`lg`; nav-active ≠ `--primary`; count-badge slots on Reservations+Messages.
- [x] **T-8.1.2** — `routes/admin._index.tsx` = **Today** dashboard (greeting, `StatTile`s → filtered lists, quick actions, view-as-guest, first-run checklist), wired as default admin child; promote `beta-dashboard.tsx` scaffold. _(§5.2, §8.1)_ — **AC:** `/admin` not blank; tiles tap through; each tile skeleton-on-load + inline error+retry; first-run checklist only when setup incomplete.
- [x] **T-8.1.3** — Replace all bare `<p>` loading/error states with `LoadingState`/`ErrorState` (place-list, reservation-list, chat-inbox, profile, guesthouse-list, beta-dashboard); extend `EmptyState` to every list. _(§6.1–6.3)_ — **AC:** no bare `<p>` states; skeletons shaped like result; errors have Retry→`refetch`; every list has an empty state; copy pt/en/es.
- [x] **T-8.1.4** — Fix `/admin/beta` loading-vs-error (skeleton vs `ErrorState`+Retry; localize "Loading metrics…"). **Backend 500 already fixed in #159 — this is FE-only.** _(§6.3, §8.10)_ — **AC:** fetch error → `ErrorState`+Retry not infinite loading; string localized; page is the overlay/state pilot.

## Slice 2 — List reflow + plain language · subscription-blocking · deps: Slices 0,1

- [x] **T-8.2.1** — Places list table→card reflow (`hidden md:table` + `md:hidden` card list + kebab); FAB mobile / sticky create desktop; search + status/locale filter chips + count. **No `overflow-x-auto`.** _(§4.2, §8.2)_ — **AC:** no table <`md`; card = name + status/Pick/Hidden badges + Edit + kebab; FAB ≥44 px; filters+count render.
- [x] **T-8.2.2** — Guesthouses list reflow with cover photo/avatar + status + nº de quartos + last updated; **demote `Slug`** out of list (into advanced collapsible on the form); FAB + first-run empty. _(§8.5)_ — **AC:** no `Slug` column; cover thumbnail per row; count subtitle; FAB. ⚠️ **`status` + `nº de quartos` DESCOPED** — no backing field in `GuesthouseRow`/`catalog.guesthouse`; card ships cover-thumbnail + last-updated (both real). Backend follow-up (migration + catalog-svc + shared-types) needed before those two can honestly render.
- [x] **T-8.2.3** — Reservations → **agenda card list by day** (Hoje/Amanhã/Esta semana); guest name + check-in→check-out + "N noites" + party-size chip + status badge; **`Token`→"Acesso do hóspede"** (Link activo/revogado badge); outcome-based actions; fix green-button/state mismatch; property chip; localized dates. _(§8.7)_ — **AC:** grouped by day; no raw "Token"/enum; action color matches state; dates localized.
- [x] **T-8.2.4** — Localize all enums/jargon to pt/en/es friendly labels from a **single status→color source** (§2.1 table), consumed by every `Badge`. _(§2.1, principle 4)_ — **AC:** no raw enum renders; one badge/label map drives all lists + dashboard.
- [x] **T-8.2.5** — `AlertDialog` for archive/revoke (replace inline confirm); optimistic Pick + visibility toggles (cache update + rollback + `toast.error`); success toast per mutation; copy-to-clipboard + toast on issue-link. _(§6.4, §8.2, §8.7)_ — **AC:** archive/revoke via `AlertDialog`; toggle instant + rolls back on forced failure; success toast per mutation; issue-link copies.

## Slice 3 — Form excellence + Helper A (translation) · beta-desirable · deps: Slices 0,1

- [x] **T-8.3.1** — Refactor place/guesthouse/profile forms onto `form.tsx`: sectioned Cards, sticky bottom save bar (`pb-[env(safe-area-inset-bottom)]`, suppress bottom tabs on form routes), required markers, inline zod errors, ≥44 px controls, char counters, dirty-state guard, media preview grid; drop duplicate `Cancelar`. _(§6.5, §8.3, §8.4, §8.6, §8.9)_ — **AC:** all 3 forms use shared `Field`/`FormMessage`; save bar reachable above keyboard; media preview grid; dirty-form guard.
- [x] **T-8.3.2** — Opening-hours redesign: per-day Aberto/Fechado toggle, Aberto 24h, Copiar para todos os dias, larger stacked time controls mobile, inline rule. _(§8.4)_ — **AC:** per-day toggles + 24h + copy-to-all work; rule visible; controls ≥44 px.
- [x] **T-8.3.3** — Profile re-scope: Bio in EN/PT/ES tabs; language-invariant fields (telefone/email/foto/contacto) in shared section; **PT default tab**; rename "WhatsApp (Cloud API)" + per-option helper; brand switches; avatar preview; inline email/phone validation; max-width center desktop. _(§8.9)_ — **AC:** only Bio per-locale; PT default; no "Cloud API"; brand switches; width-capped.
- [x] **T-8.3.4** — **Data model: add `es`** to zod `FormSchema`, `TABS`, body builders (name/description), shared-types — from **one config array** (DRY both forms). _(§7a step 0)_ — **AC:** ES field in schema+payload for places/guesthouses/profile bio; single config drives EN/PT/ES in both forms.
- [x] **T-8.3.5** — `POST /v1/admin/translate` (BFF, Claude via `ANTHROPIC_API_KEY`): `{source_locale, target_locales[], fields}`; **European-Portuguese pré-AO** + do-not-translate list (proper nouns, "Calheta", POI names); `name` not translated, only `description`/`bio`. _(§7a backend)_ — **AC:** returns PT-PT pré-AO; do-not-translate respected; owner-auth-gated; rate-limited (mirror T-3.C.3).
- [x] **T-8.3.6** — `TranslatableField` + `useFieldTranslation` (EN/PT/ES `Tabs`): per-field globe + "Traduzir tudo" (only-empty); **suggest-not-overwrite** (`AlertDialog` confirm to replace non-empty + undo); in-flight shimmer; "Auto-translated" badge clearing on edit; out-of-sync marking; `setValue`+dirty+toast; **never block Save on MT failure**. Shared by all 3 forms. _(§7a UX)_ — **AC:** per-field + bulk work; non-empty target needs confirm; Save never blocked by MT failure; component shared not duplicated.

## Slice 4 — Chat experience · beta-desirable · deps: Slices 0,1

- [x] **T-8.4.1** — Two-pane at `lg+`; **single-pane master→detail push on mobile** (list→tap→thread→back); strengthen pane borders. _(§4.3, §8.8)_ — **AC:** mobile single-pane push; desktop two-pane; back returns to list.
- [x] **T-8.4.2** — Redesign conversation rows: colored-initials avatar, guest display name (bold), property + last-message preview, relative timestamp, unread dot/bold; **replace opaque `aaa00001…`/`smoke-…` IDs.** _(§8.8)_ — **AC:** rows show real name + property + preview + relative time; no raw IDs.
- [x] **T-8.4.3** — Real detail pane: message bubbles (sender+timestamp), sticky reply composer, **Quick Reply template chips** (wifi/check-in/recomendações); thread header with guest+property+booking. _(§8.8)_ — **AC:** bubbles render; composer sticky; quick-reply inserts template; header shows booking context.
- [x] **T-8.4.4** — Unread-count badge on Messages nav item (rail + bottom tab); search/filter bar; skeleton(`thread`)/empty/error states. _(§8.8)_ — **AC:** unread badge in both shells; search filters list; thread skeleton on load.

## Slice 5 — Helper B (map picker) + polish · post-beta · deps: Slices 0,3

- [x] **T-8.5.1** — **Geocoder = Geoapify** (commercial; user's call — EXECUTION Wave 6) + BFF proxy `POST /v1/admin/geocode` (+`/reverse`): hard `countrycode:pt` + soft São Miguel bias, TTL cache, key hidden, 503-when-unset. No Nominatim public API client-side. _(§7b backend)_ — **AC met:** PT-biased suggestions; no key in bundle/logs; choice recorded. **#355**, Fable 🔴 (compose env) fixed.
- [x] **T-8.5.2** — `LocationPicker` (shared place+guesthouse): bottom `Sheet` (both viewports — no `Drawer`/`Dialog` primitive in repo); MapLibre via `lib/map/*`; hand-rolled accessible combobox (no `cmdk`, debounce 300 ms, `AbortController`, ≤10); **fixed center pin**; "Usar a minha localização"; "Confirmar"→`setValue`; reverse-geocode on `moveend` >50 m; raw lat/lng in a `Collapsible`; placeholder removed. _(§7b UX)_ — **AC met:** writes coords to RHF; map not blank (resize on load/rAF/ResizeObserver); numeric fallback; not `@maplibre/maplibre-gl-geocoder`. **#357**, Fable 🔴 (mid-flight confirm) + 4 🟡 fixed.
- [x] **T-8.5.3** — Beta-metrics real dashboard: KPI cards (reservas/visualizações/conversão/mensagens) + trend deltas + 7d/30d/90d range. Views + reservations (from token-svc) + conversion **real**; messages honest `available:false`; graceful degradation. _(§8.10)_ — **AC met.** **#356**, Fable 🔴 (dead KPIs) fixed via real reservations.
- [x] **T-8.5.4** — Calm motion (`motion` v12, all `prefers-reduced-motion`-gated): FAB / bottom-tab / opacity-only page transition (FrozenOutlet). No per-row/pulse/scroll. Light/dark/system theme toggle in rail + top bar (`use-theme.ts`, `data-theme`, no FOUC). _(§2.6, §9 Phase 5)_ — **AC met.** **#358**, Fable 🔴 (page-transition wrong-exit) + 2 🟡 fixed.

> **Slice-5 follow-ups (post-code-complete, 2026-07-20)** — ✅ blank-coord guard (**#363**) · ✅ real **inbound-only** messages KPI + exclude cancelled reservations from conversion (**#364**) · ✅ Geoapify go-live on qual (picker **7/7**). Both PRs Fable-gated, deployed to qual (`b88541d`). **Still deferred (non-blocking):** reservations beta-scoping (needs a token-svc schema discriminator column) + O(N) list fetch → token-svc count endpoint at scale; carried Slice-3 items (opening-hours one-sided-time / 24h-reset · profile zod i18n · guesthouse empty-slug 400). Detail: EXECUTION Wave 7.
