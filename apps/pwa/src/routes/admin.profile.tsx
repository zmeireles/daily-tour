import { useTranslation } from "react-i18next";
import { useProfile } from "@/features/backoffice/profile/use-profile";
import { ProfileForm } from "@/features/backoffice/profile/profile-form";

export default function AdminProfileRoute() {
  const { t } = useTranslation("admin");
  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("profile.form.loading", "Loading…")}</p>;
  }
  if (isError) {
    return (
      <p className="text-destructive text-sm">
        {t("profile.form.load_error", "Failed to load profile.")}
      </p>
    );
  }

  return <ProfileForm initialData={profile ?? null} />;
}
