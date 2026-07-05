import { useTranslation } from "react-i18next";
import { AlertCircle, Clock, Link2, LogIn, LogOut, MessageSquare } from "lucide-react";

import { StatTile } from "@/components/ui/stat-tile";
import { LoadingState } from "@/components/ui/loading-state";
import { useReservations } from "@/features/backoffice/reservations/use-reservations";
import { usePlaces } from "@/features/backoffice/places/use-places";
import { useChatThreads } from "@/features/backoffice/chat/use-admin-chat";
import {
  countActiveLinks,
  countCheckinsToday,
  countCheckoutsToday,
  countPending,
  countPlacesNeedingAttention,
  localTodayISO,
} from "./lib";

// A tile's data source: whichever list query feeds it. A tile shows its value, or —
// if that one source errored — an inline retry, so a single failing query never
// blanks the tiles fed by the healthy ones.
interface TileSource {
  isError: boolean;
  refetch: () => unknown;
}

function KpiTile({
  source,
  label,
  value,
  icon,
  href,
  variant,
}: {
  source: TileSource;
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "warning" | "emphasis";
}) {
  const { t } = useTranslation("admin");
  if (source.isError) {
    return (
      <button
        type="button"
        onClick={() => void source.refetch()}
        data-slot="kpi-tile-error"
        className="flex min-h-11 flex-col justify-center gap-1 rounded-lg border border-destructive/30 bg-card p-4 text-left shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-destructive">
          {t("dashboard.tiles.tile_error", "Tap to retry")}
        </span>
      </button>
    );
  }
  return <StatTile label={label} value={value} icon={icon} href={href} variant={variant} />;
}

// KPI grid for the Today dashboard. Every number is derived client-side from the
// existing admin list queries — no new backend endpoints for this slice. While the
// queries load the grid shows a skeleton; once settled, each tile shows its value or,
// if its own source failed, an inline retry — so a tile is never blank.
export function KpiTiles() {
  const { t } = useTranslation("admin");
  const reservations = useReservations();
  const places = usePlaces();
  const threads = useChatThreads();

  if (reservations.isLoading || places.isLoading || threads.isLoading) {
    return <LoadingState variant="tiles" count={6} columns={3} />;
  }

  const today = localTodayISO(new Date());
  const reservationRows = reservations.data?.data ?? [];
  const placeRows = places.data?.data ?? [];
  const threadCount = threads.data?.length ?? 0;

  const pending = countPending(reservationRows);
  const attention = countPlacesNeedingAttention(placeRows);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <KpiTile
        source={reservations}
        label={t("dashboard.tiles.checkins", "Check-ins today")}
        value={String(countCheckinsToday(reservationRows, today))}
        icon={<LogIn className="h-5 w-5" />}
        href="/admin/reservations"
      />
      <KpiTile
        source={reservations}
        label={t("dashboard.tiles.checkouts", "Check-outs today")}
        value={String(countCheckoutsToday(reservationRows, today))}
        icon={<LogOut className="h-5 w-5" />}
        href="/admin/reservations"
      />
      <KpiTile
        source={reservations}
        label={t("dashboard.tiles.pending", "Pending reservations")}
        value={String(pending)}
        icon={<Clock className="h-5 w-5" />}
        variant={pending > 0 ? "warning" : "default"}
        href="/admin/reservations"
      />
      <KpiTile
        source={threads}
        label={t("dashboard.tiles.messages", "Conversations")}
        value={String(threadCount)}
        icon={<MessageSquare className="h-5 w-5" />}
        href="/admin/chat"
      />
      <KpiTile
        source={places}
        label={t("dashboard.tiles.places_attention", "Places needing attention")}
        value={String(attention)}
        icon={<AlertCircle className="h-5 w-5" />}
        variant={attention > 0 ? "warning" : "default"}
        href="/admin/places"
      />
      <KpiTile
        source={reservations}
        label={t("dashboard.tiles.active_links", "Active guest links")}
        value={String(countActiveLinks(reservationRows))}
        icon={<Link2 className="h-5 w-5" />}
        href="/admin/reservations"
      />
    </div>
  );
}
