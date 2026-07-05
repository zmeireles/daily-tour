import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useReservations,
  useIssueToken,
  useRevokeToken,
  type ReservationRow,
} from "./use-reservations";
import {
  useGuesthouses,
  type GuesthouseRow,
} from "@/features/backoffice/guesthouses/use-guesthouses";
import { StatusBadge } from "@/features/backoffice/status";
import { BUCKET_ORDER, dayBucket, formatDate, localTodayISO, nights } from "./agenda";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

// Reservation statuses offered as filter chips, in workflow order. Labels reuse
// the shared `status.reservation.*` keys StatusBadge renders — no re-keying.
const RESERVATION_STATUSES = ["confirmed", "checked_in", "checked_out", "cancelled"] as const;

function guestLink(token: string): string {
  return `${window.location.origin}/r/${token}`;
}

// Guesthouse display name for the property chip, resolved against the active
// locale with graceful fallbacks. Mirrors place-list's localized-name stance.
function guesthouseName(gh: GuesthouseRow | undefined, locale: string): string {
  if (!gh) return "";
  const base = locale.split("-")[0] ?? locale;
  return gh.name[locale] ?? gh.name[base] ?? gh.name["en"] ?? Object.values(gh.name)[0] ?? "";
}

// Upcoming check-in first; id as a stable tiebreaker so equal dates don't jitter.
function byCheckin(a: ReservationRow, b: ReservationRow): number {
  const byDate = a.checkin.localeCompare(b.checkin);
  return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
}

interface ReservationCardProps {
  reservation: ReservationRow;
  propertyName: string;
  link: string | undefined;
  issuePending: boolean;
  revokePending: boolean;
  onIssue: (id: string) => void;
  onRevoke: (id: string) => void;
  onCopy: (link: string) => void;
}

