import { useTranslation } from "react-i18next";
import { useConsentStore } from "@/lib/consent/use-consent";

// Shown only to undecided users (analytics === "unset"). GDPR requires the
// decline path to be as easy as accept, so both are equally-prominent buttons
// — Decline is not a tiny link. Either choice persists and dismisses the banner.
export function ConsentBanner() {
  const { t } = useTranslation("common");
  const analytics = useConsentStore((s) => s.analytics);
  const setAnalytics = useConsentStore((s) => s.setAnalytics);

  if (analytics !== "unset") return null;

  return (
    <div
      role="region"
      aria-label={t("consent.title")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-surface-container px-4 py-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-on-surface">{t("consent.title")}</span>
          <span className="text-xs text-on-surface-variant">
            {t("consent.body")}{" "}
            {/* Plain anchor, not react-router <Link>: this banner mounts as a sibling of
                <RouterProvider> (so it shows on every screen, both shells), which puts it
                outside the router context a <Link> needs. A full-nav anchor to /privacy is
                served by the router all the same. */}
            <a href="/privacy" className="underline underline-offset-2 hover:text-on-surface">
              {t("consent.learn_more")}
            </a>
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setAnalytics("denied")}
            className="flex-1 rounded-full border border-outline-variant px-4 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container-high sm:flex-none"
          >
            {t("consent.decline")}
          </button>
          <button
            type="button"
            onClick={() => setAnalytics("granted")}
            className="flex-1 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:flex-none"
          >
            {t("consent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
