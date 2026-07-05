import { useTranslation } from "react-i18next";
import { AlertCircle, Clock, Link2, LogIn, LogOut, MessageSquare } from "lucide-react";

import { StatTile } from "@/components/ui/stat-tile";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
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

// KPI grid for the Today dashboard. Every number is derived client-side from the
// existing admin list queries — no new backend endpoints for this slice. The grid
// as a whole shows a skeleton while its queries load and an inline error+retry if
// any fails, so a tile is never blank.
export function KpiTiles() {
  const { t } = useTranslation("admin");
  const reservations = useReservations();
  const places = usePlaces();
  const threads = useChatThreads();

  if (reservations.isLoading || places.isLoading || threads.isLoading) {
    return <LoadingState variant="tiles" count={6} />;
  }

  if (reservations.isError || places.isError || threads.isError) {
    return (
      <ErrorState
        title={t("dashboard.tiles.error_title", "Couldn't load today")}
        description={t("dashboard.tiles.error", "We couldn't load your dashboard. Please retry.")}
        onRetry={() => {
          void reservations.refetch();
          void places.refetch();
          void threads.refetch();
        }}
      />
    );
  }

  const today = localTodayISO(new Date());
  const reservationRows = reservations.data?.data ?? [];
  const placeRows = places.data?.data ?? [];
  const threadCount = threads.data?.length ?? 0;

  const pending = countPending(reservationRows);
  const attention = countPlacesNeedingAttention(placeRows);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatTile
        label={t("dashboard.tiles.checkins", "Check-ins today")}
        value={String(countCheckinsToday(reservationRows, today))}
        icon={<LogIn className="h-5 w-5" />}
        href="/admin/reservations"
      />
      <StatTile
        label={t("dashboard.tiles.checkouts", "Check-outs today")}
        value={String(countCheckoutsToday(reservationRows, today))}
        icon={<LogOut className="h-5 w-5" />}
        href="/admin/reservations"
      />
      <StatTile
        label={t("dashboard.tiles.pending", "Pending reservations")}
        value={String(pending)}
        icon={<Clock className="h-5 w-5" />}
        variant={pending > 0 ? "warning" : "default"}
        href="/admin/reservations"
      />
      <StatTile
        label={t("dashboard.tiles.messages", "Conversations")}
        value={String(threadCount)}
        icon={<MessageSquare className="h-5 w-5" />}
        href="/admin/chat"
      />
      <StatTile
        label={t("dashboard.tiles.places_attention", "Places needing attention")}
        value={String(attention)}
        icon={<AlertCircle className="h-5 w-5" />}
        variant={attention > 0 ? "warning" : "default"}
        href="/admin/places"
      />
      <StatTile
        label={t("dashboard.tiles.active_links", "Active guest links")}
        value={String(countActiveLinks(reservationRows))}
        icon={<Link2 className="h-5 w-5" />}
        href="/admin/reservations"
      />
    </div>
  );
}
