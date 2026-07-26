import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  renderHook,
  waitFor,
  act,
} from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { PlaceList } from "@/features/backoffice/places/place-list";
import type { PlaceRow } from "@/features/backoffice/places/use-places";

// Radix menus rely on pointer-capture / scrollIntoView APIs jsdom doesn't implement.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/features/backoffice/places/use-places", () => ({
  usePlaces: vi.fn(),
  useArchivePlace: vi.fn(),
  useUpdatePlace: vi.fn(),
}));

vi.mock("@/features/backoffice/guesthouses/use-guesthouses", () => ({
  useGuesthouses: vi.fn(),
  useToggleHiddenPlace: vi.fn(),
}));

const { usePlaces, useArchivePlace, useUpdatePlace } =
  await import("@/features/backoffice/places/use-places");
const { useGuesthouses, useToggleHiddenPlace } =
  await import("@/features/backoffice/guesthouses/use-guesthouses");

const mockUsePlaces = vi.mocked(usePlaces);
const mockUseArchivePlace = vi.mocked(useArchivePlace);
const mockUseUpdatePlace = vi.mocked(useUpdatePlace);
const mockUseGuesthouses = vi.mocked(useGuesthouses);
const mockUseToggleHiddenPlace = vi.mocked(useToggleHiddenPlace);

const updateMutate = vi.fn();
const archiveMutate = vi.fn();
const toggleMutate = vi.fn();

function setGuesthouse(hidden_place_ids: string[]) {
  mockUseGuesthouses.mockReturnValue({
    data: { data: [{ id: "gh1", hidden_place_ids }], nextCursor: null },
  } as unknown as ReturnType<typeof useGuesthouses>);
}

