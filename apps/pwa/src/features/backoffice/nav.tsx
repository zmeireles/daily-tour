import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  MapPin,
  Home,
  User,
  BarChart3,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ownerUserManager } from "@/lib/auth/owner-oidc";
import { useOwnerSessionStore, useOwnerProfile } from "@/store/owner-session";

// ─── Nav model (Plan-008 §5.1) ──────────────────────────────────────────────
// One source of truth composed into three surfaces: the desktop rail, the mobile
// bottom tab bar, and the Sheet menus. `badge` marks the two items that carry a
// count-badge slot (Reservations, Messages).

export type BadgeKey = "reservations" | "chat";

export type NavItem = {
  key: string; // i18n key under shell.nav.*
  to: string;
  icon: LucideIcon;
  end?: boolean; // exact-match active state (the /admin index)
  badge?: BadgeKey;
};

export type NavGroup = { key: string; items: NavItem[] };

// Counts feeding the badge slots. There is no cheap, attention-semantic live
// source today (the reservations query is per-page and chat has no unread
// count), so the shell passes {} — every slot renders empty. Wiring a real
// count is deferred until a shared summary source exists; do NOT add a backend
// call here just to light a badge.
export type NavCounts = Partial<Record<BadgeKey, number | undefined>>;

const ITEMS = {
  today: { key: "today", to: "/admin", icon: LayoutDashboard, end: true },
  reservations: {
    key: "reservations",
    to: "/admin/reservations",
    icon: CalendarCheck,
    badge: "reservations",
  },
  chat: { key: "chat", to: "/admin/chat", icon: MessageSquare, badge: "chat" },
  places: { key: "places", to: "/admin/places", icon: MapPin },
  guesthouses: { key: "guesthouses", to: "/admin/guesthouses", icon: Home },
  profile: { key: "profile", to: "/admin/profile", icon: User },
  beta: { key: "beta", to: "/admin/beta", icon: BarChart3 },
} satisfies Record<string, NavItem>;

// Grouped for the rail + full menu Sheet: Operations · Catalogue · Account.
export const NAV_GROUPS: NavGroup[] = [
  { key: "operations", items: [ITEMS.today, ITEMS.reservations, ITEMS.chat] },
  { key: "catalogue", items: [ITEMS.places, ITEMS.guesthouses] },
  { key: "account", items: [ITEMS.profile, ITEMS.beta] },
];

// The four primary thumb-zone destinations; the 5th slot is "More".
export const BOTTOM_TABS: NavItem[] = [ITEMS.today, ITEMS.reservations, ITEMS.chat, ITEMS.places];

// What "More" reveals — everything the bottom bar can't fit.
export const MORE_ITEMS: NavItem[] = [ITEMS.guesthouses, ITEMS.profile, ITEMS.beta];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// ─── Sign-out ────────────────────────────────────────────────────────────────
// Reuse the owner OIDC manager's end-session redirect (post_logout_redirect_uri
// is already configured to "/"). Clear the local session first so nothing stale
// lingers if the redirect is slow.
export function signOutOwner(): void {
  useOwnerSessionStore.getState().clearOwnerSession();
  void ownerUserManager.signoutRedirect();
}

// ─── Derived helpers ─────────────────────────────────────────────────────────

// The label of the section the current path belongs to, for the mobile top bar.
export function useCurrentPageTitle(): string {
  const { pathname } = useLocation();
  const { t } = useTranslation("admin");
  const match =
    ALL_ITEMS.find((i) => i.to !== "/admin" && pathname.startsWith(i.to)) ??
    ALL_ITEMS.find((i) => i.to === "/admin");
  return match ? t(`shell.nav.${match.key}`) : "";
}

// ─── Shared parts ────────────────────────────────────────────────────────────

// Count-badge slot. A 0/undefined count renders nothing.
export function NavCountBadge({ count, className }: { count?: number; className?: string }) {
  if (!count || count <= 0) return null;
  return (
    <Badge
      variant="default"
      className={cn(
        "h-5 min-w-5 justify-center rounded-full px-1 text-[10px] leading-none tabular-nums",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

// A rail / Sheet nav row: icon · label · optional count badge. Active state uses
// the admin --nav-active-* tokens so "you are here" ≠ "primary action".
export function NavItemLink({
  item,
  count,
  onNavigate,
}: {
  item: NavItem;
  count?: number;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation("admin");
  const { icon: Icon } = item;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-nav-active-bg text-nav-active-fg"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 truncate">{t(`shell.nav.${item.key}`)}</span>
      {item.badge && <NavCountBadge count={count} />}
    </NavLink>
  );
}

// Grouped nav list shared by the rail and the menu Sheets.
export function NavGroupList({
  groups,
  counts,
  headings = true,
  onNavigate,
}: {
  groups: NavGroup[];
  counts: NavCounts;
  headings?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key}>
          {headings && (
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t(`shell.nav.group.${group.key}`)}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.key}>
                <NavItemLink
                  item={item}
                  count={item.badge ? counts[item.badge] : undefined}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Account identity + sign-out, shared by the rail footer and the menu Sheets.
export function AccountFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation("admin");
  const profile = useOwnerProfile();
  return (
    <div className="flex flex-col gap-2">
      {profile && (profile.name || profile.email) && (
        <div className="px-3">
          <p
            className="truncate text-sm font-medium text-foreground"
            title={profile.name ?? profile.email ?? undefined}
          >
            {profile.name ?? profile.email}
          </p>
          {profile.name && profile.email && (
            <p className="truncate text-xs text-muted-foreground" title={profile.email}>
              {profile.email}
            </p>
          )}
        </div>
      )}
      <Button
        variant="ghost"
        size="touch"
        onClick={() => {
          onNavigate?.();
          signOutOwner();
        }}
        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
      >
        <LogOut aria-hidden="true" />
        {t("shell.nav.signout", "Sign out")}
      </Button>
    </div>
  );
}
