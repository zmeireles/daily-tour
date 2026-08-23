import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LOCALES = ["en", "pt-PT", "es"] as const;

// "en" → "EN", "pt-PT" → "PT": the primary subtag, uppercased. Derived rather
// than translated — a language's code is the same in every UI language.
function localeCode(locale: string): string {
  return (locale.split("-")[0] ?? locale).toUpperCase();
}

// Owner/admin language toggle. i18n.changeLanguage switches every namespace
// globally, so this also drives admin.json strings (e.g. the 6.D host's-pick cap
// toast). pt/en/es are offered from day one (locked decision); de exists in
// admin.json but falls back to en and is not user-selectable.
//
// Renders CODES (EN · PT · ES), not full names (dt-tests #38): the spelled-out
// names alone measured 226px inside the desktop rail's 199px footer row, and
// the overflow was silently absorbed by whatever else shared the row. Codes fit
// with room for a fourth locale; the full name stays on each button as its
// accessible name and tooltip.
export function LocaleSwitcher() {
  const { t, i18n } = useTranslation("admin");
  const lang = i18n.language;

  return (
    <div role="group" aria-label={t("shell.locale.label", "Language")} className="flex gap-1">
      {LOCALES.map((locale) => (
        <Button
          key={locale}
          variant={lang === locale ? "default" : "ghost"}
          size="sm"
          aria-pressed={lang === locale}
          aria-label={t(`shell.locale.${locale}`)}
          title={t(`shell.locale.${locale}`)}
          onClick={() => void i18n.changeLanguage(locale)}
        >
          {localeCode(locale)}
        </Button>
      ))}
    </div>
  );
}
