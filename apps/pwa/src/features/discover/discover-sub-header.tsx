import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CategorySegmented } from "./category-segmented";

// The single control band for desktop Discover (below the TopNav): the editorial
// title + the visible category segmented + the RELOCATED search (lifted out of
// the floating over-map overlay) + the result count. Exactly one search and one
// category control on the screen.
export function DiscoverSubHeader({
  action,
  search,
  onSearchChange,
  count,
}: {
  action: string;
  search: string;
  onSearchChange: (value: string) => void;
  count: number;
}) {
  const { t } = useTranslation("discover");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <h1 className="mr-auto font-display text-3xl leading-none text-on-surface">{t("title")}</h1>
      <CategorySegmented action={action} />
      <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2">
        <Search size={16} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("map.search_placeholder")}
          aria-label={t("map.search_placeholder")}
          className="w-44 border-none bg-transparent p-0 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0"
        />
      </div>
      <span className="text-sm text-on-surface-variant">
        {count} {t("nearby.title", { defaultValue: "Por perto" })}
      </span>
    </div>
  );
}
