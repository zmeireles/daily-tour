import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand-lockup";
import { TopAppBar } from "@/components/top-app-bar";
import { LocaleSwitcher } from "./locale-switcher";
import { AdminBottomTabBar } from "./admin-bottom-tab-bar";
import { AccountFooter, NavGroupList, NAV_GROUPS, type NavCounts } from "./nav";
import { useUnreadChatCount } from "./chat/use-chat-unread";

// Desktop rail (≥lg): brand · grouped nav (icons + labels + active state +
// count-badge slots) · footer (account/sign-out + locale). Pure CSS `hidden
// lg:flex` — no JS fork, no first-paint flicker.
function AdminRail({ counts, className }: { counts: NavCounts; className?: string }) {
  const { t } = useTranslation("admin");
  return (
    <aside
      className={cn(
        "sticky top-0 h-svh w-56 shrink-0 flex-col border-r border-border bg-card",
        className,
      )}
    >
      <div className="flex h-16 items-center px-4">
        <BrandLockup />
      </div>
      <nav aria-label={t("shell.nav.aria", "Admin")} className="flex-1 overflow-y-auto px-3 py-2">
        <NavGroupList groups={NAV_GROUPS} counts={counts} />
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-border p-3">
        <AccountFooter />
        <LocaleSwitcher />
      </div>
    </aside>
  );
}

// Responsive owner-backoffice shell. ≥lg: fixed rail + fluid content. <lg: top
// app bar + full-width content + bottom tab bar. Content column is `min-w-0` so
// dense tables shrink instead of forcing horizontal overflow.
export function BackofficeShell({ children }: { children?: React.ReactNode }) {
  // Chat unread is the one attention-semantic source wired so far; the heuristic
  // is FE-only and inert without an owner session (see use-chat-unread.ts), so a
  // 0 count renders no badge.
  const counts: NavCounts = { chat: useUnreadChatCount() };
  const { pathname } = useLocation();
  // Form routes carry a sticky Save bar — suppress the mobile tab bar there.
  const isFormRoute =
    /\/admin\/(places|guesthouses)\/(new|[^/]+)$/.test(pathname) || pathname === "/admin/profile";

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <AdminRail counts={counts} className="hidden lg:flex" />
      <TopAppBar counts={counts} className="lg:hidden" />
      <main className="min-w-0 flex-1 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:p-6 lg:pb-6">
        {children ?? <Outlet />}
      </main>
      {!isFormRoute && <AdminBottomTabBar counts={counts} className="lg:hidden" />}
    </div>
  );
}
