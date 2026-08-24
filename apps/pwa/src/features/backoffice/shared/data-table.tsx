import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared client-side sort + pagination for the owner-console lists
// (DAILY-TOUR-154). Admin collections are small — tens of rows — so the whole
// fetched set is filtered, sorted and sliced in the browser rather than pushing
// keyset pagination into the API. Extracted from place-list, which shipped it
// first; guesthouses now reuse it instead of growing a second copy.

export type SortDirection = "asc" | "desc";

export interface SortState<C extends string> {
  column: C;
  direction: SortDirection;
}

/**
 * Sort + page state for one list. `handleSort` toggles direction when the same
 * column is clicked again and starts a new column ascending.
 */
export function useSortedPage<C extends string>(initialColumn: C) {
  const [sort, setSort] = useState<SortState<C>>({ column: initialColumn, direction: "asc" });
  const [page, setPage] = useState(1);

  const handleSort = (column: C) => {
    // A re-sort reorders the whole set, so staying on page 3 would show rows
    // unrelated to the click. Filters call setPage(1) for the same reason.
    setPage(1);
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  };

  return { sort, page, setPage, handleSort };
}

/**
 * Order `rows` by the active column, delegating the per-column comparison to
 * the caller. Ties break on `id` so equal keys keep a stable order instead of
 * jittering between renders.
 */
export function sortRows<T extends { id: string }, C extends string>(
  rows: T[],
  sort: SortState<C>,
  compare: (a: T, b: T, column: C) => number,
): T[] {
  return [...rows].sort((a, b) => {
    const primary = compare(a, b, sort.column);
    const ordered = sort.direction === "asc" ? primary : -primary;
    return ordered !== 0 ? ordered : a.id.localeCompare(b.id);
  });
}

/**
 * Slice one page out of `rows`. `currentPage` is clamped to the available range
 * so a shrinking result set (a filter that now matches less) can never leave the
 * caller rendering an empty page.
 */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  return {
    totalPages,
    currentPage,
    pageRows: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}

export function SortableHeader<C extends string>({
  column,
  label,
  sort,
  onSort,
  className = "",
}: {
  column: C;
  label: string;
  sort: SortState<C>;
  onSort: (column: C) => void;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  const active = sort.column === column;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const Icon = active ? (sort.direction === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className={`px-4 py-2 text-left font-medium ${className}`} aria-sort={ariaSort}>
      <button
        type="button"
        className="flex items-center gap-1 font-medium hover:text-foreground"
        aria-label={t("list.sort_by", "Sort by {{column}}", { column: label })}
        onClick={() => onSort(column)}
      >
        {label}
        <Icon
          className={active ? "size-3.5" : "size-3.5 text-muted-foreground"}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

export function ListPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation("admin");

  // A single page needs no controls — every consumer would otherwise repeat
  // this guard at the call site.
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-3 text-sm">
      <span className="text-muted-foreground">
        {t("list.pagination.page", "Page {{page}} of {{total}}", {
          page: currentPage,
          total: totalPages,
        })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        {t("list.pagination.previous", "Previous")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        {t("list.pagination.next", "Next")}
      </Button>
    </div>
  );
}
