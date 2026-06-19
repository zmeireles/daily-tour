import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInbox } from "@/features/backoffice/chat/chat-inbox";
import { BackofficeShell } from "@/features/backoffice/shell";
import { MemoryRouter } from "react-router";
import type { ChatThread, AdminChatMessage } from "@/features/backoffice/chat/use-admin-chat";

vi.mock("@/features/backoffice/chat/use-admin-chat", () => ({
  useChatThreads: vi.fn(),
  useThreadHistory: vi.fn(),
  useSendReply: vi.fn(),
}));

const { useChatThreads, useThreadHistory, useSendReply } =
  await import("@/features/backoffice/chat/use-admin-chat");

const mockUseChatThreads = vi.mocked(useChatThreads);
const mockUseThreadHistory = vi.mocked(useThreadHistory);
const mockUseSendReply = vi.mocked(useSendReply);

const replyMutate = vi.fn();

function makeThread(over: Partial<ChatThread> = {}): ChatThread {
  return {
    guest_id: "guest-abcdef123456",
    last_body: "Hello from the guest",
    last_ts: "2026-06-18T09:30:00Z",
    updated_at: "2026-06-10T08:00:00Z",
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
  } as unknown as ReturnType<typeof useThreadHistory>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setThreads([makeThread()]);
  setHistory([]);
  mockUseSendReply.mockReturnValue({
    mutate: replyMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useSendReply>);
});

describe("ChatInbox", () => {
  it("renders a thread row from the threads hook", () => {
    render(<ChatInbox />);
    expect(screen.getByText("guest-ab…")).toBeDefined();
    expect(screen.getByText("Hello from the guest")).toBeDefined();
  });

  it("renders the empty state when there are no threads", () => {
    setThreads([]);
    render(<ChatInbox />);
    expect(screen.getByText("No conversations yet.")).toBeDefined();
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

    fireEvent.click(screen.getByText("guest-ab…"));

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
    fireEvent.click(screen.getByText("guest-ab…"));

    fireEvent.change(screen.getByLabelText("Type a reply…"), {
      target: { value: "  Bom dia!  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(replyMutate).toHaveBeenCalledWith("Bom dia!", expect.any(Object));
  });

  it("does not send an empty/whitespace-only reply", () => {
    render(<ChatInbox />);
    fireEvent.click(screen.getByText("guest-ab…"));

    fireEvent.change(screen.getByLabelText("Type a reply…"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("exposes a Messages nav entry in the backoffice shell", () => {
    render(
      <MemoryRouter>
        <BackofficeShell>
          <div />
        </BackofficeShell>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Messages" });
    expect(link).toHaveAttribute("href", "/admin/chat");
  });
});
