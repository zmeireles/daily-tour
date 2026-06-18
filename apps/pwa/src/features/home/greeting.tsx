import { useTranslation } from "react-i18next";
import { Overline } from "@/components/overline";

// "mobile" (default) = the shipped phone greeting. "masthead" = the desktop
// editorial spread: the locale hint becomes a tracked Overline eyebrow ABOVE the
// greeting, which steps up to the --text-display-lg tier. Same i18n, no fork.
export function Greeting({ variant = "mobile" }: { variant?: "mobile" | "masthead" }) {
  const { t, i18n } = useTranslation("home");

  if (variant === "masthead") {
    return (
      <div>
        <Overline>{t("locale_hint", { locale: i18n.language })}</Overline>
        <h1 className="mt-3 font-display text-display-lg leading-[0.98] text-on-surface">
          {t("greeting")}
        </h1>
      </div>
    );
  }

  return (
    <div className="px-6 pt-8 pb-4">
      <h1 className="font-display text-4xl leading-tight text-on-surface">{t("greeting")}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        {t("locale_hint", { locale: i18n.language })}
      </p>
    </div>
  );
}
