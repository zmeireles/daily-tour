import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MoreVertical, Search } from "lucide-react";
import { Fab } from "@/features/backoffice/fab";
import {
  ListPagination,
  SortableHeader,
  paginate,
  sortRows,
  useSortedPage,
} from "@/features/backoffice/shared/data-table";
import type { PlaceStatus } from "@daily-tour/shared-types";
import { usePlaces, useArchivePlace, useUpdatePlace, type PlaceRow } from "./use-places";
import {
  useGuesthouses,
  useToggleHiddenPlace,
  type GuesthouseRow,
} from "../guesthouses/use-guesthouses";
import { StatusBadge } from "@/features/backoffice/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

const PAGE_SIZE = 10;

// Plan-006 6.D — soft cap on host's picks per guesthouse. Warns (does NOT block,
// no DB constraint) when marking a pick beyond the cap within the visible set.
const HOSTS_PICK_CAP = 8;

// Status filter chips, in the same order the shared status source lists them.
const STATUS_ORDER: PlaceStatus[] = ["published", "owner_approved", "draft", "archived"];
// Content locales an owner curates place copy in (matches the src/locales dirs).
const LOCALES = ["en", "pt-PT", "es"] as const;

type SortColumn = "name" | "status" | "hosts_pick";
type StatusFilter = PlaceStatus | "all";
type LocaleFilter = (typeof LOCALES)[number] | "all";

// Client-side MVP (DAILY-TOUR-154): the catalogue is ~28 rows, so filter, sort +
// paginate the full fetched set in the browser rather than building server-side
// keyset sort.
function comparePlaces(a: PlaceRow, b: PlaceRow, column: SortColumn): number {
  if (column === "hosts_pick") {
    // picks first on asc (true sorts before false)
    return Number(b.is_hosts_pick) - Number(a.is_hosts_pick);
  }
  const av = column === "name" ? placeDisplayName(a) : a.status;
  const bv = column === "name" ? placeDisplayName(b) : b.status;
  return av.localeCompare(bv);
}

function placeDisplayName(place: PlaceRow): string {
  return place.name["en"] ?? Object.values(place.name)[0] ?? place.id;
}

// §8.2 filters — client-side over the fetched set. Status chip, content-locale
// chip (place has copy in that locale) + a case-insensitive name search.
function matchesFilters(
  place: PlaceRow,
  statusFilter: StatusFilter,
  localeFilter: LocaleFilter,
  query: string,
): boolean {
  if (statusFilter !== "all" && place.status !== statusFilter) return false;
  if (localeFilter !== "all" && !place.name[localeFilter]?.trim()) return false;
  const q = query.trim().toLowerCase();
  if (q && !Object.values(place.name).some((n) => n.toLowerCase().includes(q))) return false;
  return true;
}

// Per-row so each instance owns its own useUpdatePlace(place.id). Soft-cap warn
// + 422 error handling preserved verbatim; NOT optimistic (that's T-8.2.5).
function HostsPickToggle({ place, pickCount }: { place: PlaceRow; pickCount: number }) {
  const { t } = useTranslation("admin");
  const mutation = useUpdatePlace(place.id);
  const name = placeDisplayName(place);
  const markingNewPick = !place.is_hosts_pick;

  return (
    <Switch
      checked={place.is_hosts_pick}
      disabled={mutation.isPending}
      aria-label={t("places.list.hosts_pick_aria", "Toggle host's pick for {{name}}", { name })}
      onCheckedChange={() => {
        if (markingNewPick && pickCount >= HOSTS_PICK_CAP) {
          toast.warning(
            t("places.list.pick_cap_warning", {
              defaultValue:
                "You already have {{count}} host's picks — guests see best results with around {{cap}}. Saved anyway.",
              count: pickCount,
              cap: HOSTS_PICK_CAP,
            }),
          );
        }
        mutation.mutate(
          { is_hosts_pick: !place.is_hosts_pick },
          {
            onSuccess: () => toast.success(t("places.list.pick_success", "Pick updated")),
            onError: (err) => {
              const status = (err as { status?: number }).status;
              toast.error(
                status === 422
                  ? t(
                      "places.list.pick_requires_published",
                      "Only published places can be marked as a host's pick.",
                    )
                  : t("places.list.pick_update_error", "Could not update host's pick."),
              );
            },
          },
        );
      }}
    />
  );
}

