import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LOCALES = ["en", "pt-PT", "es"] as const;

// Owner/admin language toggle. i18n.changeLanguage switches every namespace
// globally, so this also drives admin.json strings (e.g. the 6.D host's-pick cap
// toast). pt/en/es are offered from day one (locked decision); de exists in
// admin.json but falls back to en and is not user-selectable.
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
          onClick={() => void i18n.changeLanguage(locale)}
        >
          {t(`shell.locale.${locale}`)}
        </Button>
      ))}
    </div>
  );
}
