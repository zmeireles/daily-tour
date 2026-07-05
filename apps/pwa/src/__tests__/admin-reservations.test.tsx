import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ReservationList } from "@/features/backoffice/reservations/reservation-list";
import type { ReservationRow } from "@/features/backoffice/reservations/use-reservations";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/features/backoffice/reservations/use-reservations", () => ({
  useReservations: vi.fn(),
  useIssueToken: vi.fn(),
  useRevokeToken: vi.fn(),
}));

vi.mock("@/features/backoffice/guesthouses/use-guesthouses", () => ({
  useGuesthouses: vi.fn(),
}));

const { useReservations, useIssueToken, useRevokeToken } =
  await import("@/features/backoffice/reservations/use-reservations");
const { useGuesthouses } = await import("@/features/backoffice/guesthouses/use-guesthouses");

const mockUseReservations = vi.mocked(useReservations);
const mockUseIssueToken = vi.mocked(useIssueToken);
const mockUseRevokeToken = vi.mocked(useRevokeToken);
const mockUseGuesthouses = vi.mocked(useGuesthouses);

const issueMutate = vi.fn();
const revokeMutate = vi.fn();

function makeReservation(over: Partial<ReservationRow>): ReservationRow {
  return {
    id: "res-1",
    guesthouse_id: "gh-1",
    guest_id: "guest-1",
    guest_name: "Ana Costa",
    checkin: "2026-07-01",
    checkout: "2026-07-05",
    party_size: 2,
    locale: "pt-PT",
    status: "confirmed",
    token_state: "none",
    ...over,
  };
}

function setList(
  reservations: ReservationRow[],
  state: Partial<{ isLoading: boolean; isError: boolean }> = {},
) {
  mockUseReservations.mockReturnValue({
    data: { data: reservations },
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useReservations>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setList([makeReservation({})]);
  mockUseGuesthouses.mockReturnValue({
    data: { data: [{ id: "gh-1", name: { en: "Casa Azul", "pt-PT": "Casa Azul" } }] },
  } as unknown as ReturnType<typeof useGuesthouses>);
  mockUseIssueToken.mockReturnValue({
    mutate: issueMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useIssueToken>);
  mockUseRevokeToken.mockReturnValue({
    mutate: revokeMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useRevokeToken>);
});

describe("ReservationList", () => {
  it("renders a reservation card with the guest name, night/party chips and property", () => {
    render(<ReservationList />);
    expect(screen.getByText("Ana Costa")).toBeDefined();
    // 2026-07-01 → 2026-07-05 is four nights; party_size 2.
    expect(screen.getByText("4 nights")).toBeDefined();
    expect(screen.getByText("2 guests")).toBeDefined();
    // Property chip resolved from useGuesthouses by guesthouse_id.
    expect(screen.getByText("Casa Azul")).toBeDefined();
    // Status is rendered via <StatusBadge>, not a raw enum value.
    const badge = document.querySelector('[data-status-kind="reservation"]');
    expect(badge?.textContent).toBe("Confirmed");
    // Token state gets its own badge in the guest-access zone.
    expect(document.querySelector('[data-status-kind="token"]')?.textContent).toBe("Not sent");
  });

  it("groups reservations under localized day-bucket headers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T09:00:00"));
    try {
      setList([
        makeReservation({ id: "res-1", guest_name: "Ana Costa", checkin: "2026-07-01" }),
        makeReservation({ id: "res-2", guest_name: "Bruno Dias", checkin: "2026-07-02" }),
      ]);
      render(<ReservationList />);
      expect(screen.getByText("Today")).toBeDefined();
      expect(screen.getByText("Tomorrow")).toBeDefined();
      expect(screen.getByText("Ana Costa")).toBeDefined();
      expect(screen.getByText("Bruno Dias")).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("filters the list by guest name via the search box", () => {
    setList([
      makeReservation({ id: "res-1", guest_name: "Ana Costa" }),
      makeReservation({ id: "res-2", guest_name: "Bruno Dias" }),
    ]);
    render(<ReservationList />);

    fireEvent.change(screen.getByPlaceholderText("Search by guest name"), {
      target: { value: "bruno" },
    });

    expect(screen.queryByText("Ana Costa")).toBeNull();
    expect(screen.getByText("Bruno Dias")).toBeDefined();
  });

  it("renders the empty state when there are no reservations", () => {
    setList([]);
    render(<ReservationList />);
    expect(screen.getByText("No reservations yet")).toBeDefined();
  });

  it("renders the error state when the query fails", () => {
    setList([], { isError: true });
    render(<ReservationList />);
    expect(screen.getByText("Failed to load reservations.")).toBeDefined();
  });

  it("issues a token and reveals the shareable guest link on success", () => {
    issueMutate.mockImplementation(
      (_id: string, opts?: { onSuccess?: (r: { token: string }) => void }) => {
        opts?.onSuccess?.({ token: "opaque-abc" });
      },
    );
    render(<ReservationList />);

    fireEvent.click(screen.getByText("Send link to guest"));

    expect(issueMutate).toHaveBeenCalledWith("res-1", expect.any(Object));
    expect(screen.getByLabelText("Guest link")).toHaveValue(
      `${window.location.origin}/r/opaque-abc`,
    );
  });

  it("revokes the active token only after confirming the AlertDialog (T-8.2.5)", () => {
    setList([makeReservation({ token_state: "active" })]);
    render(<ReservationList />);

    // Clicking the destructive button opens the confirm dialog — it does NOT revoke yet.
    fireEvent.click(screen.getByText("Revoke access"));
    expect(revokeMutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Revoke the guest's access?")).toBeInTheDocument();

    // Confirming inside the dialog performs the revoke.
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke access" }));
    expect(revokeMutate).toHaveBeenCalledWith("res-1", expect.any(Object));
  });

  it("copies the guest link and toasts success (T-8.2.5)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    issueMutate.mockImplementation(
      (_id: string, opts?: { onSuccess?: (r: { token: string }) => void }) => {
        opts?.onSuccess?.({ token: "opaque-abc" });
      },
    );
    render(<ReservationList />);

    // Issue reveals the shareable link + Copy button.
    fireEvent.click(screen.getByText("Send link to guest"));
    fireEvent.click(screen.getByText("Copy"));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/r/opaque-abc`);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link copied"));
  });
});
