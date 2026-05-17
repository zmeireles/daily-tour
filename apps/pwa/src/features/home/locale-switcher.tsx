import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const LOCALES = ["en", "pt-PT"] as const;

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation("home");

  return (
    <div className="flex gap-1" role="group" aria-label="Language switcher">
      {LOCALES.map((locale) => (
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
          {t(`locale.${locale}`)}
        </button>
      ))}
    </div>
  );
}
