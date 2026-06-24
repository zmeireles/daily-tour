import { useTranslation } from "react-i18next";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";

// STUB — the full terms text is deferred to T-3.D.0 / legal review.
export default function TermsRoute() {
  useThemeAuto();
  const { t } = useTranslation("legal");

  return (
    <main className="min-h-svh px-4 py-12 max-w-lg mx-auto text-center">
      <h1 className="font-display text-2xl font-semibold text-on-surface">{t("terms.heading")}</h1>
      <p className="mt-4 text-sm text-on-surface-variant">{t("terms.placeholder")}</p>
    </main>
  );
}
