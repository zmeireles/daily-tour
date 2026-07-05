import { useTranslation } from "react-i18next";
import type { VariantProps } from "class-variance-authority";
import type { PlaceStatus, ReservationStatus } from "@daily-tour/shared-types";

import { Badge, badgeVariants } from "@/components/ui/badge";
import type { TokenState } from "./reservations/use-reservations";

// The single source of truth: every domain status → a localized label key +
// a color-coded Badge variant. No admin list should render a raw enum again;
// consume <StatusBadge /> instead. Kept exhaustive over each enum via the
// `satisfies Record<Enum, StatusMeta>` guards below — a new/renamed enum value
// fails typecheck here until it is given a label + variant.

// Derived from badge.tsx's cva so the variant set can never drift out of sync.
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Place-catalogue flags surfaced as badges. No shared enum — these are boolean
// columns (is_hosts_pick, hidden_place_ids) projected to a status token.
export type PlaceFlag = "hosts_pick" | "hidden";

export interface StatusMeta {
  labelKey: string;
  variant: BadgeVariant;
}

const placeStatus = {
  published: { labelKey: "status.place.published", variant: "default" },
  owner_approved: { labelKey: "status.place.owner_approved", variant: "warning" },
  draft: { labelKey: "status.place.draft", variant: "outline" },
  archived: { labelKey: "status.place.archived", variant: "secondary" },
} satisfies Record<PlaceStatus, StatusMeta>;

const reservationStatus = {
  confirmed: { labelKey: "status.reservation.confirmed", variant: "default" },
  checked_in: { labelKey: "status.reservation.checked_in", variant: "info" },
  checked_out: { labelKey: "status.reservation.checked_out", variant: "secondary" },
  cancelled: { labelKey: "status.reservation.cancelled", variant: "destructive" },
} satisfies Record<ReservationStatus, StatusMeta>;

const tokenState = {
  active: { labelKey: "status.token.active", variant: "success" },
  revoked: { labelKey: "status.token.revoked", variant: "destructive" },
  none: { labelKey: "status.token.none", variant: "outline" },
} satisfies Record<TokenState, StatusMeta>;

const placeFlag = {
  hosts_pick: { labelKey: "status.flag.hosts_pick", variant: "default" },
  hidden: { labelKey: "status.flag.hidden", variant: "secondary" },
} satisfies Record<PlaceFlag, StatusMeta>;

export const STATUS_MAP = {
  place: placeStatus,
  reservation: reservationStatus,
  token: tokenState,
  flag: placeFlag,
} satisfies Record<string, Record<string, StatusMeta>>;

export type StatusKind = keyof typeof STATUS_MAP;

export function StatusBadge({ kind, value }: { kind: StatusKind; value: string }) {
  const { t } = useTranslation("admin");
  const meta = (STATUS_MAP[kind] as Record<string, StatusMeta | undefined>)[value];

  // Defensive fallback — a value outside the mapped enum should never reach
  // here. Render the raw value in a neutral badge rather than crash or leak a
  // blank cell, so a bad value is visible instead of silently swallowed.
  if (!meta) {
    return (
      <Badge variant="outline" data-status-kind={kind} data-status-value={value}>
        {value}
      </Badge>
    );
  }

  return (
    <Badge variant={meta.variant} data-status-kind={kind} data-status-value={value}>
      {t(meta.labelKey)}
    </Badge>
  );
}
