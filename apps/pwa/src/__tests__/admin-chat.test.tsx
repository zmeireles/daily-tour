import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInbox } from "@/features/backoffice/chat/chat-inbox";
import { BackofficeShell } from "@/features/backoffice/shell";
import { useChatUnreadStore } from "@/features/backoffice/chat/use-chat-unread";
import { MemoryRouter } from "react-router";
import type { ChatThread, AdminChatMessage } from "@/features/backoffice/chat/use-admin-chat";
import type { ReservationRow } from "@/features/backoffice/reservations/use-reservations";
import type { GuesthouseRow } from "@/features/backoffice/guesthouses/use-guesthouses";

vi.mock("@/features/backoffice/chat/use-admin-chat", () => ({
  useChatThreads: vi.fn(),
  useThreadHistory: vi.fn(),
  useSendReply: vi.fn(),
}));

// The redesigned inbox joins each thread's guest_id to a reservation (for the
// real guest name + property) via these two react-query hooks. Mocking them
// resolves the name without a QueryClient and lets us assert the joined label.
vi.mock("@/features/backoffice/reservations/use-reservations", () => ({
  useReservations: vi.fn(),
}));
vi.mock("@/features/backoffice/guesthouses/use-guesthouses", () => ({
  useGuesthouses: vi.fn(),
}));

const { useChatThreads, useThreadHistory, useSendReply } =
  await import("@/features/backoffice/chat/use-admin-chat");
const { useReservations } = await import("@/features/backoffice/reservations/use-reservations");
const { useGuesthouses } = await import("@/features/backoffice/guesthouses/use-guesthouses");

const mockUseChatThreads = vi.mocked(useChatThreads);
const mockUseThreadHistory = vi.mocked(useThreadHistory);
const mockUseSendReply = vi.mocked(useSendReply);
const mockUseReservations = vi.mocked(useReservations);
const mockUseGuesthouses = vi.mocked(useGuesthouses);

const replyMutate = vi.fn();

const GUEST_ID = "guest-abcdef123456";

function makeThread(over: Partial<ChatThread> = {}): ChatThread {
  return {
    guest_id: GUEST_ID,
    last_body: "Hello from the guest",
    last_ts: "2026-06-18T09:30:00Z",
    updated_at: "2026-06-10T08:00:00Z",
    ...over,
  };
}

function makeReservation(over: Partial<ReservationRow> = {}): ReservationRow {
  return {
    id: "r1",
    guesthouse_id: "gh1",
    guest_id: GUEST_ID,
    guest_name: "Ana Silva",
    checkin: "2026-06-17",
    checkout: "2026-06-20",
    party_size: 2,
    locale: "pt-PT",
    status: "confirmed",
    token_state: "active",
    ...over,
  };
}

