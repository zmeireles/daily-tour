import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LOCALES = [
  ["en", "English"],
  ["pt-PT", "Português"],
  ["fr", "Français"],
  ["es", "Español"],
] as const;

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;

  // `flex-wrap` rather than a narrower label: at 320px the four full words are
  // wider than the viewport, and because the row is centred the overflow lands
  // on the LEFT — "English" sat at left: -7.1px. A left overflow does not grow
  // `scrollWidth`, so the usual `scrollWidth === clientWidth` check reports a
  // clean 0 and sees nothing (#405). Wrapping cannot clip whatever the labels
  // grow to, which a fixed breakpoint would not survive.
  return (
    <div role="group" aria-label="Language" className="flex flex-wrap justify-center gap-1">
      {LOCALES.map(([locale, label]) => (
        <Button
          key={locale}
          variant={lang === locale ? "default" : "ghost"}
          size="sm"
          aria-pressed={lang === locale}
          onClick={() => void i18n.changeLanguage(locale)}
        >
          {t(`locale.${locale}`, label)}
        </Button>
      ))}
    </div>
  );
}
