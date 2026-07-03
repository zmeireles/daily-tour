import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { usePlaces, useArchivePlace, useUpdatePlace, type PlaceRow } from "./use-places";
import {
  useGuesthouses,
  useToggleHiddenPlace,
  type GuesthouseRow,
} from "../guesthouses/use-guesthouses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

const PAGE_SIZE = 10;

type SortColumn = "name" | "status" | "hosts_pick";
type SortDirection = "asc" | "desc";
interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

// Client-side MVP (DAILY-TOUR-154): the catalogue is ~28 rows, so sort + paginate
// the full fetched set in the browser rather than building server-side keyset sort.
function comparePlaces(a: PlaceRow, b: PlaceRow, column: SortColumn): number {
  if (column === "hosts_pick") {
    // picks first on asc (true sorts before false)
    return Number(b.is_hosts_pick) - Number(a.is_hosts_pick);
  }
  const av = column === "name" ? placeDisplayName(a) : a.status;
  const bv = column === "name" ? placeDisplayName(b) : b.status;
  return av.localeCompare(bv);
}

function sortPlaces(places: PlaceRow[], sort: SortState): PlaceRow[] {
  return [...places].sort((a, b) => {
    const primary = comparePlaces(a, b, sort.column);
    const ordered = sort.direction === "asc" ? primary : -primary;
    // Stable secondary sort by id so equal keys don't jitter across renders.
    return ordered !== 0 ? ordered : a.id.localeCompare(b.id);
  });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published") return "default";
  if (status === "archived") return "destructive";
  if (status === "owner_approved") return "secondary";
  return "outline";
}

function placeDisplayName(place: PlaceRow): string {
  return place.name["en"] ?? Object.values(place.name)[0] ?? place.id;
}

// Plan-006 6.D — soft cap on host's picks per guesthouse. Warns (does NOT block,
// no DB constraint) when marking a pick beyond the cap within the visible set.
const HOSTS_PICK_CAP = 8;

function HostsPickToggle({ place, pickCount }: { place: PlaceRow; pickCount: number }) {
  const { t } = useTranslation("admin");
  const mutation = useUpdatePlace(place.id);
  const name = placeDisplayName(place);

  const markingNewPick = !place.is_hosts_pick;

  return (
    <div className="flex items-center gap-2">
      {place.is_hosts_pick ? (
        <Badge variant="default">{t("places.list.pick_badge", "Pick")}</Badge>
      ) : (
        <span className="text-muted-foreground" aria-hidden="true">
          —
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={mutation.isPending}
        aria-label={t("places.list.hosts_pick_aria", "Toggle host's pick for {{name}}", { name })}
        onClick={() => {
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
      >
        {place.is_hosts_pick
          ? t("places.list.unmark_pick", "Unmark")
          : t("places.list.mark_pick", "Mark pick")}
      </Button>
    </div>
  );
}

// Plan-006 6.A.3 — per-row guest-visibility toggle. `gh` is the owner's guesthouse
// (single-owner v1: the first row). A place whose id is in gh.hidden_place_ids is
// hidden from this guesthouse's guests (see BFF discover filter, 6.A.2).
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
    <div className="flex items-center gap-2">
      {hidden ? (
        <Badge variant="secondary">{t("places.list.hidden_badge", "Hidden")}</Badge>
      ) : (
        <span className="text-muted-foreground" aria-hidden="true">
          —
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={mutation.isPending}
        aria-label={t("places.list.visibility_aria", "Toggle guest visibility for {{name}}", {
          name,
        })}
        onClick={() =>
          mutation.mutate(
            { guesthouseId: gh.id, placeId: place.id, hide: !hidden },
            {
              onError: () =>
                toast.error(t("places.list.visibility_error", "Could not update visibility.")),
            },
          )
        }
      >
        {hidden ? t("places.list.show_place", "Show") : t("places.list.hide_place", "Hide")}
      </Button>
    </div>
  );
}

function SortableHeader({
  column,
  label,
  sort,
  onSort,
  className = "",
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
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
        aria-label={t("places.list.sort_by", "Sort by {{column}}", { column: label })}
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

export function PlaceList() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePlaces();
  const { data: ghData } = useGuesthouses();
  const gh = ghData?.data?.[0];
  const archiveMutation = useArchivePlace();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" });
  const [page, setPage] = useState(1);

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
  // NOTE: counted across the FULL set, never the current page slice, so the soft
  // cap stays correct regardless of sort/pagination.
  const visiblePickCount = places.filter(
    (p) => p.is_hosts_pick && !(gh?.hidden_place_ids.includes(p.id) ?? false),
  ).length;

  // Sort across the whole set, then slice the current page.
  const sorted = sortPlaces(places, sort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (column: SortColumn) => {
    setPage(1); // sort change resets to page 1
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("places.title", "Places")}</h1>
        <Button size="sm" onClick={() => void navigate("/admin/places/new")}>
          {t("places.new", "New Place")}
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
        <div className="rounded-md border overflow-hidden">
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
                  {t("places.list.guests", "Guests")}
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
                <tr key={place.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {place.name["en"] ?? Object.values(place.name)[0] ?? place.id}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(place.status)}>{place.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <HostsPickToggle place={place} pickCount={visiblePickCount} />
                  </td>
                  <td className="px-4 py-3">
                    <VisibilityToggle place={place} gh={gh} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {place.address}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void navigate(`/admin/places/${place.id}`)}
                      >
                        {t("places.list.edit", "Edit")}
                      </Button>
                      {place.status !== "archived" &&
                        (confirmId === place.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={archiveMutation.isPending}
                              onClick={() => {
                                archiveMutation.mutate(place.id, {
                                  onSuccess: () => setConfirmId(null),
                                });
                              }}
                            >
                              {t("places.archive.yes", "Archive")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                              {t("places.archive.no", "Cancel")}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setConfirmId(place.id)}>
                            {t("places.archive.button", "Archive")}
                          </Button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {places.length > 0 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-muted-foreground">
            {t("places.list.pagination.page", "Page {{page}} of {{total}}", {
              page: currentPage,
              total: totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("places.list.pagination.previous", "Previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("places.list.pagination.next", "Next")}
          </Button>
        </div>
      )}
    </div>
  );
}
