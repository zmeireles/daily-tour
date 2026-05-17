import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div role="group" aria-label="Language" className="flex gap-1">
      <Button
        variant={lang === "en" ? "default" : "ghost"}
        size="sm"
        aria-pressed={lang === "en"}
        onClick={() => void i18n.changeLanguage("en")}
      >
        {t("public_landing.locale.en", "English")}
      </Button>
      <Button
        variant={lang === "pt-PT" ? "default" : "ghost"}
        size="sm"
        aria-pressed={lang === "pt-PT"}
        onClick={() => void i18n.changeLanguage("pt-PT")}
      >
        {t("public_landing.locale.pt-PT", "Português")}
      </Button>
    </div>
  );
}