function makeGuesthouse(over: Partial<GuesthouseRow> = {}): GuesthouseRow {
  return {
    id: "gh1",
    owner_id: "owner1",
    name: { en: "Casa das Flores", "pt-PT": "Casa das Flores" },
    slug: "casa-das-flores",
    address: "Rua das Flores 1",
    geom_lat: 37.7,
    geom_lng: -25.6,
    media: [],
    hidden_place_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function setThreads(
  threads: ChatThread[],
  state: Partial<{ isLoading: boolean; isError: boolean }> = {},
) {
  mockUseChatThreads.mockReturnValue({
    data: threads,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useChatThreads>);
}

function setHistory(
  messages: AdminChatMessage[],
  state: Partial<{ isLoading: boolean; isError: boolean }> = {},
) {
  mockUseThreadHistory.mockReturnValue({
    data: messages,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useThreadHistory>);
}

function setReservations(rows: ReservationRow[]) {
  mockUseReservations.mockReturnValue({
    data: { data: rows },
  } as unknown as ReturnType<typeof useReservations>);
}

function setGuesthouses(rows: GuesthouseRow[]) {
  mockUseGuesthouses.mockReturnValue({
    data: { data: rows, nextCursor: null },
  } as unknown as ReturnType<typeof useGuesthouses>);
}

// jsdom has no matchMedia; useLayoutMode then defaults to "mobile" (single-pane).
// Force the desktop two-pane layout so the thread list stays visible next to the
// detail pane and the "select a conversation" prompt renders.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // The unread heuristic persists to localStorage; reset both the store and its
  // backing storage so every test starts with a clean (all-unread) watermark.
  localStorage.clear();
  useChatUnreadStore.setState({ lastViewed: {} });
  setThreads([makeThread()]);
  setHistory([]);
  setReservations([makeReservation()]);
  setGuesthouses([makeGuesthouse()]);
  mockUseSendReply.mockReturnValue({
    mutate: replyMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useSendReply>);
});

describe("ChatInbox", () => {
  it("renders a thread row with the resolved guest name (not the id label)", () => {
    render(<ChatInbox />);
    expect(screen.getByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("Hello from the guest")).toBeDefined();
    // The redesign resolves a real name via the reservation join — the old
    // truncated id label must no longer appear.
    expect(screen.queryByText("guest-ab…")).toBeNull();
  });

  it("falls back to the id label when no reservation resolves the guest", () => {
    setReservations([]);
    render(<ChatInbox />);
    expect(screen.getByText("guest-ab…")).toBeDefined();
  });

  it("renders the empty state when there are no threads", () => {
    setThreads([]);
    render(<ChatInbox />);
    expect(screen.getByText("No conversations yet")).toBeDefined();
  });

  it("renders the error state when the threads query fails", () => {
    setThreads([], { isError: true });
    render(<ChatInbox />);
    expect(screen.getByText("Failed to load conversations.")).toBeDefined();
  });

  it("prompts to select a thread before one is chosen", () => {
    render(<ChatInbox />);
    expect(screen.getByText("Select a conversation to view messages.")).toBeDefined();
  });

  it("loads and renders history with owner-perspective direction mapping", () => {
    setHistory([
      { id: "h1", direction: "inbound", body: "Guest asks", ts: "2026-06-18T09:00:00Z" },
      { id: "h2", direction: "outbound", body: "Host replies", ts: "2026-06-18T09:05:00Z" },
    ]);
    render(<ChatInbox />);

    fireEvent.click(screen.getByTestId("chat-thread-row"));

    // outbound (host = Miguel = owner) is the owner's own right-aligned bubble;
    // inbound (guest) is the other/left bubble — the INVERSE of the guest view.
    const guestBubble = screen.getByTestId("admin-chat-bubble-guest");
    const ownerBubble = screen.getByTestId("admin-chat-bubble-owner");
    expect(guestBubble).toHaveTextContent("Guest asks");
    expect(ownerBubble).toHaveTextContent("Host replies");
    expect(ownerBubble).toHaveClass("bg-primary");
  });

  it("POSTs a reply via useSendReply when Send is clicked", () => {
    render(<ChatInbox />);
    fireEvent.click(screen.getByTestId("chat-thread-row"));

    fireEvent.change(screen.getByLabelText("Type a reply…"), {
      target: { value: "  Bom dia!  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(replyMutate).toHaveBeenCalledWith("Bom dia!", expect.any(Object));
  });

  it("does not send an empty/whitespace-only reply", () => {
    render(<ChatInbox />);
    fireEvent.click(screen.getByTestId("chat-thread-row"));

    fireEvent.change(screen.getByLabelText("Type a reply…"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("marks a thread unread until it is opened", () => {
    render(<ChatInbox />);
    // Fresh watermark → the thread's newer last_ts reads as unread.
    expect(screen.getByTestId("chat-unread-dot")).toBeDefined();

    // Opening the thread advances the watermark past its last message → read.
    fireEvent.click(screen.getByTestId("chat-thread-row"));
    expect(screen.queryByTestId("chat-unread-dot")).toBeNull();
  });
});

describe("BackofficeShell", () => {
  it("exposes a Messages nav entry in the backoffice shell", () => {
    render(
      <MemoryRouter>
        <BackofficeShell>
          <div />
        </BackofficeShell>
      </MemoryRouter>,
    );
    // The responsive shell renders the nav in both the desktop rail and the
    // mobile bottom tab bar (CSS-hidden per breakpoint, both in the DOM).
    const links = screen.getAllByRole("link", { name: "Messages" });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/admin/chat"));
  });
});
