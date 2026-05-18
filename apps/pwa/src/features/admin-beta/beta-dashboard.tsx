import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useOwnerJwt } from "@/store/owner-session";

interface BetaMetrics {
  total_guests: number;
  tour_completion_rate: number;
  average_rating: number | null;
  top_places: Array<{ place_id: string; engagement_count: number }>;
  drop_off_funnel: { started: number; completed: number };
}

async function fetchBetaMetrics(jwt: string): Promise<BetaMetrics> {
  const res = await fetch("/v1/admin/beta-metrics", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`beta-metrics fetch failed: ${res.status}`);
  return (await res.json()) as BetaMetrics;
}

export function BetaDashboard() {
  const { t } = useTranslation("admin");
  const jwt = useOwnerJwt();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "beta-metrics"],
    queryFn: () => fetchBetaMetrics(jwt!),
    enabled: !!jwt,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <p className="text-muted-foreground">{t("beta.loading", "Loading metrics…")}</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-destructive" role="alert">
        {t("beta.error", "Failed to load beta metrics.")}
      </p>
    );
  }

  const completionPct = Math.round(data.tour_completion_rate * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("beta.title", "Beta Dashboard")}</h1>
      <p className="text-sm text-muted-foreground">{t("beta.window", "Last 30 days · beta guests only")}</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label={t("beta.total_guests", "Guests")} value={String(data.total_guests)} />
        <MetricCard label={t("beta.completion_rate", "Completion")} value={`${completionPct}%`} />
        <MetricCard
          label={t("beta.avg_rating", "Avg rating")}
          value={data.average_rating != null ? data.average_rating.toFixed(1) : "—"}
        />
        <MetricCard
          label={t("beta.funnel_started", "Started")}
          value={String(data.drop_off_funnel.started)}
        />
      </div>

      <section>
        <h2 className="text-base font-medium mb-2">{t("beta.top_places", "Top 5 engaged places")}</h2>
        {data.top_places.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("beta.no_places", "No data yet.")}</p>
        ) : (
          <ol className="space-y-1">
            {data.top_places.map((p, i) => (
              <li key={p.place_id} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-4">{i + 1}.</span>
                <span className="font-mono text-xs flex-1 truncate">{p.place_id}</span>
                <span className="text-muted-foreground">{p.engagement_count}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-base font-medium mb-2">{t("beta.funnel_title", "Drop-off funnel")}</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">{t("beta.funnel_started", "Started")}</p>
            <p className="text-xl font-semibold">{data.drop_off_funnel.started}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("beta.funnel_completed", "Completed")}</p>
            <p className="text-xl font-semibold">{data.drop_off_funnel.completed}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
