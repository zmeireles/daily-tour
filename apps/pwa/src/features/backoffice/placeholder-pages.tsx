import { useTranslation } from "react-i18next";

function PlaceholderPage() {
  const { t } = useTranslation("admin");
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{t("placeholder.title", "Coming soon")}</h1>
      <p className="text-muted-foreground">
        {t("placeholder.body", "This section is wired up in a follow-up task.")}
      </p>
    </div>
  );
}

export const GuesthousesPage = PlaceholderPage;
export const PlacesPage = PlaceholderPage;
export const ReservationsPage = PlaceholderPage;
export const ProfilePage = PlaceholderPage;
