import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useInstallPrompt } from "@/lib/pwa/use-install-prompt";

export function InstallBanner() {
  const { t } = useTranslation("common");
  const { canInstall, install, dismiss } = useInstallPrompt();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (canInstall && e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canInstall, dismiss]);

  if (!canInstall) return null;

  return (
    <div
      role="region"
      aria-label={t("pwa_install.title")}
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t border-green-200 bg-[#F7F4EC] px-4 py-3 shadow-lg"
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[#2F5D43]">{t("pwa_install.title")}</span>
        <span className="text-xs text-gray-600">{t("pwa_install.body")}</span>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          {t("pwa_install.dismiss")}
        </button>
        <button
          type="button"
          onClick={() => void install()}
          className="rounded bg-[#2F5D43] px-3 py-1.5 text-sm font-medium text-[#F7F4EC] hover:bg-[#26503a]"
        >
          {t("pwa_install.install")}
        </button>
      </div>
    </div>
  );
}
