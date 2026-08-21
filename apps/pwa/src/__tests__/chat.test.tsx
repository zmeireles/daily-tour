import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import ChatRoute from "@/routes/_authed.chat";
import { CHAT_JWT_SUBPROTOCOL } from "@daily-tour/shared-types";

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
  protocols: string | string[] | undefined;
  sent: string[] = [];

  onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
  onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent<string>) => unknown) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
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
    expect(MockWebSocket.instances[0]?.url).toContain("/v1/chat/ws");
  });

  it("carries the JWT in the subprotocol and NEVER in the URL", () => {
    // D15: a token is never echoed in logs, and a query string is echoed into
    // the BFF request log and Traefik's access log alike (`RequestPath`
    // includes the query, and Traefik offers no redaction for it). Headers are
    // dropped from that log by default, so the subprotocol list is the carrier.
    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });
    renderChat();

    const socket = MockWebSocket.instances[0];
    expect(socket?.url).not.toContain(MOCK_JWT);
    expect(socket?.url).not.toContain(encodeURIComponent(MOCK_JWT));
    expect(socket?.url).not.toContain("token=");
    expect(socket?.protocols).toEqual([CHAT_JWT_SUBPROTOCOL, MOCK_JWT]);
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

  // #391 reached the GUEST surface too, not only the owner console. The issue
  // is titled for guests and lists "chat timestamps"; the first cut of the fix
  // covered four owner call sites and left these three (chat-bubble,
  // chat-window, conversation-panel) feeding `i18n.language` to Intl.
  //
  // The helper's own unit tests cannot see that — they test the helper in
  // isolation. This proves the guest chat SCREEN uses it. Reverting
  // chat-bubble.tsx to `i18n.language` turns this red.
  it("renders a guest's chat timestamp in their own regional English", async () => {
    const languages = navigator.languages;
    Object.defineProperty(window.navigator, "languages", {
      value: ["en-GB"],
      configurable: true,
    });
    await i18n.changeLanguage("en-GB");

    const ts = "2026-05-31T14:30:00Z";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              messages: [{ id: "h1", direction: "inbound", body: "filed earlier", ts }],
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

    // supportedLngs normalizes en-GB -> en. That collapse is the whole bug.
    expect(i18n.language).toBe("en");

    // Derive both renderings from the same Date the component formats rather
    // than hardcoding, so the runner's timezone cannot decide the result.
    const opts = { hour: "2-digit", minute: "2-digit" } as const;
    const d = new Date(ts);
    const british = new Intl.DateTimeFormat("en-GB", opts).format(d);
    const american = new Intl.DateTimeFormat("en", opts).format(d);

    // Control: if these ever render identically the assertions below prove
    // nothing, so fail loudly rather than pass vacuously.
    expect(british).not.toBe(american);

    expect(screen.getByText(british)).toBeInTheDocument();
    expect(screen.queryByText(american)).toBeNull();

    // The day separator is a SECOND Intl call site, in a different component
    // (chat-window / conversation-panel, whichever ResponsiveScreen mounts).
    // Asserting only the bubble's time leaves it unguarded: reverting the
    // separator alone kept the whole suite green.
    const dayOpts = { weekday: "long", day: "numeric", month: "long" } as const;
    const dayBritish = new Intl.DateTimeFormat("en-GB", dayOpts).format(d);
    const dayAmerican = new Intl.DateTimeFormat("en", dayOpts).format(d);
    expect(dayBritish).not.toBe(dayAmerican);

    expect(screen.getByTestId("chat-day-separator")).toHaveTextContent(dayBritish);

    Object.defineProperty(window.navigator, "languages", {
      value: languages,
      configurable: true,
    });
  });

  // The desktop tree mounts ConversationPanel instead of ChatWindow, and it
  // carries its OWN copy of dayLabel. Without this, reverting that copy alone
  // left the entire 542-test suite green — the mobile test above covers
  // chat-window only, verified by mutating each file separately.
  it("renders the day separator in regional English on the desktop tree too", async () => {
    const languages = navigator.languages;
    const realMatchMedia = window.matchMedia;
    Object.defineProperty(window.navigator, "languages", {
      value: ["en-GB"],
      configurable: true,
    });
    // Forces useLayoutMode to report desktop (matchMedia is absent in jsdom).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
    await i18n.changeLanguage("en-GB");

    const ts = "2026-05-31T14:30:00Z";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              messages: [{ id: "h1", direction: "inbound", body: "filed earlier", ts }],
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
      expect(screen.getByTestId("chat-day-separator")).toBeInTheDocument();
    });

    const dayOpts = { weekday: "long", day: "numeric", month: "long" } as const;
    const d = new Date(ts);
    const dayBritish = new Intl.DateTimeFormat("en-GB", dayOpts).format(d);
    const dayAmerican = new Intl.DateTimeFormat("en", dayOpts).format(d);

    // Control: identical renderings would make the assertion below vacuous.
    expect(dayBritish).not.toBe(dayAmerican);

    expect(screen.getByTestId("chat-day-separator")).toHaveTextContent(dayBritish);

    window.matchMedia = realMatchMedia;
    Object.defineProperty(window.navigator, "languages", {
      value: languages,
      configurable: true,
    });
    await i18n.changeLanguage("en");
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
