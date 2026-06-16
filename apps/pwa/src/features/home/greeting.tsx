import { useTranslation } from "react-i18next";

export function Greeting() {
  const { t, i18n } = useTranslation("home");

  return (
    <div className="px-6 pt-8 pb-4">
      <h1 className="font-display text-4xl leading-tight text-on-surface">{t("greeting")}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        {t("locale_hint", { locale: i18n.language })}
      </p>
    </div>
  );
}
