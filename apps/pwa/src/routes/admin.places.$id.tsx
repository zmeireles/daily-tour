import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { usePlace } from "@/features/backoffice/places/use-places";
import { PlaceForm } from "@/features/backoffice/places/place-form";

export default function AdminPlacesEditRoute() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { data, isLoading, isError } = usePlace(id ?? "");

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("places.form.loading", "Loading…")}</p>;
  }
  if (isError || !data) {
    return (
      <p className="text-destructive text-sm">{t("places.form.load_error", "Failed to load place.")}</p>
    );
  }

  return <PlaceForm initialData={data} id={id} />;
}
