import { useTranslation } from "react-i18next";

type EmptyStateProps = {
  action: string;
  km: number;
};

export function EmptyState({ action, km }: EmptyStateProps) {
  const { t } = useTranslation("discover");
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-muted-foreground text-sm">{t("empty", { action, km })}</p>
    </div>
  );
}
