import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ChatMessage, WsStatus } from "@/features/chat/use-chat-ws";

// Passthrough i18n: t() returns the key, so we assert on the additive desktop
// keys (chat.welcome_title, chat.prompts.*) without loading the JSON bundle.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

// Drive the conversation deterministically — the real hook opens a WebSocket.
const send = vi.fn();
let wsState: { messages: ChatMessage[]; status: WsStatus } = { messages: [], status: "open" };
vi.mock("@/features/chat/use-chat-ws", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/chat/use-chat-ws")>();
  return { ...actual, useChatWs: () => ({ ...wsState, send }) };
});

import { ChatDesktop } from "@/features/chat/chat-desktop";

function renderDesktop(state: { messages?: ChatMessage[]; status?: WsStatus } = {}) {
  wsState = { messages: state.messages ?? [], status: state.status ?? "open" };
  return render(
    <MemoryRouter>
      <ChatDesktop jwt="header.payload.sig" />
    </MemoryRouter>,
  );
}

const MSG: ChatMessage[] = [
  { id: "m1", from: "me", body: "olá!", ts: Date.parse("2026-06-18T09:00:00Z") },
  { id: "m2", from: "them", body: "olá de volta", ts: Date.parse("2026-06-18T09:01:00Z") },
];

describe("ChatDesktop", () => {
  beforeEach(() => {
    send.mockClear();
  });

  it("mounts the masthead nav and the bounded conversation panel", () => {
    renderDesktop();
    expect(document.querySelector("nav[aria-label='Primary']")).not.toBeNull();
    expect(screen.getByTestId("conversation-panel")).toBeInTheDocument();
  });

  describe("empty state", () => {
    it("shows the editorial welcome hero and the suggested-prompt chips", () => {
      renderDesktop({ messages: [], status: "open" });
      expect(screen.getByTestId("chat-empty-state")).toBeInTheDocument();
      expect(screen.getByText("chat.welcome_title")).toBeInTheDocument();
      expect(screen.getByText("chat.welcome_subtitle")).toBeInTheDocument();
      const chips = screen.getByTestId("chat-prompt-chips");
      expect(chips.querySelectorAll("button")).toHaveLength(4);
      expect(screen.getByText("chat.prompts.visit")).toBeInTheDocument();
    });

    it("seeds the draft from a prompt chip and sends it", () => {
      renderDesktop({ messages: [], status: "open" });
      fireEvent.click(screen.getByText("chat.prompts.calheta"));
      expect(send).toHaveBeenCalledWith("chat.prompts.calheta");
    });
  });

  describe("active state", () => {
    it("renders the message bubbles, the persistent strip, and the pinned composer", () => {
      renderDesktop({ messages: MSG, status: "open" });
      expect(screen.queryByTestId("chat-empty-state")).not.toBeInTheDocument();
      expect(screen.getByTestId("chat-bubble-me")).toHaveTextContent("olá!");
      expect(screen.getByTestId("chat-bubble-them")).toHaveTextContent("olá de volta");
      // The same prompt source as a thin strip once the thread has messages.
      expect(screen.getByTestId("chat-suggestion-strip")).toBeInTheDocument();
    });

    it("sends typed text via the desktop composer", () => {
      renderDesktop({ messages: MSG, status: "open" });
      fireEvent.change(screen.getByLabelText("chat.placeholder"), { target: { value: " hi " } });
      fireEvent.click(screen.getByRole("button", { name: "chat.send" }));
      expect(send).toHaveBeenCalledWith("hi");
    });

    it("raises the send button to 44px (size-11) and renders no mic", () => {
      renderDesktop({ messages: MSG, status: "open" });
      expect(screen.getByRole("button", { name: "chat.send" })).toHaveClass("size-11");
      expect(screen.queryByTestId("chat-mic")).not.toBeInTheDocument();
    });
  });

  describe("status variants", () => {
    it("shows the connecting indicator while the socket opens", () => {
      renderDesktop({ messages: [], status: "connecting" });
      expect(screen.getByTestId("chat-connecting")).toBeInTheDocument();
      // No empty-state hero until the socket is open.
      expect(screen.queryByTestId("chat-empty-state")).not.toBeInTheDocument();
    });

    it("disables the composer when the socket is closed", () => {
      renderDesktop({ messages: MSG, status: "closed" });
      expect(screen.getByLabelText("chat.placeholder")).toBeDisabled();
      expect(screen.getByRole("button", { name: "chat.send" })).toBeDisabled();
    });
  });
});
