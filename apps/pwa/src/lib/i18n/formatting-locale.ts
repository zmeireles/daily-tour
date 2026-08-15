// Which locale should Intl use?
//
// `i18n.language` answers "which translation bundle do we have". Intl needs the
// answer to a different question: "what date, time and number conventions does
// this user expect". Conflating the two is what produced #391 — `supportedLngs`
// normalizes an `en-GB` browser to `en`, and every Intl call that was handed
// `i18n.language` started rendering `Dec 31, 2026` / `2:30 PM` to British and
// Australian owners instead of `31 Dec 2026` / `14:30`.
//
// ⚠️ The obvious fix — hand Intl `navigator.language` instead — is wrong, and
// wrong in a direction this project has already paid for. A `pt-BR` browser
// would then get Brazilian conventions (`31 de dez. de 2026`, `1.234,5`) even
// though the UI is deliberately European Portuguese. The normalization FIXED
// that case; naively preferring the browser would undo it.
//
// So the rule is narrower, and it turns on whether the UI language already
// names a region:
//
//   - It does (`pt-PT`) -> that is a deliberate choice of regional variant.
//     Use it. A pt-BR browser must not drag pt-PT to Brazilian conventions.
//   - It does not (`en`, `fr`, `es`) -> we have no regional opinion, so adopt
//     the user's own region for that same language when they have one.
//
// | UI language | browser prefers | Intl gets | why |
// |---|---|---|---|
// | `en`    | `en-GB`          | `en-GB` | restores #391's regression |
// | `en`    | `en-US`          | `en-US` | identical output to `en` |
// | `es`    | `es-MX`          | `es-MX` | Mexican conventions, Spanish UI |
// | `fr`    | `fr-CA`          | `fr-CA` | Canadian conventions, French UI |
// | `pt-PT` | `pt-BR`          | `pt-PT` | UI names a region — it wins |
// | `es`    | `en-GB`          | `es`    | different language; no region to take |
// | `en`    | (none)           | `en`    | nothing to enrich with |

const baseLanguage = (tag: string): string => tag.toLowerCase().split("-")[0] ?? tag.toLowerCase();

// `navigator.languages` is not guaranteed to hold well-formed tags. Firefox
// exposes `intl.accept_languages` as free text, so a typo there ("en-", "en-a",
// "en--GB") arrives here verbatim — and every Intl constructor THROWS a
// RangeError on a malformed tag rather than ignoring it. That would crash the
// components at render, which is a great deal worse than a wrong date format.
//
// Only the borrowed tag is checked: it is the one value on this path that comes
// from outside the app. `uiLanguage` is i18next's resolved language, drawn from
// our own `supportedLngs`.
const isWellFormed = (tag: string): boolean => {
  try {
    new Intl.Locale(tag);
    return true;
  } catch {
    return false;
  }
};

/**
 * The locale to hand `Intl`, given the resolved UI language.
 *
 * `preferred` defaults to the browser's ordered language list. It is a
 * parameter so this is testable without mutating `navigator`, and so a caller
 * with a better signal can supply one.
 */
export function formattingLocale(
  uiLanguage: string,
  preferred: readonly string[] = typeof navigator === "undefined"
    ? []
    : (navigator.languages ?? [navigator.language].filter(Boolean)),
): string {
  if (!uiLanguage) return "en";

  // A region in the UI language is an explicit variant choice — keep it.
  if (uiLanguage.includes("-")) return uiLanguage;

  // Otherwise borrow the region from the user's own preference list, but only
  // from an entry in the SAME language. Scanning the whole list rather than
  // taking `navigator.language` matters for a browser like ["de", "en-GB"]:
  // the UI falls back to English, and en-GB is that user's English.
  const base = baseLanguage(uiLanguage);
  const regional = preferred.find(
    (tag) =>
      typeof tag === "string" &&
      tag.includes("-") &&
      baseLanguage(tag) === base &&
      isWellFormed(tag),
  );

  return regional ?? uiLanguage;
}
