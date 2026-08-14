import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// The visible label narrows to an ISO 639-1 code below `sm`. Four translated
// language *words* ("English Português Français Español") are wider than a
// 390px phone once the brand lockup takes its share of the app bar, so the row
// overflowed by 36px and clipped "Español" off the right edge — Spanish being
// a shipped guest locale, unreachable without discovering a sideways scroll
// (#382). Codes are the same in every language, so they are not translated.
const LOCALES = [
  ["en", "EN"],
  ["pt-PT", "PT"],
  ["fr", "FR"],
  ["es", "ES"],
] as const;

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation("home");

  return (
    <div className="flex gap-1" role="group" aria-label="Language switcher">
      {LOCALES.map(([locale, code]) => (
        <button
          key={locale}
          type="button"
          onClick={() => void i18n.changeLanguage(locale)}
          className={cn(
            "px-3 py-1.5 rounded text-sm transition-colors",
            i18n.language === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={i18n.language === locale}
        >
          <span className="sm:hidden">{code}</span>
          {/* Kept in the accessible name at every width rather than swapped out:
              below `sm` the button announces "PT Português", so the visible
              text is a subset of the accessible name (WCAG 2.5.3 Label in
              Name). An aria-label of "Português" over a visible "PT" would
              read fine to a screen reader and break voice control. */}
          <span className="sr-only sm:not-sr-only">{t(`locale.${locale}`)}</span>
        </button>
      ))}
    </div>
  );
}
