import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/lib/i18n/formatting-locale";
import { useGuesthouses, type GuesthouseRow } from "./use-guesthouses";
import { Fab } from "@/features/backoffice/fab";
import { StatusBadge } from "@/features/backoffice/status";
import {
  ListPagination,
  SortableHeader,
  paginate,
  sortRows,
  useSortedPage,
} from "@/features/backoffice/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

const PAGE_SIZE = 10;

type SortColumn = "name" | "status" | "updated_at";

function guesthouseDisplayName(gh: GuesthouseRow): string {
  return gh.name["en"] ?? Object.values(gh.name)[0] ?? gh.id;
}

function compareGuesthouses(a: GuesthouseRow, b: GuesthouseRow, column: SortColumn): number {
  if (column === "updated_at") {
    // Newest-changed first on the descending pass, which is the direction an
    // owner actually wants; ascending stays chronological.
    return a.updated_at.localeCompare(b.updated_at);
  }
  const av = column === "name" ? guesthouseDisplayName(a) : a.status;
  const bv = column === "name" ? guesthouseDisplayName(b) : b.status;
  return av.localeCompare(bv);
}

function CoverThumbnail({ mediaId, name }: { mediaId?: string; name: string }) {
  if (mediaId) {
    return (
      <img
        src={`/v1/media/${mediaId}`}
        alt={name}
        className="h-10 w-10 rounded object-cover shrink-0"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground text-sm font-medium shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function GuesthouseList() {
  const { t, i18n } = useTranslation("admin");
  const { data, isLoading, isError, refetch } = useGuesthouses();
  const { sort, page, setPage, handleSort } = useSortedPage<SortColumn>("name");

  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  if (isError) {
    return (
      <ErrorState
        description={t("guesthouses.list.error", "Failed to load guesthouses.")}
        onRetry={() => void refetch()}
      />
    );
  }

  const guesthouses = data?.data ?? [];

  // Sort → slice the current page. Shared with the places list (DAILY-TOUR-154);
  // both collections are small enough to order client-side.
  const sorted = sortRows(guesthouses, sort, compareGuesthouses);
  const { totalPages, currentPage, pageRows } = paginate(sorted, page, PAGE_SIZE);

  const fmt = new Intl.DateTimeFormat(formattingLocale(i18n.language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("guesthouses.list.count", { count: guesthouses.length })}
          </p>
        </div>
        <Button size="sm" asChild className="hidden md:flex">
          <Link to="/admin/guesthouses/new">{t("guesthouses.list.new", "New guesthouse")}</Link>
        </Button>
      </div>

      {guesthouses.length === 0 ? (
        <EmptyState
          icon="Home"
          title={t("empty_states.guesthouses.title", "No guesthouses yet")}
          description={t(
            "empty_states.guesthouses.description",
            "Add a guesthouse so guests can be linked to the right place to stay.",
          )}
          ctaLabel={t("empty_states.guesthouses.cta", "Add your first guesthouse")}
          ctaHref="/admin/guesthouses/new"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium w-12">
                    {t("guesthouses.list.cover", "Cover")}
                  </th>
                  <SortableHeader
                    column="name"
                    label={t("guesthouses.list.name", "Name")}
                    sort={sort}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-2 text-left font-medium">
                    {t("guesthouses.list.address", "Address")}
                  </th>
                  <SortableHeader
                    column="status"
                    label={t("guesthouses.list.status", "Status")}
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    column="updated_at"
                    label={t("guesthouses.list.last_updated", "Last updated")}
                    sort={sort}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-2 text-right font-medium">
                    {t("guesthouses.list.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((gh) => {
                  const name = guesthouseDisplayName(gh);
                  return (
                    <tr key={gh.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <CoverThumbnail mediaId={gh.media[0]} name={name} />
                      </td>
                      <td className="px-4 py-3 font-medium">{name}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                        {gh.address}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge kind="guesthouse" value={gh.status} />
                          {gh.rooms != null && (
                            <span className="text-xs text-muted-foreground">
                              {t("guesthouses.list.rooms_count", { count: gh.rooms })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {fmt.format(new Date(gh.updated_at))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/admin/guesthouses/${gh.id}`}>
                              {t("guesthouses.list.edit", "Edit")}
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex flex-col gap-3">
            {pageRows.map((gh) => {
              const name = guesthouseDisplayName(gh);
              return (
                <Card key={gh.id} className="flex items-center gap-3 p-3">
                  <CoverThumbnail mediaId={gh.media[0]} name={name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{gh.address}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge kind="guesthouse" value={gh.status} />
                      {gh.rooms != null && (
                        <span className="text-xs text-muted-foreground">
                          {t("guesthouses.list.rooms_count", { count: gh.rooms })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("guesthouses.list.updated_at", "Updated {{date}}", {
                        date: fmt.format(new Date(gh.updated_at)),
                      })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild className="shrink-0">
                    <Link to={`/admin/guesthouses/${gh.id}`}>
                      {t("guesthouses.list.edit", "Edit")}
                    </Link>
                  </Button>
                </Card>
              );
            })}
          </div>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Mobile FAB */}
      <Fab to="/admin/guesthouses/new" label={t("guesthouses.list.new", "New guesthouse")} />
    </div>
  );
}
