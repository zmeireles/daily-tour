import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Compass, Bookmark, ConciergeBell, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomTabId = "explore" | "saved" | "host" | "profile";

export type BottomTabBarProps = {
  active?: BottomTabId;
  className?: string;
};

type TabConfig = {
  id: BottomTabId;
  icon: LucideIcon;
  labelKey: string;
};

// Explore is the only LIVE destination today. Saved / Host / Profile are
// guest stubs — rendered as disabled buttons with a "coming soon" affordance.
// Labels come from the `nav.*` i18n keys (the desktop top-nav uses the same set).
const TABS: TabConfig[] = [
  { id: "explore", icon: Compass, labelKey: "nav.explore" },
  { id: "saved", icon: Bookmark, labelKey: "nav.saved" },
  { id: "host", icon: ConciergeBell, labelKey: "nav.host" },
  { id: "profile", icon: User, labelKey: "nav.profile" },
];

function TabIcon({ Icon, isActive }: { Icon: LucideIcon; isActive: boolean }) {
  return (
    <span
      className={cn(
        "flex h-8 w-12 items-center justify-center rounded-full",
        isActive && "bg-primary/10",
      )}
    >
      <Icon size={20} aria-hidden="true" />
    </span>
  );
}

export function BottomTabBar({ active = "explore", className }: BottomTabBarProps) {
  const { t } = useTranslation("home");

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      aria-label="Primary"
    >
      <ul className="flex items-stretch">
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const isActive = active === id;
          const label = t(labelKey);

          if (id === "explore") {
            return (
              <li key={id} className="flex-1">
                <Link
                  to="/"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] flex-col items-center gap-0.5 px-1 py-1.5 transition-colors",
                    isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  <TabIcon Icon={Icon} isActive={isActive} />
                  <span className="text-[11px]">{label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                disabled
                aria-label={`${label} — ${t("nav.coming_soon")}`}
                className="flex min-h-[44px] w-full cursor-not-allowed flex-col items-center gap-0.5 px-1 py-1.5 text-on-surface-variant opacity-60"
              >
                <TabIcon Icon={Icon} isActive={false} />
                <span className="text-[11px]">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
