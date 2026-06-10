import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LOCALES = ["en", "pt-PT"] as const;

// Owner/admin language toggle — parity with the guest side. i18n.changeLanguage
// switches every namespace globally, so this also drives admin.json strings
// (e.g. the 6.D host's-pick cap toast). de/es exist in admin.json but are not
// offered here yet (matches the guest switcher's en/pt-PT set).
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
