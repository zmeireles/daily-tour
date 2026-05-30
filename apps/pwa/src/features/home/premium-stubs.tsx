import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function PremiumStubs() {
  const { t } = useTranslation("home");

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <Link
        to="/tour/new"
        data-premium="true"
        className="flex w-full items-center justify-between px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-left font-medium"
      >
        <span>{t("premium.plan_my_day")}</span>
        <span aria-hidden="true" className="text-xs opacity-90">
          →
        </span>
      </Link>
    </div>
  );
}
