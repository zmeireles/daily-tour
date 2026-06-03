import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { toast } from "sonner";
import { PlaceList } from "@/features/backoffice/places/place-list";
import type { PlaceRow } from "@/features/backoffice/places/use-places";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
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
