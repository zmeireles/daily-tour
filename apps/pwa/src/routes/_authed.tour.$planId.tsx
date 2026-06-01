import { useEffect, useRef, useState } from "react";
import { CloudRain } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { useTourPlan } from "@/features/tour/use-tour-plan";
import { useTourTelemetry } from "@/features/tour/use-tour-telemetry";
import { DailyTourTimeline, type TourStop } from "@/components/daily-tour-timeline";
import { FailureFallback } from "@/features/tour/failure-fallback";
import { ShareButton } from "@/features/tour/share-button";

const TIMEOUT_MS = 2 * 60 * 1000;

export default function TourPlanRoute() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t } = useTranslation("home");

  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jwt) void navigate("/?reason=expired", { replace: true });
  }, [jwt, navigate]);

  const { data: plan, isLoading } = useTourPlan(planId ?? "", jwt ?? "");
  useTourTelemetry(planId ?? "");

  // Start a 2-minute timeout whenever we're in the queued/loading state.
  useEffect(() => {
    const isWaiting = isLoading || plan?.status === "queued";
    if (isWaiting) {
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setTimedOut(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, plan?.status]);

  if (!jwt) return null;

  if (timedOut) {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 px-4">
        <FailureFallback type="timeout" onRetry={() => void navigate("/tour/new")} />
      </main>
    );
  }

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
    const reason =
      typeof plan.plan_payload?.["error"] === "string"
        ? String(plan.plan_payload["error"])
        : undefined;
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 px-4">
        <FailureFallback
          type="rejected"
          reason={reason}
          onRetry={() => void navigate("/tour/new")}
        />
      </main>
    );
  }

  if (plan?.status === "ready") {
    const payload = plan.plan_payload as { stops?: TourStop[]; weather_aware?: boolean } | null;
    const stops = payload?.stops ?? [];
    const weatherAware = payload?.weather_aware === true;
    return (
      <main className="min-h-svh px-4 py-8 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{t("tour.status.ready")}</h1>
          <ShareButton planId={planId!} />
        </div>
        {weatherAware && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <CloudRain className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("tour.status.weather_adjusted")}</span>
          </div>
        )}
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
