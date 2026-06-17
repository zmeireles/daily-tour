import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { IntakeForm, type IntakeFormData } from "@/features/tour/intake-form";
import { useCreateTourPlan } from "@/features/tour/use-tour-plan";

export default function TourNewRoute() {
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t } = useTranslation("home");
  const mutation = useCreateTourPlan();
  // D1: opt into sunrise/sunset theme (flat router has no shared authed layout).
  // Full editorial restyle of this screen is deferred to a follow-up pass.
  useThemeAuto();

  useEffect(() => {
    if (!jwt) void navigate("/?reason=expired", { replace: true });
  }, [jwt, navigate]);

  if (!jwt) return null;

  async function handleSubmit(data: IntakeFormData) {
    if (!jwt) return;
    try {
      const plan = await mutation.mutateAsync({ data, jwt });
      void navigate(`/tour/${plan.id}`);
    } catch {
      // mutation.error is set; form stays mounted so user can retry
    }
  }

  return (
    <main className="min-h-svh px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{t("tour.new.title")}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t("tour.new.subtitle")}</p>
      {mutation.isError && (
        <p className="text-destructive text-sm mb-4" role="alert">
          {t("tour.new.error")}
        </p>
      )}
      <IntakeForm onSubmit={handleSubmit} submitting={mutation.isPending} />
    </main>
  );
}
