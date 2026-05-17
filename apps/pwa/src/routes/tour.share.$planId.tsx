import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { DailyTourTimeline, type TourStop } from "@/components/daily-tour-timeline";

interface PublicPlan {
  id: string;
  status: "ready";
  plan_payload: Record<string, unknown> | null;
}

async function fetchPublicPlan(planId: string): Promise<PublicPlan> {
  const res = await fetch(`/v1/public/tour-plans/${planId}`);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return (await res.json()) as PublicPlan;
}

export default function TourShareRoute() {
  const { planId } = useParams<{ planId: string }>();
  const { t } = useTranslation("discover");

  const {
    data: plan,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-tour-plan", planId],
    queryFn: () => fetchPublicPlan(planId ?? ""),
    enabled: !!planId,
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="min-h-svh flex items-center justify-center">
        <div
          role="status"
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
        />
      </main>
    );
  }

  if (isError || !plan) {
    return (
      <main className="min-h-svh flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">{t("tour.share.not_found")}</p>
      </main>
    );
  }

  const stops = (plan.plan_payload as { stops?: TourStop[] })?.stops ?? [];

  return (
    <main className="min-h-svh px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{t("tour.share.heading")}</h1>
      <DailyTourTimeline stops={stops} />
    </main>
  );
}
