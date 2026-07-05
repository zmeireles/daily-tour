import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { usePlace } from "@/features/backoffice/places/use-places";
import { PlaceForm } from "@/features/backoffice/places/place-form";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminPlacesEditRoute() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { data, isLoading, isError, refetch } = usePlace(id ?? "");

  if (isLoading) {
    return <LoadingState variant="cards" count={1} />;
  }
  if (isError || !data) {
    return (
      <ErrorState
        description={t("places.form.load_error", "Failed to load place.")}
        onRetry={() => void refetch()}
      />
    );
  }

  return <PlaceForm initialData={data} id={id} />;
}
