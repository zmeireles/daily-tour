import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { TodayDashboard } from "@/features/admin-today/today-dashboard";
import { useOwnerSessionStore } from "@/store/owner-session";
import type { ReservationRow } from "@/features/backoffice/reservations/use-reservations";
import type { PlaceRow } from "@/features/backoffice/places/use-places";
import type { GuesthouseRow } from "@/features/backoffice/guesthouses/use-guesthouses";
import type { OwnerProfile } from "@/features/backoffice/profile/use-profile";
import { localTodayISO } from "@/features/admin-today/lib";

vi.mock("@/features/backoffice/reservations/use-reservations", () => ({
  useReservations: vi.fn(),
}));
vi.mock("@/features/backoffice/places/use-places", () => ({ usePlaces: vi.fn() }));
vi.mock("@/features/backoffice/chat/use-admin-chat", () => ({ useChatThreads: vi.fn() }));
vi.mock("@/features/backoffice/guesthouses/use-guesthouses", () => ({ useGuesthouses: vi.fn() }));
vi.mock("@/features/backoffice/profile/use-profile", () => ({ useProfile: vi.fn() }));

const { useReservations } = await import("@/features/backoffice/reservations/use-reservations");
const { usePlaces } = await import("@/features/backoffice/places/use-places");
const { useChatThreads } = await import("@/features/backoffice/chat/use-admin-chat");
const { useGuesthouses } = await import("@/features/backoffice/guesthouses/use-guesthouses");
const { useProfile } = await import("@/features/backoffice/profile/use-profile");

const mockReservations = vi.mocked(useReservations);
const mockPlaces = vi.mocked(usePlaces);
const mockThreads = vi.mocked(useChatThreads);
const mockGuesthouses = vi.mocked(useGuesthouses);
const mockProfile = vi.mocked(useProfile);

const TODAY = localTodayISO(new Date());

function makeReservation(over: Partial<ReservationRow>): ReservationRow {
  return {
    id: "res-1",
    guesthouse_id: "gh-1",
    guest_id: "guest-1",
    guest_name: "Ana Costa",
    checkin: TODAY,
    checkout: "2099-01-01",
    party_size: 2,
    locale: "pt-PT",
    status: "confirmed",
    token_state: "none",
    ...over,
  };
}

function makePlace(over: Partial<PlaceRow>): PlaceRow {
  return {
    id: "place-1",
    name: { en: "A Place" },
    description: { en: "" },
    address: "",
    status: "published",
    geom_lat: 0,
    geom_lng: 0,
    is_hosts_pick: false,
    source_kind: "owner",
    created_at: "",
    updated_at: "",
    ...over,
  };
}

const GUESTHOUSE: GuesthouseRow = {
  id: "gh-1",
  owner_id: "owner-1",
  name: { "pt-PT": "Casa do Miguel", en: "Miguel's House" },
  slug: "casa-do-miguel",
  address: "",
  geom_lat: 0,
  geom_lng: 0,
  media: [],
  hidden_place_ids: [],
  created_at: "",
  updated_at: "",
};

