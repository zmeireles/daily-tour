import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CalendarDays, ExternalLink, MessageSquare, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOwnerProfile } from "@/store/owner-session";
import { useGuesthouses } from "@/features/backoffice/guesthouses/use-guesthouses";
import { KpiTiles } from "./kpi-tiles";
import { SetupChecklist } from "./setup-checklist";
import { greetingKey, localizedName } from "./lib";

function GreetingHeader() {
  const { t, i18n } = useTranslation("admin");
  const profile = useOwnerProfile();
  const guesthouses = useGuesthouses();

  const name = profile?.name?.trim() || t("dashboard.greeting.fallback_name", "there");
  const greeting = t(`dashboard.greeting.${greetingKey(new Date().getHours())}`, { name });

  const firstGuesthouse = guesthouses.data?.data[0];
  const propertyName = firstGuesthouse
    ? localizedName(firstGuesthouse.name, i18n.language)
    : null;

  return (
    <header className="space-y-1">
      {/* h2 → sans under the admin overlay ([data-app="admin"] h2); h1 stays serif */}
      <h2 className="text-2xl font-semibold tracking-tight">{greeting}</h2>
      {propertyName && <p className="text-sm text-muted-foreground">{propertyName}</p>}
    </header>
  );
}

function QuickActions() {
  const { t } = useTranslation("admin");
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Link to="/admin/places/new" className={cn(buttonVariants({ size: "touch" }), "gap-2")}>
        <Plus className="h-4 w-4" />
        {t("dashboard.actions.add_place", "Add a place")}
      </Link>
      <Link
        to="/admin/reservations"
        className={cn(buttonVariants({ variant: "outline", size: "touch" }), "gap-2")}
      >
        <CalendarDays className="h-4 w-4" />
        {t("dashboard.actions.todays_reservations", "Today's reservations")}
      </Link>
      <Link
        to="/admin/chat"
        className={cn(buttonVariants({ variant: "outline", size: "touch" }), "gap-2")}
      >
        <MessageSquare className="h-4 w-4" />
        {t("dashboard.actions.reply_messages", "Reply to messages")}
      </Link>
    </div>
  );
}

// "View as guest" — no in-app generic guest-preview affordance exists (guest links
// are minted per-reservation via the token flow); opening the guest home in a new
// tab is the closest un-scoped preview, and never hard-codes a token.
function ViewAsGuest() {
  const { t } = useTranslation("admin");
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ExternalLink className="h-4 w-4" />
      {t("dashboard.view_as_guest", "View as guest")}
    </a>
  );
}

// Today: the /admin index. Greeting → KPI/action tiles → quick actions →
// view-as-guest → first-run setup checklist. Never a blank pane.
export function TodayDashboard() {
  return (
    <div className="space-y-6">
      <GreetingHeader />
      <KpiTiles />
      <QuickActions />
      <ViewAsGuest />
      <SetupChecklist />
    </div>
  );
}