function ReservationCard({
  reservation: r,
  propertyName,
  link,
  issuePending,
  revokePending,
  onIssue,
  onRevoke,
  onCopy,
}: ReservationCardProps) {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language;
  const nightCount = nights(r.checkin, r.checkout);
  const tokenActive = r.token_state === "active";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold leading-tight">{r.guest_name}</h3>
            <p className="text-muted-foreground text-sm">
              {formatDate(r.checkin, locale)} → {formatDate(r.checkout, locale)}
            </p>
          </div>
          <StatusBadge kind="reservation" value={r.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            {t("reservations.nights", { count: nightCount })}
          </span>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            {t("reservations.guests", { count: r.party_size })}
          </span>
          {propertyName ? (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {propertyName}
            </span>
          ) : null}
        </div>

        {/* Guest access — its own visual zone. `reservation confirmed` (default)
            and `token active` (success) are both green, so this stays separated
            from the header row to keep the two meanings distinct. */}
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {t("reservations.guest_access.title", "Guest access")}
            </span>
            <StatusBadge kind="token" value={r.token_state} />
          </div>
          <p className="text-muted-foreground text-xs">
            {tokenActive
              ? t(
                  "reservations.guest_access.active_hint",
                  "The link is active — your guest can open their tour.",
                )
              : t(
                  "reservations.guest_access.inactive_hint",
                  "Send a private link so your guest can open their tour.",
                )}
          </p>
          <div className="flex flex-col gap-2">
            <div>
              {tokenActive ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={revokePending}>
                      {t("reservations.revoke_access", "Revoke access")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("reservations.revoke_confirm.title", "Revoke the guest's access?")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          "reservations.revoke_confirm.description",
                          "Their guest link will stop working immediately.",
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("reservations.revoke_confirm.cancel", "Cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className={buttonVariants({ variant: "destructive" })}
                        onClick={() => onRevoke(r.id)}
                      >
                        {t("reservations.revoke_access", "Revoke access")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button size="sm" disabled={issuePending} onClick={() => onIssue(r.id)}>
                  {t("reservations.send_link", "Send link to guest")}
                </Button>
              )}
            </div>
            {link ? (
              <div className="flex w-full max-w-xs gap-2">
                <input
                  readOnly
                  value={guestLink(link)}
                  aria-label={t("reservations.guest_link", "Guest link")}
                  className="border-input bg-background flex-1 rounded-md border px-2 py-1 font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button size="sm" variant="outline" onClick={() => onCopy(guestLink(link))}>
                  {t("reservations.copy_link", "Copy")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReservationList() {
  const { t, i18n } = useTranslation("admin");
  const { data, isLoading, isError, refetch } = useReservations();
  const { data: ghData } = useGuesthouses();
  const issueToken = useIssueToken();
  const revokeToken = useRevokeToken();
  // Tokens minted this session, kept by reservation id so the shareable link
  // stays visible after the list refetches and the row flips to "active".
  const [issuedLinks, setIssuedLinks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  if (isError) {
    return (
      <ErrorState
        description={t("reservations.list.error", "Failed to load reservations.")}
        onRetry={() => void refetch()}
      />
    );
  }

  const reservations = data?.data ?? [];
  const ghById = new Map((ghData?.data ?? []).map((gh) => [gh.id, gh]));

  const query = search.trim().toLowerCase();
  const filtered = reservations.filter((r) => {
    const matchesSearch = !query || r.guest_name.toLowerCase().includes(query);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const today = localTodayISO(new Date());
  const sections = BUCKET_ORDER.map((bucket) => ({
    bucket,
    rows: filtered.filter((r) => dayBucket(r.checkin, today) === bucket).sort(byCheckin),
  })).filter((section) => section.rows.length > 0);

  const handleIssue = (id: string) => {
    issueToken.mutate(id, {
      onSuccess: (res) => {
        setIssuedLinks((prev) => ({ ...prev, [id]: res.token }));
        toast.success(t("reservations.issued", "Link sent"));
      },
    });
  };

  const handleRevoke = (id: string) => {
    revokeToken.mutate(id, {
      onSuccess: () => {
        setIssuedLinks((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.success(t("reservations.revoked", "Access revoked"));
      },
    });
  };

  const handleCopy = (link: string) => {
    void navigator.clipboard
      ?.writeText(link)
      .then(() => toast.success(t("reservations.copied", "Link copied")))
      .catch(() => toast.error(t("reservations.copy_error", "Couldn't copy the link.")));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{t("reservations.title", "Reservations")}</h1>
          {reservations.length > 0 ? (
            <span className="text-muted-foreground text-sm">
              {t("reservations.count", { count: filtered.length })}
            </span>
          ) : null}
        </div>
        {reservations.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("reservations.search_placeholder", "Search by guest name")}
              className="sm:max-w-xs"
            />
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="flex-wrap"
            >
              {RESERVATION_STATUSES.map((status) => (
                <ToggleGroupItem key={status} value={status}>
                  {t(`status.reservation.${status}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : null}
      </div>

      {reservations.length === 0 ? (
        <EmptyState
          icon="CalendarCheck"
          title={t("empty_states.reservations.title", "No reservations yet")}
          description={t(
            "empty_states.reservations.description",
            "Reservations show up here as guests are added. Issue a guest link to get someone started.",
          )}
        />
      ) : sections.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("reservations.no_matches", "No reservations match your filters.")}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.bucket} className="flex flex-col gap-3">
              <h2 className="text-muted-foreground text-sm font-semibold">
                {t(`reservations.buckets.${section.bucket}`)}
              </h2>
              <div className="flex flex-col gap-3">
                {section.rows.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    propertyName={guesthouseName(ghById.get(r.guesthouse_id), i18n.language)}
                    link={issuedLinks[r.id]}
                    issuePending={issueToken.isPending}
                    revokePending={revokeToken.isPending}
                    onIssue={handleIssue}
                    onRevoke={handleRevoke}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
