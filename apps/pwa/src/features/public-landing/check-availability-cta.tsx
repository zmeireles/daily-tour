import { useTranslation } from "react-i18next";
import { CHECK_AVAILABILITY_MAILTO } from "@/lib/config";

export function CheckAvailabilityCta() {
  const { t } = useTranslation();
  return (
    <section className="py-10 px-6 flex justify-center">
      <a
        href={`mailto:${CHECK_AVAILABILITY_MAILTO}`}
        className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("public_landing.cta.check_availability", "Check availability")}
      </a>
    </section>
  );
}
