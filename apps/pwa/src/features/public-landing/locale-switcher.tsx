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

  return (
    <div role="group" aria-label="Language" className="flex gap-1">
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
