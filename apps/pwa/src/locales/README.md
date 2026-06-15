# PWA i18n locales

Translation catalogs for the Daily Tour São Miguel PWA. Six namespaces per locale:
`admin`, `common`, `discover`, `home`, `place`, `public`.

## Wiring — what actually ships

Locales are registered in [`../lib/i18n/index.ts`](../lib/i18n/index.ts). **Only `en`
and `pt-PT` are wired into `resources`.** Detection is `i18next-browser-languagedetector`
with `fallbackLng: "en"`.

| Locale  | Role                           | Wired? | Coverage vs `en` | Reviewed                     |
| ------- | ------------------------------ | :----: | ---------------- | ---------------------------- |
| `en`    | **Source of truth** + fallback |   ✅   | 238/238 (100%)   | n/a (authoring locale)       |
| `pt-PT` | **Live second language**       |   ✅   | 238/238 (100%)   | ✅ human-reviewed 2026-06-15 |
| `de`    | Staged (not shipped)           |   ❌   | 188/238 (79%)    | ❌ machine-grade             |
| `es`    | Staged (not shipped)           |   ❌   | 189/238 (79%)    | ❌ machine-grade             |
| `fr`    | Staged (not shipped)           |   ❌   | 59/238 (25%)     | ❌ machine-grade             |

> Because de/es/fr are **not** in `resources`, a browser set to those languages
> currently falls back to **English**. This is intended for v1 — the locale
> switcher offers only EN / PT.

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

## de / es / fr — staged, not production-ready

Machine-translated for an **earlier 5-locale scope** (en, pt-BR, de, es, fr) that was
later narrowed to **en + pt-PT**. They are kept on disk but unwired, and have drifted:

- **Incomplete.** de/es ≈ 79%; **fr is only 25%** — missing the entire `admin`,
  `discover`, and `place` namespaces.
- **Drifted.** Each carries **8 stale keys** (`locale.de`, `locale.es`, `locale.fr`,
  `locale.pt-BR` in `home` + `public`) — vestigial locale-switcher labels that `en`
  dropped when the switcher narrowed to EN/PT.
- **Unreviewed.** No human PT-PT-style review; quality is machine-grade.

**Do not wire any of these as-is.** To promote a staged locale to shipped:

1. Complete it to **100% key parity** with `en` (fill the missing namespaces/keys).
2. Remove the **8 stale `locale.*` keys**.
3. Human-review to the same bar as pt-PT (native fluency, tone, correctness).
4. Register it in [`../lib/i18n/index.ts`](../lib/i18n/index.ts) `resources` and add it
   to the locale switcher.

If the multi-locale ambition is permanently dropped, the `de/`, `es/`, `fr/` directories
can be deleted to remove dead weight — left in place for now pending that decision.
