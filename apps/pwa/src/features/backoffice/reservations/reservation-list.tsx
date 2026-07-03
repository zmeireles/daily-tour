import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useReservations,
  useIssueToken,
  useRevokeToken,
  type ReservationRow,
  type TokenState,
} from "./use-reservations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

function guestLink(token: string): string {
  return `${window.location.origin}/r/${token}`;
}

export function ReservationList() {
  const { t } = useTranslation("admin");
  const { data, isLoading, isError, refetch } = useReservations();
  const issueToken = useIssueToken();
  const revokeToken = useRevokeToken();
  // Tokens minted this session, kept by reservation id so the shareable link
  // stays visible after the list refetches and the row flips to "active".
  const [issuedLinks, setIssuedLinks] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">{t("reservations.list.loading", "Loading…")}</p>
    );
  }
  if (isError) {
    return (
      <p className="text-destructive text-sm">
        {t("reservations.list.error", "Failed to load reservations.")}
      </p>
    );
  }

  const reservations = data?.data ?? [];

  const tokenStateLabel = (state: TokenState): string =>
    t(`reservations.token_state.${state}`, state);

  const handleIssue = (id: string) => {
    issueToken.mutate(id, {
      onSuccess: (res) => setIssuedLinks((prev) => ({ ...prev, [id]: res.token })),
    });
  };

  const handleRevoke = (id: string) => {
    revokeToken.mutate(id, {
      onSuccess: () =>
        setIssuedLinks((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        }),
    });
  };

  const handleCopy = (link: string) => {
    void navigator.clipboard?.writeText(link);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("reservations.title", "Reservations")}</h1>
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
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">
                  {t("reservations.list.guest", "Guest")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("reservations.list.checkin", "Check-in")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("reservations.list.checkout", "Check-out")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("reservations.list.party_size", "Party")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("reservations.list.status", "Status")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("reservations.list.token_state", "Token")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("reservations.list.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r: ReservationRow) => {
                const link = issuedLinks[r.id];
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.guest_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.checkin}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.checkout}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.party_size}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tokenStateLabel(r.token_state)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2 justify-end">
                          {r.token_state === "active" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={revokeToken.isPending}
                              onClick={() => handleRevoke(r.id)}
                            >
                              {t("reservations.revoke", "Revoke")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={issueToken.isPending}
                              onClick={() => handleIssue(r.id)}
                            >
                              {t("reservations.issue", "Issue link")}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(guestLink(link))}
                            >
                              {t("reservations.copy_link", "Copy")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
