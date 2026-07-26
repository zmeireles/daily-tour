import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import ChatRoute from "@/routes/_authed.chat";

/**
 * Minimal stand-in for the browser WebSocket — jsdom doesn't ship a working
 * implementation. We expose lifecycle hooks (`_open`, `_message`) on the
 * latest instance so tests can drive the socket deterministically.
 */
class MockWebSocket {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSING = 2 as const;
  static CLOSED = 3 as const;
  static instances: MockWebSocket[] = [];

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  sent: string[] = [];

  onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
  onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent<string>) => unknown) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.call(this as unknown as WebSocket, new CloseEvent("close"));
  }

  _open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.call(this as unknown as WebSocket, new Event("open"));
  }

  _message(payload: string): void {
    const evt: MessageEvent<string> = new MessageEvent("message", { data: payload });
    this.onmessage?.call(this as unknown as WebSocket, evt);
  }
}

const MOCK_JWT = "header.payload.sig";
const MOCK_CLAIMS = {
  sub: "guest-uuid-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};

function renderChat(initialPath = "/chat") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createMemoryRouter(
    [
      { path: "/", element: <div data-testid="landing" /> },
      { path: "/chat", element: <ChatRoute /> },
    ],
    { initialEntries: [initialPath] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("Chat route", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
    void i18n.changeLanguage("en");
    useSessionStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to landing when JWT is missing", async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByTestId("landing")).toBeInTheDocument();
    });
  });

  it("shows the host name (Miguel) and an Online status in the app bar", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderChat();

    expect(screen.getByRole("heading", { name: "Miguel" })).toBeInTheDocument();
    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });

  it("shows the connecting indicator and opens a WS to /v1/chat/ws", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderChat();

    expect(screen.getByTestId("chat-connecting")).toBeInTheDocument();
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toContain("/v1/chat/ws?token=");
    expect(MockWebSocket.instances[0]?.url).toContain(encodeURIComponent(MOCK_JWT));
  });

  it("sends typed text and renders inbound JSON-framed messages", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderChat();

    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error("no socket");

    act(() => {
      socket._open();
    });

    const input = screen.getByLabelText(/type a message/i);
    fireEvent.change(input, { target: { value: "olá!" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(socket.sent).toEqual(["olá!"]);
    const meBubble = screen.getByTestId("chat-bubble-me");
    expect(meBubble).toHaveTextContent("olá!");
    // Editorial surfaces: guest = tea-green primary, host = cream paper.
    expect(meBubble).toHaveClass("bg-primary");

    // A per-message timestamp (HH:MM) renders next to the sent bubble.
    expect(screen.getByTestId("chat-time-me")).toBeInTheDocument();
    // A day separator anchors the start of today's group.
    expect(screen.getByTestId("chat-day-separator")).toBeInTheDocument();

    act(() => {
      socket._message(JSON.stringify({ body: "olá de volta" }));
    });

    const themBubble = screen.getByTestId("chat-bubble-them");
    expect(themBubble).toHaveTextContent("olá de volta");
    expect(themBubble).toHaveClass("bg-surface-container-low");
  });

  it("re-hydrates persisted history on mount (UAT-G08 step 5)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              messages: [
                {
                  id: "h1",
                  direction: "inbound",
                  body: " filed earlier ",
                  ts: "2026-05-31T10:00:00Z",
                },
              ],
            }),
            { status: 200 },
          ),
        ),
      ),
    );

    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderChat();

    await waitFor(() => {
      expect(screen.getByTestId("chat-bubble-me")).toHaveTextContent("filed earlier");
    });
  });

  it("ignores ack frames (no bubble — delivery receipt only)", () => {
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderChat();

    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error("no socket");

    act(() => {
      socket._open();
      socket._message(JSON.stringify({ type: "ack", id: "m1", ts: "2026-05-31T10:00:00Z" }));
    });

    expect(screen.queryByTestId("chat-bubble-them")).not.toBeInTheDocument();
  });
});
