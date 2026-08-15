import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/lib/i18n/formatting-locale";
import { BarChart3, CalendarCheck, Eye, MessageSquare, Percent } from "lucide-react";

import { useOwnerJwt } from "@/store/owner-session";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Range = "7d" | "30d" | "90d";
const RANGES: Range[] = ["7d", "30d", "90d"];

// One KPI: current value, the equal window before it, and the % change. The BFF
// sends `deltaPct: null` when the previous period was 0 — rendered as "—".
// `available: false` means the KPI has no real data source yet (messages; or
// reservations/conversion if token-svc is down) — shown as "sem dados", never a
// misleading 0.
interface MetricDelta {
  value: number;
  previous: number;
  deltaPct: number | null;
  available: boolean;
}
interface BetaMetrics {
  range_days: number;
  reservations: MetricDelta;
  views: MetricDelta;
  // A ratio in [0, 1] (reservations / views); rendered as a percentage.
  conversion: MetricDelta;
  messages: MetricDelta;
}

async function fetchBetaMetrics(jwt: string, range: Range): Promise<BetaMetrics> {
  const res = await fetch(`/v1/admin/beta-metrics?range=${range}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`beta-metrics fetch failed: ${res.status}`);
  return (await res.json()) as BetaMetrics;
}

const fmtInt = (n: number, lang: string) => new Intl.NumberFormat(lang).format(n);
const fmtPct = (ratio: number, lang: string) =>
  new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 1 }).format(ratio);

// StatTile's trend chip is driven by (trend text, trendUp): up → green ▲,
// down → red ▼, undefined → muted (no arrow). Null delta shows the "—" label.
function trendProps(
  delta: MetricDelta,
  lang: string,
  noneLabel: string,
): { trend: string; trendUp?: boolean } {
  if (delta.deltaPct === null) return { trend: noneLabel, trendUp: undefined };
  const pct = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(
    Math.abs(delta.deltaPct),
  );
  if (delta.deltaPct > 0) return { trend: `${pct}%`, trendUp: true };
  if (delta.deltaPct < 0) return { trend: `${pct}%`, trendUp: false };
  return { trend: `${pct}%`, trendUp: undefined };
}

// Owner beta-metrics dashboard: branded KPI stat-cards (reservas / visualizações
// / conversão / mensagens) with trend deltas vs. the previous equal-length
// window, and a 7d/30d/90d date-range control that re-fetches the same
// owner-auth'd endpoint. Reuses the shared loading / error / empty states.
export function BetaDashboard() {
  const { t, i18n } = useTranslation("admin");
  const jwt = useOwnerJwt();
  const [range, setRange] = useState<Range>("30d");
  const lang = formattingLocale(i18n.language);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "beta-metrics", range],
    queryFn: () => fetchBetaMetrics(jwt!, range),
    enabled: !!jwt,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const header = (
    <header className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("beta.title", "Beta metrics")}</h1>
        <p className="text-sm text-muted-foreground">{t("beta.subtitle", "Beta guests only")}</p>
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        value={range}
        onValueChange={(v) => v && setRange(v as Range)}
        aria-label={t("beta.range.label", "Date range")}
      >
        {RANGES.map((r) => (
          <ToggleGroupItem key={r} value={r}>
            {t(`beta.range.${r}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </header>
  );

  let body: React.ReactNode;
  if (isLoading) {
    body = <LoadingState variant="tiles" count={4} />;
  } else if (isError || !data) {
    body = (
      <ErrorState
        title={t("beta.error_title", "Error loading metrics")}
        description={t("beta.error", "Failed to load beta metrics.")}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  } else if (
    [data.reservations, data.views, data.messages]
      .filter((k) => k.available)
      .every((k) => k.value === 0 && k.previous === 0)
  ) {
    body = (
      <EmptyState
        icon={<BarChart3 className="size-6" aria-hidden="true" />}
        title={t("beta.empty_title", "No beta activity yet")}
        description={t(
          "beta.empty_description",
          "Metrics will appear here as beta guests use their tours.",
        )}
      />
    );
  } else {
    const none = t("beta.delta.none", "—");
    const noData = t("beta.noData", "sem dados");
    // A KPI with no data source yet renders "—" + a muted "sem dados" chip,
    // never a fabricated 0 with a trend.
    const tileProps = (m: MetricDelta, fmt: (v: number) => string) =>
      m.available
        ? { value: fmt(m.value), ...trendProps(m, lang, none) }
        : { value: "—", trend: noData, trendUp: undefined };
    body = (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label={t("beta.kpi.reservations", "Reservations")}
          icon={<CalendarCheck className="h-5 w-5" />}
          {...tileProps(data.reservations, (v) => fmtInt(v, lang))}
        />
        <StatTile
          label={t("beta.kpi.views", "Views")}
          icon={<Eye className="h-5 w-5" />}
          {...tileProps(data.views, (v) => fmtInt(v, lang))}
        />
        <StatTile
          label={t("beta.kpi.conversion", "Conversion")}
          icon={<Percent className="h-5 w-5" />}
          {...tileProps(data.conversion, (v) => fmtPct(v, lang))}
        />
        <StatTile
          label={t("beta.kpi.messages", "Messages")}
          icon={<MessageSquare className="h-5 w-5" />}
          {...tileProps(data.messages, (v) => fmtInt(v, lang))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {body}
    </div>
  );
}
