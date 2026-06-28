import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationList } from "@/features/backoffice/reservations/reservation-list";
import type { ReservationRow } from "@/features/backoffice/reservations/use-reservations";

vi.mock("@/features/backoffice/reservations/use-reservations", () => ({
  useReservations: vi.fn(),
  useIssueToken: vi.fn(),
  useRevokeToken: vi.fn(),
}));

const { useReservations, useIssueToken, useRevokeToken } =
  await import("@/features/backoffice/reservations/use-reservations");

const mockUseReservations = vi.mocked(useReservations);
const mockUseIssueToken = vi.mocked(useIssueToken);
const mockUseRevokeToken = vi.mocked(useRevokeToken);

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
  it("renders a row from the reservations hook", () => {
    render(<ReservationList />);
    expect(screen.getByText("Ana Costa")).toBeDefined();
    expect(screen.getByText("2026-07-01")).toBeDefined();
    expect(screen.getByText("2026-07-05")).toBeDefined();
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

    fireEvent.click(screen.getByText("Issue link"));

    expect(issueMutate).toHaveBeenCalledWith("res-1", expect.any(Object));
    expect(screen.getByLabelText("Guest link")).toHaveValue(
      `${window.location.origin}/r/opaque-abc`,
    );
  });

  it("revokes the active token when Revoke is clicked", () => {
    setList([makeReservation({ token_state: "active" })]);
    render(<ReservationList />);

    fireEvent.click(screen.getByText("Revoke"));

    expect(revokeMutate).toHaveBeenCalledWith("res-1", expect.any(Object));
  });
});
