import { Link } from "react-router";
import { useTranslation } from "react-i18next";

interface Props {
  type: "rejected" | "timeout";
  reason?: string;
  onRetry: () => void;
}

export function FailureFallback({ type, reason, onRetry }: Props) {
  const { t } = useTranslation("discover");

  const titleKey =
    type === "rejected" ? "tour.failure.rejected_title" : "tour.failure.timeout_title";
  const bodyKey = type === "rejected" ? "tour.failure.rejected_body" : "tour.failure.timeout_body";

  return (
    <div
      role="alert"
      className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold text-destructive">{t(titleKey)}</h2>
      <p className="text-sm text-muted-foreground">{reason ?? t(bodyKey)}</p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("tour.failure.retry")}
        </button>
        <Link
          to="/tour/new"
          className="rounded-md border px-4 py-2 text-sm font-medium text-center hover:bg-muted"
        >
          {t("tour.failure.edit")}
        </Link>
      </div>
    </div>
  );
}
