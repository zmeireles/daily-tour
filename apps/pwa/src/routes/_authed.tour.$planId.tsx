import { useEffect, useRef, useState } from "react";
import { CloudRain } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { useTourPlan } from "@/features/tour/use-tour-plan";
import { useTourTelemetry } from "@/features/tour/use-tour-telemetry";
import { DailyTourTimeline, type TourStop } from "@/components/daily-tour-timeline";
import { FailureFallback } from "@/features/tour/failure-fallback";
import { ShareButton } from "@/features/tour/share-button";
import { Overline } from "@/components/overline";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { BackLink } from "@/components/back-link";
import { ResponsiveScreen } from "@/components/responsive-screen";
import { DailyTourDesktop } from "@/features/tour/daily-tour-desktop";

const TIMEOUT_MS = 2 * 60 * 1000;

// Whole hours spanned from the first stop's start to the last stop's end.
// Stops carry wall-clock "HH:MM" + optional duration; the last stop's end is
// its start plus its duration. Returns null when it can't be computed.
function tourSpanHours(stops: TourStop[]): number | null {
  if (stops.length === 0) return null;
  const startMin = hhmmToMinutes(stops[0]!.time);
  const last = stops[stops.length - 1]!;
  const lastStartMin = hhmmToMinutes(last.time);
  if (startMin == null || lastStartMin == null) return null;
  const endMin = lastStartMin + (last.duration_min ?? 0);
  const hours = Math.round((endMin - startMin) / 60);
  return hours > 0 ? hours : null;
}

function hhmmToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export default function TourPlanRoute() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t } = useTranslation("home");
  // Flat router has no shared authed layout, so each screen opts into the
  // sunrise/sunset theme. Without this, /tour/:id renders the light fallback
  // regardless of theme (same D1 fix applied to /p/:id).
  useThemeAuto();

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
    const spanHours = tourSpanHours(stops);
    const subline =
      spanHours != null
        ? t("tour.editorial.subline", { count: stops.length, hours: spanHours })
        : t("tour.editorial.subline_no_hours", { count: stops.length });

    const mobile = (
      <main className="min-h-svh bg-surface px-4 pt-6 pb-24 max-w-lg mx-auto">
        {/* Editorial header */}
        <header className="mb-10">
          <Overline size="sm" className="text-[var(--sun-400)]">
            {t("tour.editorial.overline")}
          </Overline>
          <h1 className="mt-2 font-display text-3xl leading-tight text-on-surface">
            {t("tour.editorial.headline")}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">{subline}</p>
        </header>

        {weatherAware && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
            <CloudRain className="size-4 shrink-0 text-[var(--sun-400)]" aria-hidden="true" />
            <span>{t("tour.status.weather_adjusted")}</span>
          </div>
        )}

        <DailyTourTimeline stops={stops} />

        <div className="mt-8 flex justify-center">
          <ShareButton planId={planId!} editorial />
        </div>

        <div className="mt-6 flex justify-center">
          <BackLink to="/">{t("tour.status.back")}</BackLink>
        </div>

        <BottomTabBar active="explore" />
      </main>
    );

    return (
      <ResponsiveScreen
        engageAt="md"
        mobile={mobile}
        desktop={
          <DailyTourDesktop
            stage="timeline"
            planId={planId!}
            stops={stops}
            subline={subline}
            weatherAware={weatherAware}
          />
        }
      />
    );
  }

  return null;
}
