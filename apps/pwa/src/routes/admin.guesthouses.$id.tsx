import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useGuesthouse } from "@/features/backoffice/guesthouses/use-guesthouses";
import { GuesthouseForm } from "@/features/backoffice/guesthouses/guesthouse-form";

export default function AdminGuesthousesEditRoute() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { data, isLoading, isError } = useGuesthouse(id ?? "");

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">{t("guesthouses.form.loading", "Loading…")}</p>
    );
  }
  if (isError || !data) {
    return (
      <p className="text-destructive text-sm">
        {t("guesthouses.form.load_error", "Failed to load guesthouse.")}
      </p>
    );
  }

  return <GuesthouseForm initialData={data} id={id} />;
}
