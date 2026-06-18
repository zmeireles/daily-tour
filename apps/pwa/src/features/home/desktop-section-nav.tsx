import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Overline } from "@/components/overline";
import { ACTIONS } from "@/features/home/actions";

// The 6 action verbs as NAVIGATION (not bento): bounded fixed-height section-
// opener cards. Icon + label sit in the SAME bounded card (not icon-top /
// label-bottom on an aspect-square tile), so the degenerate-tile mismatch
// artifact cannot recur. Whole card is a ≥44px link. 6-up at lg, 3-up below.
export function DesktopSectionNav() {
  const { t } = useTranslation("home");

  return (
    <nav aria-label={t("nav.discover")} className="grid grid-cols-3 gap-3 lg:grid-cols-6">
      {ACTIONS.map(({ slug, Icon, key }) => (
        <Link
          key={slug}
          to={`/a/${slug}`}
          className="group flex min-h-[110px] flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-low p-4 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center justify-between">
            <Icon size={24} aria-hidden="true" className="text-primary" />
            <ChevronRight
              size={18}
              aria-hidden="true"
              className="text-on-surface-variant transition-transform group-hover:translate-x-0.5"
            />
          </span>
          <Overline>{t(key)}</Overline>
        </Link>
      ))}
    </nav>
  );
}