const PROFILE: OwnerProfile = {
  owner_id: "owner-1",
  bio: null,
  photo: "https://example.test/avatar.jpg",
  phone: null,
  call_enabled: false,
  dm_channels: null,
  email: null,
  updated_at: "",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asHook = (value: unknown) => value as any;

function setReservations(rows: ReservationRow[], over: Record<string, unknown> = {}) {
  mockReservations.mockReturnValue(
    asHook({ data: { data: rows }, isLoading: false, isError: false, refetch: vi.fn(), ...over }),
  );
}
function setPlaces(rows: PlaceRow[], over: Record<string, unknown> = {}) {
  mockPlaces.mockReturnValue(
    asHook({
      data: { data: rows, nextCursor: null },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      ...over,
    }),
  );
}
function setThreads(count: number, over: Record<string, unknown> = {}) {
  mockThreads.mockReturnValue(
    asHook({
      data: Array.from({ length: count }, (_, i) => ({
        guest_id: `g-${i}`,
        last_body: "hi",
        last_ts: null,
        updated_at: "",
      })),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      ...over,
    }),
  );
}
function setGuesthouses(rows: GuesthouseRow[], over: Record<string, unknown> = {}) {
  mockGuesthouses.mockReturnValue(
    asHook({
      data: { data: rows, nextCursor: null },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      ...over,
    }),
  );
}
function setProfile(profile: OwnerProfile | null, over: Record<string, unknown> = {}) {
  mockProfile.mockReturnValue(
    asHook({ data: profile, isLoading: false, isError: false, refetch: vi.fn(), ...over }),
  );
}

function renderToday() {
  return render(
    <MemoryRouter>
      <TodayDashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useOwnerSessionStore.getState().setOwnerSession("jwt", {
    sub: "owner-1",
    email: "owner@example.com",
    name: "Miguel",
  });
  // Default: fully set-up owner with a mix of reservations.
  setReservations([
    makeReservation({ id: "r1", checkin: TODAY }),
    makeReservation({ id: "r2", status: "pending", token_state: "active" }),
  ]);
  setPlaces([makePlace({})]);
  setThreads(3);
  setGuesthouses([GUESTHOUSE]);
  setProfile(PROFILE);
});

describe("TodayDashboard (/admin index)", () => {
  it("renders the greeting with the owner name — not a blank pane", () => {
    renderToday();
    expect(screen.getByRole("heading", { name: /Miguel/ })).toBeInTheDocument();
    // Active property name from the first guesthouse.
    expect(screen.getByText("Casa do Miguel")).toBeInTheDocument();
  });

  it("renders all KPI tiles with counts derived client-side", () => {
    renderToday();
    // Labels present → tiles rendered, never blank.
    expect(screen.getByText("Check-ins today")).toBeInTheDocument();
    expect(screen.getByText("Check-outs today")).toBeInTheDocument();
    expect(screen.getByText("Pending reservations")).toBeInTheDocument();
    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.getByText("Places needing attention")).toBeInTheDocument();
    expect(screen.getByText("Active guest links")).toBeInTheDocument();

    // Derived counts: 1 pending, 1 active token, 3 threads.
    const pendingTile = screen.getByText("Pending reservations").closest("a");
    expect(pendingTile).toHaveTextContent("1");
    const messagesTile = screen.getByText("Conversations").closest("a");
    expect(messagesTile).toHaveTextContent("3");
  });

  it("tiles link through to filtered lists", () => {
    renderToday();
    expect(screen.getByText("Pending reservations").closest("a")).toHaveAttribute(
      "href",
      "/admin/reservations",
    );
    expect(screen.getByText("Places needing attention").closest("a")).toHaveAttribute(
      "href",
      "/admin/places",
    );
    expect(screen.getByText("Conversations").closest("a")).toHaveAttribute("href", "/admin/chat");
  });

  it("shows a skeleton grid while a tile query is loading", () => {
    setReservations([], { isLoading: true, data: undefined });
    const { container } = renderToday();
    expect(container.querySelector('[data-slot="loading-state"]')).toBeInTheDocument();
    expect(screen.queryByText("Check-ins today")).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry when a tile query fails", () => {
    const refetch = vi.fn();
    setPlaces([], { isError: true, data: undefined, refetch });
    renderToday();
    expect(screen.getByText("Couldn't load today")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders the first-run setup checklist only when setup is incomplete", () => {
    setGuesthouses([]);
    setPlaces([]);
    setProfile({ ...PROFILE, photo: null });
    renderToday();
    expect(screen.getByText("Finish setting up")).toBeInTheDocument();
    expect(screen.getByText("Add your guesthouse")).toBeInTheDocument();
  });

  it("hides the setup checklist once places, guesthouse and photo all exist", () => {
    renderToday();
    expect(screen.queryByText("Finish setting up")).not.toBeInTheDocument();
  });
});
