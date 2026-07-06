import { z } from "zod";

export const CONTENT_LOCALES = ["en", "pt-PT", "es"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

// Maps a ContentLocale to the i18n key segment used in admin.json tab keys
// (e.g. places.form.tabs.en, places.form.tabs.pt_PT, places.form.tabs.es).
export function contentLocaleTabKey(locale: ContentLocale): string {
  return locale.replace("-", "_");
}

// Returns a zod object shape keyed by flat field names (_en/_pt/_es).
// Callers can chain .optional() or .min() as needed — fields are bare z.string().
export function zodContentFields(prefix: string) {
  return {
    [`${prefix}_en`]: z.string().trim(),
    [`${prefix}_pt`]: z.string().trim(),
    [`${prefix}_es`]: z.string().trim(),
  };
}

// Assembles the API i18n map from flat form values, omitting empty/undefined entries.
export function buildI18nText(
  values: Record<string, string | undefined>,
  prefix: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  const en = values[`${prefix}_en`];
  const pt = values[`${prefix}_pt`];
  const es = values[`${prefix}_es`];
  if (en) result["en"] = en;
  if (pt) result["pt-PT"] = pt;
  if (es) result["es"] = es;
  return result;
}

// Inverse of buildI18nText — maps an API i18n text map back to flat form fields.
export function i18nTextToFields(
  text: Record<string, string> | undefined,
  prefix: string,
): Record<string, string> {
  return {
    [`${prefix}_en`]: text?.["en"] ?? "",
    [`${prefix}_pt`]: text?.["pt-PT"] ?? "",
    [`${prefix}_es`]: text?.["es"] ?? "",
  };
}
