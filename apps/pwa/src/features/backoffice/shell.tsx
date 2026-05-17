import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { key: "guesthouses", to: "/admin/guesthouses" },
  { key: "places", to: "/admin/places" },
  { key: "reservations", to: "/admin/reservations" },
  { key: "profile", to: "/admin/profile" },
] as const;

export function BackofficeShell({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation("admin");

  return (
    <div className="min-h-svh flex">
      <nav
        className="w-56 shrink-0 border-r bg-sidebar"
        aria-label={t("shell.nav.guesthouses", "Navigation")}
      >
        <ul className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ key, to }) => (
            <li key={key}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {t(`shell.nav.${key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">{children ?? <Outlet />}</main>
    </div>
  );
}
