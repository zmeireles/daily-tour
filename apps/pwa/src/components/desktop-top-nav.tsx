import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Bookmark, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand-lockup";
import { Overline } from "@/components/overline";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavSection = {
  id: string;
  key: string;
  to: string;
  isActive: (path: string) => boolean;
  withAvatar?: boolean;
};

// Three editorial destinations. Brand = Início (no nav item). Descobrir owns both
// the action drill-downs (/a/*) and place detail (/p/*); active state is a path
// prefix-match, NOT NavLink exact-match, so /p/<id> keeps Descobrir lit.
const SECTIONS: NavSection[] = [
  {
    id: "discover",
    key: "nav.discover",
    to: "/a/see",
    isActive: (p) => p.startsWith("/a") || p.startsWith("/p"),
  },
  { id: "my_day", key: "nav.my_day", to: "/tour/new", isActive: (p) => p.startsWith("/tour") },
  {
    id: "talk",
    key: "nav.talk_to_host",
    to: "/chat",
    isActive: (p) => p.startsWith("/chat"),
    withAvatar: true,
  },
];

// Disabled "coming soon" affordance — out of the focus order (disabled), badged
// via aria-label/title, exempt from contrast minimums as an inactive control.
// Resolves nav-bottombar-disabled-stubs.
function ComingSoonStub({
  icon: Icon,
  label,
  comingSoon,
  className,
}: {
  icon: LucideIcon;
  label: string;
  comingSoon: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      aria-label={`${label} — ${comingSoon}`}
      title={`${label} · ${comingSoon}`}
      className={cn(
        "inline-flex size-9 cursor-not-allowed items-center justify-center rounded-full text-on-surface-variant opacity-70",
        className,
      )}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

// Shared desktop masthead. Mounted only in desktop mode by DesktopAppShell; below
// the breakpoint the shell renders the untouched BrandAppBar instead.
export function DesktopTopNav() {
  const { t } = useTranslation("home");
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-outline-variant bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-8 xl:px-12">
        <Link to="/" aria-label="Daily Tour" className="shrink-0">
          <BrandLockup size="masthead" />
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {SECTIONS.map((s) => {
            const active = s.isActive(pathname);
            return (
              <Link
                key={s.id}
                to={s.to}
                aria-current={active ? "page" : undefined}
                className="group relative flex min-h-[44px] items-center gap-2 px-4"
              >
                {s.withAvatar && (
                  <Avatar className="size-6">
                    <AvatarFallback className="bg-primary text-[10px] font-medium text-primary-foreground">
                      M
                    </AvatarFallback>
                  </Avatar>
                )}
                <Overline
                  className={cn(
                    "transition-colors",
                    active
                      ? "text-on-surface"
                      : "text-on-surface-variant group-hover:text-on-surface",
                  )}
                >
                  {t(s.key)}
                </Overline>
                {/* printed-masthead active underline rule */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 bottom-3 h-0.5 rounded-full bg-primary transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          <span className="mx-1 h-5 w-px bg-outline-variant" aria-hidden="true" />
          {/* Saved collapses out below lg so the masthead doesn't crowd at md/768 */}
          <ComingSoonStub
            icon={Bookmark}
            label={t("nav.saved")}
            comingSoon={t("nav.coming_soon")}
            className="hidden lg:inline-flex"
          />
          <ComingSoonStub icon={User} label={t("nav.profile")} comingSoon={t("nav.coming_soon")} />
        </div>
      </div>
    </header>
  );
}
