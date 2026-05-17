import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { useTourPlan } from "@/features/tour/use-tour-plan";
import { DailyTourTimeline, type TourStop } from "@/components/daily-tour-timeline";

export default function TourPlanRoute() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t } = useTranslation("home");

  useEffect(() => {
    if (!jwt) void navigate("/?reason=expired", { replace: true });
  }, [jwt, navigate]);

  const { data: plan, isLoading } = useTourPlan(planId ?? "", jwt ?? "");

  if (!jwt) return null;

  if (isLoading || plan?.status === "queued") {
    return (
      <main
        className="min-h-svh flex flex-col items-center justify-center gap-4"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          role="status"
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
        />
        <p className="text-muted-foreground text-sm">{t("tour.status.queued")}</p>
      </main>
    );
  }

  if (plan?.status === "rejected") {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{t("tour.status.rejected")}</p>
        <Link to="/tour/new" className="text-primary underline underline-offset-4 text-sm">
          {t("tour.new.submit")}
        </Link>
        <Link to="/" className="text-muted-foreground underline underline-offset-4 text-sm">
          ← {t("tour.status.back")}
        </Link>
      </main>
    );
  }

  if (plan?.status === "ready") {
    const stops = (plan.plan_payload as { stops?: TourStop[] })?.stops ?? [];
    return (
      <main className="min-h-svh px-4 py-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-6">{t("tour.status.ready")}</h1>
        <DailyTourTimeline stops={stops} />
        <Link
          to="/"
          className="mt-6 inline-block text-primary underline underline-offset-4 text-sm"
        >
          ← {t("tour.status.back")}
        </Link>
      </main>
    );
  }

  return null;
}
