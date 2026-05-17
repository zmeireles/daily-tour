import { useTranslation } from "react-i18next";

export function Greeting() {
  const { t, i18n } = useTranslation();

  return (
    <div className="px-6 pt-8 pb-4">
      <h1
        className="font-display text-3xl leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("home.greeting")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("home.locale_hint", { locale: i18n.language })}
      </p>
    </div>
  );
}
