import { useTranslation } from "react-i18next";
import { useOfflineStatus } from "@/lib/offline/use-offline-status";

export function OfflineBanner() {
  const { t } = useTranslation("common");
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 py-2 px-4 text-center text-sm text-white"
    >
      {t("offline.message")}
    </div>
  );
}
