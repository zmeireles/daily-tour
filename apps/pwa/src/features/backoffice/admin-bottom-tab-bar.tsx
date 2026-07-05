import * as React from "react";
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/features/backoffice/locale-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AccountFooter,
  NavCountBadge,
  NavGroupList,
  BOTTOM_TABS,
  MORE_ITEMS,
  type NavCounts,
  type NavItem,
} from "@/features/backoffice/nav";

// Admin-specific bottom tab bar (<lg). Five thumb-zone slots: the four primary
// destinations + "More" (a Sheet with the remaining nav, account, locale).
// Hidden ≥lg. Distinct from the guest bottom-tab-bar, which is wired to guest
// tabs + the `home` namespace.

function tabClasses(isActive: boolean) {
  return cn(
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
    isActive ? "text-nav-active-fg" : "text-muted-foreground hover:text-foreground",
  );
}

function TabIcon({ item, count, isActive }: { item: NavItem; count?: number; isActive: boolean }) {
  const { icon: Icon } = item;
  return (
    <span
      className={cn(
        "relative flex h-8 w-12 items-center justify-center rounded-full",
        isActive && "bg-nav-active-bg",
      )}
    >
      <Icon size={20} aria-hidden="true" />
      {item.badge && (
        <NavCountBadge count={count} className="absolute -top-1 -right-0.5 border-card" />
      )}
    </span>
  );
}

export function AdminBottomTabBar({
  counts,
  className,
}: {
  counts: NavCounts;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = MORE_ITEMS.some((i) => pathname.startsWith(i.to));

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      aria-label={t("shell.nav.bottom_aria", "Primary")}
    >
      <ul className="flex items-stretch">
        {BOTTOM_TABS.map((item) => (
          <li key={item.key} className="flex-1">
            <NavLink to={item.to} end={item.end} className={({ isActive }) => tabClasses(isActive)}>
              {({ isActive }) => (
                <>
                  <TabIcon
                    item={item}
                    count={item.badge ? counts[item.badge] : undefined}
                    isActive={isActive}
                  />
                  <span className="text-[11px] leading-none">{t(`shell.nav.${item.key}`)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}

        <li className="flex-1">
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger className={tabClasses(moreActive)}>
              <span
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full",
                  moreActive && "bg-nav-active-bg",
                )}
              >
                <MoreHorizontal size={20} aria-hidden="true" />
              </span>
              <span className="text-[11px] leading-none">{t("shell.nav.more", "More")}</span>
            </SheetTrigger>
            {/* data-app pins the admin token overlay inside the body-level portal. */}
            <SheetContent
              side="bottom"
              data-app="admin"
              aria-describedby={undefined}
              className="rounded-t-xl bg-card pb-[env(safe-area-inset-bottom)]"
            >
              <SheetHeader>
                <SheetTitle>{t("shell.nav.more", "More")}</SheetTitle>
              </SheetHeader>
              <div className="px-2">
                <NavGroupList
                  groups={[{ key: "more", items: MORE_ITEMS }]}
                  counts={counts}
                  headings={false}
                  onNavigate={() => setMoreOpen(false)}
                />
              </div>
              <div className="mt-2 flex flex-col gap-3 border-t border-border p-3">
                <AccountFooter onNavigate={() => setMoreOpen(false)} />
                <LocaleSwitcher />
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
