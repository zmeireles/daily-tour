import { useTranslation } from "react-i18next";
import { useProfile } from "@/features/backoffice/profile/use-profile";
import { ProfileForm } from "@/features/backoffice/profile/profile-form";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminProfileRoute() {
  const { t } = useTranslation("admin");
  const { data: profile, isLoading, isError, refetch } = useProfile();

  if (isLoading) {
    return <LoadingState variant="cards" count={1} />;
  }
  if (isError) {
    return (
      <ErrorState
        description={t("profile.form.load_error", "Failed to load profile.")}
        onRetry={() => void refetch()}
      />
    );
  }

  return <ProfileForm initialData={profile ?? null} />;
}
