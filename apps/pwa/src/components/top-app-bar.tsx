import * as React from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/features/backoffice/locale-switcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AccountFooter,
  NavGroupList,
  NAV_GROUPS,
  useCurrentPageTitle,
  type NavCounts,
} from "@/features/backoffice/nav";

// Mobile top app bar (<lg): brand · current page title · hamburger. The hamburger
// opens a left Sheet holding the full secondary nav, account/sign-out, and the
// locale switcher. Hidden ≥lg (the rail owns navigation there).
export function TopAppBar({ counts, className }: { counts: NavCounts; className?: string }) {
  const { t } = useTranslation("admin");
  const [open, setOpen] = React.useState(false);
  const title = useCurrentPageTitle();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-2 pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <img src="/logo.svg" alt="" className="ml-1 h-8 w-8 shrink-0" />
      <span className="flex-1 truncate font-display text-lg leading-none text-primary">{title}</span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-touch" aria-label={t("shell.nav.menu", "Menu")}>
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        {/* data-app pins the admin token overlay inside the body-level portal. */}
        <SheetContent side="left" data-app="admin" className="w-72 bg-card">
          <SheetHeader>
            <SheetTitle>{t("shell.nav.aria", "Admin")}</SheetTitle>
          </SheetHeader>
          <nav aria-label={t("shell.nav.aria", "Admin")} className="flex-1 overflow-y-auto px-2">
            <NavGroupList groups={NAV_GROUPS} counts={counts} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-border p-3">
            <AccountFooter onNavigate={() => setOpen(false)} />
            <LocaleSwitcher />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
