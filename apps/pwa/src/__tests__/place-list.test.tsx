import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { toast } from "sonner";
import { PlaceList } from "@/features/backoffice/places/place-list";
import type { PlaceRow } from "@/features/backoffice/places/use-places";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn() },
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

describe("PlaceList — host's pick column", () => {
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

  it("renders the pick badge reflecting each row's is_hosts_pick", () => {
    setPlaces([
      makePlace({ id: "pick", name: { en: "Lagoa" }, is_hosts_pick: true }),
      makePlace({ id: "non", name: { en: "Bistro" }, is_hosts_pick: false }),
    ]);

    renderList();

    // Pick row: filled badge + "Unmark" toggle.
    expect(screen.getByText("Pick")).toBeInTheDocument();
    const pickToggle = screen.getByLabelText("Toggle host's pick for Lagoa");
    expect(pickToggle).toHaveTextContent("Unmark");

    // Non-pick row: em-dash placeholder + "Mark pick" toggle. (Em-dashes also appear
    // in the visibility column for non-hidden rows, so assert at least one exists.)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    const nonToggle = screen.getByLabelText("Toggle host's pick for Bistro");
    expect(nonToggle).toHaveTextContent("Mark pick");

    // Each toggle wires up its own per-place mutation hook.
    expect(useUpdatePlace).toHaveBeenCalledWith("pick");
    expect(useUpdatePlace).toHaveBeenCalledWith("non");
  });

  it("clicking the toggle calls the update mutation with the flipped is_hosts_pick", () => {
    setPlaces([
      makePlace({ id: "pick", name: { en: "Lagoa" }, is_hosts_pick: true }),
      makePlace({ id: "non", name: { en: "Bistro" }, is_hosts_pick: false }),
    ]);

    renderList();

    fireEvent.click(screen.getByLabelText("Toggle host's pick for Bistro"));
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());

    fireEvent.click(screen.getByLabelText("Toggle host's pick for Lagoa"));
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: false }, expect.anything());
  });

  it("surfaces an error toast when the backend rejects the toggle with 422", () => {
    setPlaces([makePlace({ id: "non", name: { en: "Bistro" }, status: "draft" })]);

    renderList();

    fireEvent.click(screen.getByLabelText("Toggle host's pick for Bistro"));

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

    renderList();

    fireEvent.click(screen.getByLabelText("Toggle host's pick for Ninth"));

    expect(toast.warning).toHaveBeenCalledTimes(1);
    // Saving still proceeds — the cap is a soft warning, not a block.
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());
  });

  it("does not warn when marking a pick under the cap", () => {
    const picks = Array.from({ length: 3 }, (_, i) =>
      makePlace({ id: `pick${i}`, name: { en: `Pick ${i}` }, is_hosts_pick: true }),
    );
    setPlaces([...picks, makePlace({ id: "next", name: { en: "Next" }, is_hosts_pick: false })]);

    renderList();

    fireEvent.click(screen.getByLabelText("Toggle host's pick for Next"));

    expect(toast.warning).not.toHaveBeenCalled();
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());
  });

  it("sorts rows by name when the Name header is clicked, and reverses on a second click", () => {
    setPlaces([
      makePlace({ id: "c", name: { en: "Cherry" } }),
      makePlace({ id: "a", name: { en: "Apple" } }),
      makePlace({ id: "b", name: { en: "Banana" } }),
    ]);

    renderList();

    const nameHeader = screen.getByLabelText("Sort by Name");

    // Default sort is name asc.
    const namesAsc = screen.getAllByRole("cell", { name: /Apple|Banana|Cherry/ });
    expect(namesAsc.map((c) => c.textContent)).toEqual(["Apple", "Banana", "Cherry"]);

    // Click toggles to desc.
    fireEvent.click(nameHeader);
    const namesDesc = screen.getAllByRole("cell", { name: /Apple|Banana|Cherry/ });
    expect(namesDesc.map((c) => c.textContent)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  it("paginates at 10 per page, advancing with Next (DAILY-TOUR-154)", () => {
    // 12 places named so the asc-name order is deterministic (P00..P11).
    const many = Array.from({ length: 12 }, (_, i) =>
      makePlace({ id: `p${i}`, name: { en: `P${String(i).padStart(2, "0")}` } }),
    );
    setPlaces(many);

    renderList();

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    // Only 10 rows on page 1: P00..P09 present, P10/P11 absent.
    expect(screen.getByRole("cell", { name: "P00" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "P09" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "P10" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "P10" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "P11" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "P00" })).not.toBeInTheDocument();
  });

  it("counts the pick cap across the full set, not just the visible page (6.D + 154)", () => {
    // 8 visible picks named so they sort onto page 2 (after the 10 non-picks +
    // the to-be-marked row on page 1). Marking a 9th pick must still warn,
    // proving the cap counts the whole set, not the current page slice.
    // 9 non-pick fillers (names "Bbb …") + the target ("Aaa target", sorts first)
    // fill page 1; the 8 picks ("Zzz …") sort onto page 2.
    const fillers = Array.from({ length: 9 }, (_, i) =>
      makePlace({ id: `fill${i}`, name: { en: `Bbb ${i}` }, is_hosts_pick: false }),
    );
    const picks = Array.from({ length: 8 }, (_, i) =>
      makePlace({ id: `pick${i}`, name: { en: `Zzz ${i}` }, is_hosts_pick: true }),
    );
    const target = makePlace({ id: "target", name: { en: "Aaa target" }, is_hosts_pick: false });
    setPlaces([...fillers, ...picks, target]);

    renderList();

    // The 8 picks live on page 2 (name "Zzz …"); the target is on page 1 ("Aaa …").
    fireEvent.click(screen.getByLabelText("Toggle host's pick for Aaa target"));

    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(updateMutate).toHaveBeenCalledWith({ is_hosts_pick: true }, expect.anything());
  });

  it("guest-visibility toggle reflects the gh hidden set + flips it (Plan-006 6.A.3)", () => {
    setGuesthouse(["pick"]); // gh hides "pick"; "non" stays visible
    setPlaces([
      makePlace({ id: "pick", name: { en: "Lagoa" } }),
      makePlace({ id: "non", name: { en: "Bistro" } }),
    ]);

    renderList();

    // Hidden row: "Hidden" badge + "Show"; visible row: "Hide".
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle guest visibility for Lagoa")).toHaveTextContent("Show");
    expect(screen.getByLabelText("Toggle guest visibility for Bistro")).toHaveTextContent("Hide");

    // Hide the visible one → PUT (hide:true).
    fireEvent.click(screen.getByLabelText("Toggle guest visibility for Bistro"));
    expect(toggleMutate).toHaveBeenCalledWith(
      { guesthouseId: "gh1", placeId: "non", hide: true },
      expect.anything(),
    );

    // Show the hidden one → DELETE (hide:false).
    fireEvent.click(screen.getByLabelText("Toggle guest visibility for Lagoa"));
    expect(toggleMutate).toHaveBeenCalledWith(
      { guesthouseId: "gh1", placeId: "pick", hide: false },
      expect.anything(),
    );
  });
});