// Plan-006 6.A.3 — per-row guest-visibility toggle. `gh` is the owner's guesthouse
// (single-owner v1: the first row). A place whose id is in gh.hidden_place_ids is
// hidden from this guesthouse's guests (see BFF discover filter, 6.A.2). Switch on
// = visible to guests.
function VisibilityToggle({ place, gh }: { place: PlaceRow; gh?: GuesthouseRow }) {
  const { t } = useTranslation("admin");
  const mutation = useToggleHiddenPlace();
  const name = placeDisplayName(place);

  if (!gh) {
    return (
      <span className="text-muted-foreground" aria-hidden="true">
        —
      </span>
    );
  }
  const hidden = gh.hidden_place_ids.includes(place.id);

  return (
    <Switch
      checked={!hidden}
      disabled={mutation.isPending}
      aria-label={t("places.list.visibility_aria", "Toggle guest visibility for {{name}}", {
        name,
      })}
      onCheckedChange={() =>
        mutation.mutate(
          { guesthouseId: gh.id, placeId: place.id, hide: !hidden },
          {
            onSuccess: () =>
              toast.success(t("places.list.visibility_success", "Visibility updated")),
            onError: () =>
              toast.error(t("places.list.visibility_error", "Could not update visibility.")),
          },
        )
      }
    />
  );
}

