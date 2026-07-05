import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useGuesthouse } from "@/features/backoffice/guesthouses/use-guesthouses";
import { GuesthouseForm } from "@/features/backoffice/guesthouses/guesthouse-form";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminGuesthousesEditRoute() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("admin");
  const { data, isLoading, isError, refetch } = useGuesthouse(id ?? "");

  if (isLoading) {
    return <LoadingState variant="cards" count={1} />;
  }
  if (isError || !data) {
    return (
      <ErrorState
        description={t("guesthouses.form.load_error", "Failed to load guesthouse.")}
        onRetry={() => void refetch()}
      />
    );
  }

  return <GuesthouseForm initialData={data} id={id} />;
}
