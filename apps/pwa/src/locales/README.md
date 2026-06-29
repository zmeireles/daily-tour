# PWA i18n locales

Translation catalogs for the Daily Tour São Miguel PWA. Seven namespaces per locale:
`admin`, `common`, `discover`, `home`, `legal`, `place`, `public`.

## Wiring — what actually ships

Locales are registered in [`../lib/i18n/index.ts`](../lib/i18n/index.ts). **`en`, `pt-PT`,
`fr`, and `es` are wired into `resources`.** Detection is `i18next-browser-languagedetector`
with `fallbackLng: "en"`; a guest's reservation locale is applied on entry
(`routes/r.$token.tsx` → `i18n.changeLanguage`).

| Locale  | Role                           | Wired? | Guest coverage vs `en` | Reviewed                           |
| ------- | ------------------------------ | :----: | ---------------------- | ---------------------------------- |
| `en`    | **Source of truth** + fallback |   ✅   | 100%                   | n/a (authoring locale)             |
| `pt-PT` | **Live second language**       |   ✅   | 100%                   | ✅ human-reviewed 2026-06-15       |
| `fr`    | **Live (2026 beta — Rui)**     |   ✅   | 100% (6 guest ns)      | ⚠️ machine-drafted, native pending |
| `es`    | **Live (2026 beta — Célia)**   |   ✅   | 100% (6 guest ns)      | ⚠️ machine-drafted, native pending |
| `de`    | Staged (not shipped)           |   ❌   | ~79%                   | ❌ machine-grade                   |

> **`fr`/`es` ship the six guest-facing namespaces** (`common`, `home`, `public`,
> `discover`, `place`, `legal`) at full key parity with `en`. The **`admin`** namespace
> (owner-only backoffice) is **not** translated for fr/es — there is no French/Spanish
> owner — so admin keys fall back to `en`. The locale switcher offers **EN / PT / FR / ES**.
> fr/es were drafted to native quality (warm «vous» for fr, «tú» for es) for the 2026
> closed beta; a **native + legal review of the `legal` namespace is still pending** — the
> beta's fr/es guests are effectively the first native reviewers.

## pt-PT — European Portuguese (pré-Acordo Ortográfico)

The shipped second language. Standard: **PT-PT, pré-AO** spelling, with the project's
**"no vosso/vossa"** doctrine (guest addressed formally as «o seu / a sua», not «vosso»).
Reviewed 2026-06-15 via the `revisor-ptpt` agent (deterministic linter 7→0 + judgment):
pré-AO corrections in `admin.json` (`Acções`, `actualizar`, `Activo`, `redireccionar`,
`Selector`, `seleccionar`, `vêem`) and a formal-register fix in `place.json`
(`podes`→`pode`). Full key parity with `en`; all interpolation placeholders preserved.

**When editing pt-PT:** keep pré-AO (do **not** "correct" to AO90 — `Acções` not `Ações`,
`actualizar` not `atualizar`), keep the formal third person, and re-run the review agent
for non-trivial copy. `contacto`/`opções`/`-ção` words are already correct — don't touch.

## de — staged, not production-ready

`de` is machine-translated from an **earlier 5-locale scope** (en, pt-BR, de, es, fr) that
was later narrowed. It is kept on disk but **unwired** and incomplete (~79%, missing
namespaces, and carries stale `locale.*` switcher-label keys). **Do not wire it as-is.**

To promote `de` to shipped, follow the path used for fr/es in the 2026 beta:

1. Complete it to **100% key parity** with `en` for the guest namespaces (and `admin` too
   if a German-speaking owner is ever onboarded).
2. Remove the stale `locale.*` keys (`locale.de`/`locale.pt-BR` etc. not present in `en`).
3. Review to native quality (the `legal` namespace also needs a legal pass).
4. Register it in [`../lib/i18n/index.ts`](../lib/i18n/index.ts) `resources`, add it to the
   guest + public-landing locale switchers, and add its autonym to every `home.json`
   `locale` block.

If the multi-locale ambition is permanently dropped, the `de/` directory can be deleted —
left in place for now pending that decision.