// Trailing actions shared by both surfaces: primary Edit + a kebab holding the
// destructive Archive. Archive opens an AlertDialog confirm (T-8.2.5). Follows the
// shadcn "dialog inside dropdown" pattern — AlertDialog wraps the menu, the item is
// the AlertDialogTrigger, and `onSelect` preventDefault hands focus to the dialog.
// `compact` = the dense desktop table cell.
function PlaceRowActions({
  place,
  archiveMutation,
  compact,
}: {
  place: PlaceRow;
  archiveMutation: ReturnType<typeof useArchivePlace>;
  compact?: boolean;
}) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const name = placeDisplayName(place);
  const actionSize = compact ? "sm" : "touch";

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size={actionSize}
        variant="outline"
        onClick={() => void navigate(`/admin/places/${place.id}`)}
      >
        {t("places.list.edit", "Edit")}
      </Button>
      {place.status !== "archived" && (
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size={compact ? "icon" : "icon-touch"}
                variant="ghost"
                aria-label={t("places.list.more_actions", "More actions for {{name}}", { name })}
              >
                <MoreVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AlertDialogTrigger asChild>
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  {t("places.archive.button", "Archive")}
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("places.archive.confirm", "Archive this place?")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "places.archive.description",
                  "It will be hidden from guests and moved to your archive. You can restore it later.",
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("places.archive.no", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                disabled={archiveMutation.isPending}
                onClick={() =>
                  archiveMutation.mutate(place.id, {
                    onSuccess: () => toast.success(t("places.archive.success", "Place archived")),
                  })
                }
              >
                {t("places.archive.yes", "Archive")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export function PlaceList() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePlaces();
  const { data: ghData } = useGuesthouses();
  const gh = ghData?.data?.[0];
  const archiveMutation = useArchivePlace();
  const { sort, page, setPage, handleSort } = useSortedPage<SortColumn>("name");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>("all");
  const [query, setQuery] = useState("");

  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  if (isError) {
    return (
      <ErrorState
        description={t("places.list.error", "Failed to load places.")}
        onRetry={() => void refetch()}
      />
    );
  }

  const places = data?.data ?? [];
  // 6.D — current host's picks visible to this guesthouse's guests (not hidden).
  // NOTE: counted across the FULL set, never the filtered/paged slice, so the soft
  // cap stays correct regardless of filter/sort/pagination.
  const visiblePickCount = places.filter(
    (p) => p.is_hosts_pick && !(gh?.hidden_place_ids.includes(p.id) ?? false),
  ).length;

  // Filter → sort → slice the current page.
  const filtered = places.filter((p) => matchesFilters(p, statusFilter, localeFilter, query));
  const sorted = sortRows(filtered, sort, comparePlaces);
  const { totalPages, currentPage, pageRows } = paginate(sorted, page, PAGE_SIZE);

  // Filter/search changes reset to page 1 so the current page stays in range.
  const onStatusChange = (v: string) => {
    setStatusFilter((v || "all") as StatusFilter);
    setPage(1);
  };
  const onLocaleChange = (v: string) => {
    setLocaleFilter((v || "all") as LocaleFilter);
    setPage(1);
  };
  const onQueryChange = (v: string) => {
    setQuery(v);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{t("places.title", "Places")}</h1>
          {places.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("places.list.count", { count: filtered.length })}
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="hidden md:inline-flex"
          onClick={() => void navigate("/admin/places/new")}
        >
          {t("places.list.new", "New place")}
        </Button>
      </div>

      {places.length === 0 ? (
        <EmptyState
          icon="MapPin"
          title={t("empty_states.places.title", "No places yet")}
          description={t(
            "empty_states.places.description",
            "Add the spots you love so your guests can eat, drink, see and do like a local.",
          )}
          ctaLabel={t("empty_states.places.cta", "Add your first place")}
          ctaHref="/admin/places/new"
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t("places.list.search_placeholder", "Search places")}
                aria-label={t("places.list.search_placeholder", "Search places")}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                value={statusFilter}
                onValueChange={onStatusChange}
                variant="outline"
                size="sm"
                aria-label={t("places.list.filter_status_aria", "Filter by status")}
              >
                <ToggleGroupItem value="all">{t("places.list.filter_all", "All")}</ToggleGroupItem>
                {STATUS_ORDER.map((s) => (
                  <ToggleGroupItem key={s} value={s}>
                    {t(`status.place.${s}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <ToggleGroup
                type="single"
                value={localeFilter}
                onValueChange={onLocaleChange}
                variant="outline"
                size="sm"
                aria-label={t("places.list.filter_locale_aria", "Filter by language")}
              >
                <ToggleGroupItem value="all">{t("places.list.filter_all", "All")}</ToggleGroupItem>
                {LOCALES.map((loc) => (
                  <ToggleGroupItem key={loc} value={loc}>
                    {t(`shell.locale.${loc}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          {pageRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("places.list.no_matches", "No places match your filters.")}
            </p>
          ) : (
            <>
              {/* ≥ md: dense table with sortable headers. */}
              <div className="hidden overflow-hidden rounded-md border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <SortableHeader
                        column="name"
                        label={t("places.list.name", "Name")}
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        column="status"
                        label={t("places.list.status", "Status")}
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        column="hosts_pick"
                        label={t("places.list.hosts_pick", "Host's Pick")}
                        sort={sort}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-2 text-left font-medium">
                        {t("places.list.visibility", "Visibility")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        {t("places.list.address", "Address")}
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        {t("places.list.actions", "Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((place) => (
                      <tr key={place.id} className="border-t transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{placeDisplayName(place)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="place" value={place.status} />
                        </td>
                        <td className="px-4 py-3">
                          <HostsPickToggle place={place} pickCount={visiblePickCount} />
                        </td>
                        <td className="px-4 py-3">
                          <VisibilityToggle place={place} gh={gh} />
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                          {place.address}
                        </td>
                        <td className="px-4 py-3">
                          <PlaceRowActions
                            place={place}
                            archiveMutation={archiveMutation}
                            compact
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* < md: one card per place. */}
              <ul className="flex flex-col gap-3 md:hidden">
                {pageRows.map((place) => {
                  const hidden = gh?.hidden_place_ids.includes(place.id) ?? false;
                  return (
                    <li key={place.id}>
                      <Card className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-medium">{placeDisplayName(place)}</h3>
                            <p className="truncate text-sm text-muted-foreground">
                              {place.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge kind="place" value={place.status} />
                          {place.is_hosts_pick && <StatusBadge kind="flag" value="hosts_pick" />}
                          {hidden && <StatusBadge kind="flag" value="hidden" />}
                        </div>
                        <div className="flex flex-col gap-2 border-t pt-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                              {t("places.list.hosts_pick", "Host's Pick")}
                            </span>
                            <HostsPickToggle place={place} pickCount={visiblePickCount} />
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                              {t("places.list.visibility", "Visibility")}
                            </span>
                            <VisibilityToggle place={place} gh={gh} />
                          </div>
                        </div>
                        <PlaceRowActions place={place} archiveMutation={archiveMutation} />
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Mobile create affordance. */}
      <Fab to="/admin/places/new" label={t("places.list.new", "New place")} />
    </div>
  );
}