function makePlace(over: Partial<PlaceRow>): PlaceRow {
  return {
    id: "p1",
    name: { en: "Place" },
    description: { en: "" },
    address: "Somewhere",
    status: "published",
    geom_lat: 0,
    geom_lng: 0,
    is_hosts_pick: false,
    source_kind: "manual",
    source_ref: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function setPlaces(places: PlaceRow[]) {
  mockUsePlaces.mockReturnValue({
    data: { data: places, nextCursor: null },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof usePlaces>);
}

function renderList() {
  const router = createMemoryRouter([{ path: "/", element: <PlaceList /> }], {
    initialEntries: ["/"],
  });
  return render(<RouterProvider router={router} />);
}

// The reflow renders BOTH surfaces in jsdom (it doesn't evaluate the
// `hidden md:table` / `md:hidden` classes), so any text/label that appears on
// both would match twice. Scope every assertion to one surface: the desktop
// `<table>` or the mobile card `<ul>`.
function getTable(container: HTMLElement): HTMLElement {
  return container.querySelector("table") as HTMLElement;
}
function getCards(container: HTMLElement): HTMLElement {
  return container.querySelector("ul") as HTMLElement;
}
// Name column (first cell) of each desktop row, in render order.
function tableNames(container: HTMLElement): (string | null)[] {
  return Array.from(getTable(container).querySelectorAll("tbody tr")).map(
    (tr) => tr.querySelector("td")?.textContent ?? null,
  );
}

describe("PlaceList — reflow, status source + controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArchivePlace.mockReturnValue({
      mutate: archiveMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useArchivePlace>);
    mockUseUpdatePlace.mockReturnValue({
      mutate: updateMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePlace>);
    mockUseToggleHiddenPlace.mockReturnValue({
      mutate: toggleMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useToggleHiddenPlace>);
    setGuesthouse([]); // default: nothing hidden
  });

  it("shows the load-error string when the query fails", () => {
    mockUsePlaces.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePlaces>);

    renderList();

    expect(screen.getByText("Failed to load places.")).toBeInTheDocument();
  });

  it("renders the shared StatusBadge localized label, never the raw enum", () => {
    setPlaces([makePlace({ id: "p1", name: { en: "Solar" }, status: "published" })]);

    const { container } = renderList();

    // "published" → localized "Live"; the raw enum must not leak.
    expect(within(getTable(container)).getByText("Live")).toBeInTheDocument();
    expect(within(getTable(container)).queryByText("published")).not.toBeInTheDocument();
    // Count subtitle reflects the (filtered) total.
    expect(screen.getByText("1 place")).toBeInTheDocument();
  });

  it("reflects each row's is_hosts_pick on the pick switch + shows the flag on the card", () => {
    setPlaces([
      makePlace({ id: "pick", name: { en: "Lagoa" }, is_hosts_pick: true }),
      makePlace({ id: "non", name: { en: "Bistro" }, is_hosts_pick: false }),
    ]);

    const { container } = renderList();
    const table = getTable(container);

    // Desktop pick switch mirrors state.
    expect(within(table).getByLabelText("Toggle host's pick for Lagoa")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(table).getByLabelText("Toggle host's pick for Bistro")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    // Mobile card surfaces the localized pick flag (StatusBadge) for the picked place.
    expect(within(getCards(container)).getByText("Pick")).toBeInTheDocument();

    // Each row wires up its own per-place mutation hook.
    expect(useUpdatePlace).toHaveBeenCalledWith("pick");
    expect(useUpdatePlace).toHaveBeenCalledWith("non");
  });

  it("clicking the pick switch calls the update mutation with the flipped is_hosts_pick", () => {
    setPlaces([
      makePlace({ id: "pick", name: { en: "Lagoa" }, is_hosts_pick: true }),
      makePlace({ id: "non", name: { en: "Bistro" }, is_hosts_pick: false }),
    ]);

    const { container } = renderList();
    const table = getTable(container);

    fireEvent.click(within(table).getByLabelText("Toggle host's pick for Bistro"));
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());

    fireEvent.click(within(table).getByLabelText("Toggle host's pick for Lagoa"));
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: false }, expect.anything());
  });

  it("surfaces an error toast when the backend rejects the toggle with 422", () => {
    setPlaces([makePlace({ id: "non", name: { en: "Bistro" }, status: "draft" })]);

    const { container } = renderList();

    fireEvent.click(within(getTable(container)).getByLabelText("Toggle host's pick for Bistro"));

    // The component passes an onError handler to mutate; simulate the catalog-svc 422.
    const onError = updateMutate.mock.calls[0]?.[1]?.onError as (err: unknown) => void;
    expect(onError).toBeTypeOf("function");
    onError(Object.assign(new Error("update place 422"), { status: 422 }));

    expect(toast.error).toHaveBeenCalledWith(
      "Only published places can be marked as a host's pick.",
    );
  });

  it("warns (but still saves) when marking a pick past the soft cap (Plan-006 6.D)", () => {
    // 8 visible picks already → marking a 9th is over the cap.
    const picks = Array.from({ length: 8 }, (_, i) =>
      makePlace({ id: `pick${i}`, name: { en: `Pick ${i}` }, is_hosts_pick: true }),
    );
    setPlaces([...picks, makePlace({ id: "ninth", name: { en: "Ninth" }, is_hosts_pick: false })]);

    const { container } = renderList();

    fireEvent.click(within(getTable(container)).getByLabelText("Toggle host's pick for Ninth"));

    expect(toast.warning).toHaveBeenCalledTimes(1);
    // Saving still proceeds — the cap is a soft warning, not a block.
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());
  });

  it("does not warn when marking a pick under the cap", () => {
    const picks = Array.from({ length: 3 }, (_, i) =>
      makePlace({ id: `pick${i}`, name: { en: `Pick ${i}` }, is_hosts_pick: true }),
    );
    setPlaces([...picks, makePlace({ id: "next", name: { en: "Next" }, is_hosts_pick: false })]);

    const { container } = renderList();

    fireEvent.click(within(getTable(container)).getByLabelText("Toggle host's pick for Next"));

    expect(toast.warning).not.toHaveBeenCalled();
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());
  });

  it("sorts rows by name when the Name header is clicked, and reverses on a second click", () => {
    setPlaces([
      makePlace({ id: "c", name: { en: "Cherry" } }),
      makePlace({ id: "a", name: { en: "Apple" } }),
      makePlace({ id: "b", name: { en: "Banana" } }),
    ]);

    const { container } = renderList();
    const nameHeader = within(getTable(container)).getByLabelText("Sort by Name");

    // Default sort is name asc.
    expect(tableNames(container)).toEqual(["Apple", "Banana", "Cherry"]);

    // Click toggles to desc.
    fireEvent.click(nameHeader);
    expect(tableNames(container)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  it("paginates at 10 per page, advancing with Next (DAILY-TOUR-154)", () => {
    // 12 places named so the asc-name order is deterministic (P00..P11).
    const many = Array.from({ length: 12 }, (_, i) =>
      makePlace({ id: `p${i}`, name: { en: `P${String(i).padStart(2, "0")}` } }),
    );
    setPlaces(many);

    const { container } = renderList();

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    // Only 10 rows on page 1: P00..P09 present, P10/P11 absent.
    expect(tableNames(container)).toContain("P00");
    expect(tableNames(container)).toContain("P09");
    expect(tableNames(container)).not.toContain("P10");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(tableNames(container)).toContain("P10");
    expect(tableNames(container)).toContain("P11");
    expect(tableNames(container)).not.toContain("P00");
  });

  it("counts the pick cap across the full set, not just the visible page (6.D + 154)", () => {
    // 9 non-pick fillers ("Bbb …") + the target ("Aaa target", sorts first) fill
    // page 1; the 8 picks ("Zzz …") sort onto page 2. Marking a 9th pick must still
    // warn, proving the cap counts the whole set, not the current page slice.
    const fillers = Array.from({ length: 9 }, (_, i) =>
      makePlace({ id: `fill${i}`, name: { en: `Bbb ${i}` }, is_hosts_pick: false }),
    );
    const picks = Array.from({ length: 8 }, (_, i) =>
      makePlace({ id: `pick${i}`, name: { en: `Zzz ${i}` }, is_hosts_pick: true }),
    );
    const target = makePlace({ id: "target", name: { en: "Aaa target" }, is_hosts_pick: false });
    setPlaces([...fillers, ...picks, target]);

    const { container } = renderList();

    // The 8 picks live on page 2 ("Zzz …"); the target is on page 1 ("Aaa …").
    fireEvent.click(
      within(getTable(container)).getByLabelText("Toggle host's pick for Aaa target"),
    );

    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());
  });

  it("guest-visibility switch reflects the gh hidden set + flips it (Plan-006 6.A.3)", () => {
    setGuesthouse(["pick"]); // gh hides "pick"; "non" stays visible
    setPlaces([
      makePlace({ id: "pick", name: { en: "Lagoa" } }),
      makePlace({ id: "non", name: { en: "Bistro" } }),
    ]);

    const { container } = renderList();
    const table = getTable(container);

    // Hidden row: switch off (not visible); visible row: switch on.
    expect(within(table).getByLabelText("Toggle guest visibility for Lagoa")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(within(table).getByLabelText("Toggle guest visibility for Bistro")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    // Mobile card surfaces the localized "Hidden" flag for the hidden place.
    expect(within(getCards(container)).getByText("Hidden")).toBeInTheDocument();

    // Hide the visible one → PUT (hide:true).
    fireEvent.click(within(table).getByLabelText("Toggle guest visibility for Bistro"));
    expect(toggleMutate).toHaveBeenCalledWith(
      { guesthouseId: "gh1", placeId: "non", hide: true },
      expect.anything(),
    );

    // Show the hidden one → DELETE (hide:false).
    fireEvent.click(within(table).getByLabelText("Toggle guest visibility for Lagoa"));
    expect(toggleMutate).toHaveBeenCalledWith(
      { guesthouseId: "gh1", placeId: "pick", hide: false },
      expect.anything(),
    );
  });

  it("filters the list by the status chip", () => {
    setPlaces([
      makePlace({ id: "pub", name: { en: "Solar" }, status: "published" }),
      makePlace({ id: "dr", name: { en: "Barn" }, status: "draft" }),
    ]);

    const { container } = renderList();

    // "Draft" chip = the localized status label from the shared source. Radix
    // single ToggleGroup renders items as role="radio".
    fireEvent.click(screen.getByRole("radio", { name: "Draft" }));

    expect(tableNames(container)).toEqual(["Barn"]);
  });

  it("filters the list by the name search box", () => {
    setPlaces([
      makePlace({ id: "pub", name: { en: "Solar" }, status: "published" }),
      makePlace({ id: "dr", name: { en: "Barn" }, status: "draft" }),
    ]);

    const { container } = renderList();

    fireEvent.change(screen.getByLabelText("Search places"), { target: { value: "sol" } });

    expect(tableNames(container)).toEqual(["Solar"]);
  });

  // The kebab's Archive item opens a Radix AlertDialog (T-8.2.5). Radix menus only
  // open via the keyboard path in jsdom (pointer internals are absent), so drive
  // the desktop kebab with focus + Enter, then activate the item.
  function openArchiveDialog(container: HTMLElement, name: string) {
    const kebab = within(getTable(container)).getByLabelText(`More actions for ${name}`);
    kebab.focus();
    fireEvent.keyDown(kebab, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    return screen.getByRole("alertdialog");
  }

  it("archive kebab opens an AlertDialog; confirming archives + toasts success", () => {
    archiveMutate.mockImplementation((_id: string, opts?: { onSuccess?: () => void }) =>
      opts?.onSuccess?.(),
    );
    setPlaces([makePlace({ id: "p1", name: { en: "Solar" }, status: "published" })]);

    const { container } = renderList();
    const dialog = openArchiveDialog(container, "Solar");

    // The dialog states the consequence, not just the title.
    expect(within(dialog).getByText("Archive this place?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    expect(archiveMutate).toHaveBeenCalledWith("p1", expect.anything());
    expect(toast.success).toHaveBeenCalledWith("Place archived");
  });

  it("cancelling the archive dialog does not archive", () => {
    setPlaces([makePlace({ id: "p1", name: { en: "Solar" }, status: "published" })]);

    const { container } = renderList();
    const dialog = openArchiveDialog(container, "Solar");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(archiveMutate).not.toHaveBeenCalled();
  });
});

// The optimistic Pick toggle lives in the real useUpdatePlace hook (mocked away in
// the component suite above), so exercise it directly with a seeded query cache.
describe("useUpdatePlace — optimistic pick toggle (T-8.2.5)", () => {
  const PLACES_KEY = ["admin", "places"];

  function seededClient(place: PlaceRow) {
    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    qc.setQueryData(PLACES_KEY, { data: [place], nextCursor: null });
    return qc;
  }

  function pick(qc: QueryClient): boolean {
    return (qc.getQueryData(PLACES_KEY) as { data: PlaceRow[] }).data[0].is_hosts_pick;
  }

  it("flips is_hosts_pick in the cache immediately, then rolls back when the server rejects", async () => {
    const { useUpdatePlace } = await vi.importActual<
      typeof import("@/features/backoffice/places/use-places")
    >("@/features/backoffice/places/use-places");

    const qc = seededClient(makePlace({ id: "p1", is_hosts_pick: false }));

    // A fetch we hold open until we've observed the optimistic state, then reject.
    let rejectFetch: (reason?: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((_res, rej) => {
            rejectFetch = rej;
          }),
      ),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdatePlace("p1"), { wrapper });

    act(() => {
      result.current.mutate({ is_hosts_pick: true });
    });

    // Optimistic: the cache reflects the pick before the request settles.
    await waitFor(() => expect(pick(qc)).toBe(true));

    // Server rejects → rollback to the pre-mutation snapshot.
    act(() => {
      rejectFetch(new Error("update place 500"));
    });
    await waitFor(() => expect(pick(qc)).toBe(false));

    vi.unstubAllGlobals();
  });
});

// The optimistic visibility toggle lives in the real useToggleHiddenPlace hook
// (mocked away in the component suite above), so exercise it directly.
describe("useToggleHiddenPlace — optimistic visibility toggle (T-8.2.5)", () => {
  const GUESTHOUSES_KEY = ["admin", "guesthouses"];

  function seededClient(hidden_place_ids: string[]) {
    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    qc.setQueryData(GUESTHOUSES_KEY, {
      data: [{ id: "gh1", hidden_place_ids }],
      nextCursor: null,
    });
    return qc;
  }

  function hidden(qc: QueryClient): string[] {
    return (qc.getQueryData(GUESTHOUSES_KEY) as { data: { hidden_place_ids: string[] }[] }).data[0]
      .hidden_place_ids;
  }

  it("adds the place to hidden_place_ids immediately, then rolls back when the server rejects", async () => {
    const { useToggleHiddenPlace } = await vi.importActual<
      typeof import("@/features/backoffice/guesthouses/use-guesthouses")
    >("@/features/backoffice/guesthouses/use-guesthouses");

    const qc = seededClient([]);

    let rejectFetch: (reason?: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((_res, rej) => {
            rejectFetch = rej;
          }),
      ),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useToggleHiddenPlace(), { wrapper });

    act(() => {
      result.current.mutate({ guesthouseId: "gh1", placeId: "p1", hide: true });
    });

    // Optimistic: the place is in the hidden set before the request settles.
    await waitFor(() => expect(hidden(qc)).toContain("p1"));

    // Server rejects → rollback to the pre-mutation snapshot (empty).
    act(() => {
      rejectFetch(new Error("toggle hidden place 500"));
    });
    await waitFor(() => expect(hidden(qc)).not.toContain("p1"));

    vi.unstubAllGlobals();
  });
});
