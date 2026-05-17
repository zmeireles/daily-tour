import { useTranslation } from "react-i18next";

function PremiumStub({ label, hint }: { label: string; hint: string }) {
  return (
    <button
      type="button"
      disabled
      data-premium="true"
      className="flex w-full items-center justify-between px-4 py-3 rounded-lg bg-muted/50 opacity-60 cursor-not-allowed text-left"
      title={hint}
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

export function PremiumStubs() {
  const { t } = useTranslation();
  const comingSoon = t("home.premium.coming_soon");

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <PremiumStub label={t("home.premium.plan_my_day")} hint={comingSoon} />
      <PremiumStub label={t("home.premium.message_owner")} hint={comingSoon} />
    </div>
  );
}
