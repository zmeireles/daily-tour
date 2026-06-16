import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const CARD_CLASS =
  "flex items-center justify-between gap-3 border border-outline-variant bg-surface-container rounded-xl px-4 py-3";

export function PremiumStubs() {
  const { t } = useTranslation("home");

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <Link to="/tour/new" data-premium="true" className={CARD_CLASS}>
        <span className="flex items-center gap-3">
          <CalendarDays aria-hidden="true" className="size-5 text-primary" />
          <span className="font-medium text-on-surface">{t("premium.plan_my_day")}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 text-on-surface-variant" />
      </Link>

      <Link to="/chat" className={CARD_CLASS}>
        <span className="flex items-center gap-3">
          <Avatar aria-hidden="true">
            <AvatarFallback>J</AvatarFallback>
          </Avatar>
          <span className="font-medium text-on-surface">{t("premium.message_host")}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 text-on-surface-variant" />
      </Link>
    </div>
  );
}
