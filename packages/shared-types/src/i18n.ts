import { z } from "zod";
import { type Locale, LocaleSchema } from "./enums.js";

export const I18nTextSchema = z
  .record(LocaleSchema, z.string())
  .refine((val) => Object.keys(val).length > 0, {
    message: "I18nText must have at least one locale entry",
  });
export type I18nText = z.infer<typeof I18nTextSchema>;

/**
 * The one answer to "given a name map keyed by content locale and a language,
 * which string do I show?" — previously answered by four helpers with three
 * different orders (#392), so an owner could read a Portuguese property name on
 * one screen and an English one on the next. FR-XC-02 (P0) exists to stop
 * exactly that.
 *
 * Order: **exact → same base language → each fallback in turn → any value**.
 *
 * `preferred` is a `string`, not a `Locale`, deliberately. Callers pass
 * `i18n.language`, which is a browser tag and can be `en-GB` or `pt-BR` —
 * values the enum does not contain. The old signature made every call site cast
 * `as Locale`, which was a lie the type system then stopped questioning.
 *
 * ⚠️ The base step matches on the base of each KEY, not on a literal base key.
 * The previous helpers did `text[base]`, which looks for a key called `pt` —
 * and the maps are keyed `pt-PT`. So a `pt-BR` or bare-`pt` owner fell past
 * perfectly good Portuguese content to the English baseline. Same defect as the
 * one #403 fixed in the language detector, in a different file.
 */
export function pickLocale(
  text: I18nText,
  preferred: string,
  fallback: Locale | readonly Locale[] = "en",
): string {
  const map = text as Record<string, string | undefined>;

  const exact = map[preferred];
  if (exact) return exact;

  const base = preferred.toLowerCase().split("-")[0] ?? "";
  if (base) {
    for (const key of Object.keys(map)) {
      const k = key.toLowerCase();
      if (k === base || k.startsWith(`${base}-`)) {
        const hit = map[key];
        if (hit) return hit;
      }
    }
  }

  for (const candidate of typeof fallback === "string" ? [fallback] : fallback) {
    const hit = map[candidate];
    if (hit) return hit;
  }

  return Object.values(map).find((v) => typeof v === "string") ?? "";
}
