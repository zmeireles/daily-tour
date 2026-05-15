import { z } from "zod";
import { type Locale, LocaleSchema } from "./enums.js";

export const I18nTextSchema = z
  .record(LocaleSchema, z.string())
  .refine((val) => Object.keys(val).length > 0, {
    message: "I18nText must have at least one locale entry",
  });
export type I18nText = z.infer<typeof I18nTextSchema>;

export function pickLocale(text: I18nText, preferred: Locale, fallback: Locale = "en"): string {
  if (preferred in text) return text[preferred] ?? "";
  if (fallback in text) return text[fallback] ?? "";
  const first = Object.values(text)[0];
  return first ?? "";
}
