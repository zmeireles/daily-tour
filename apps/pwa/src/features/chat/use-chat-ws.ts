import { CHAT_JWT_SUBPROTOCOL } from "@daily-tour/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  body: string;
  ts: number;
}

export type WsStatus = "connecting" | "open" | "closed" | "error";

interface HistoryMessage {
  id: string;
  direction: string;
  body: string;
  ts: string;
}

function tsToNumber(value: unknown): number {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function historyToMessage(m: HistoryMessage): ChatMessage {
  return {
    id: m.id,
    from: m.direction === "inbound" ? "me" : "them",
    body: m.body,
    ts: tsToNumber(m.ts),
  };
}

/**
 * Server → client frame (T-4.0.1):
 *   {"type":"ack","id","ts"}                  delivery receipt — no bubble
 *   {"type":"message","from":"host","body",…} host/system message — "them" bubble
 *   {"body":…}                                legacy shape — "them" bubble
 * Returns a ChatMessage to append, or null for frames that don't render
 * (acks: the optimistic "me" bubble already covers the sent message; the
 *  ack only confirms persistence, visible in the WS frame count).
 */
export function frameToMessage(raw: string): ChatMessage | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { id: crypto.randomUUID(), from: "them", body: raw, ts: Date.now() };
  }

  if (parsed.type === "ack") return null;

  // Explicit host/system message frame: {"type":"message","from":"host","body",…}.
  // The guest sees the host as "them". Handled ahead of the legacy-body branch
  // so a future {"type":"message"} frame without a body can't fall through and
  // render as an empty bubble.
  if (parsed.type === "message" && typeof parsed.body === "string") {
    return {
      id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
      from: "them",
      body: parsed.body,
      ts: tsToNumber(parsed.ts),
    };
  }

  if (typeof parsed.body === "string") {
    return {
      id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
      from: "them",
      body: parsed.body,
      ts: tsToNumber(parsed.ts),
    };
  }
  return null;
}

async function fetchHistory(jwt: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch("/v1/chat/history", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: HistoryMessage[] };
    return (data.messages ?? []).map(historyToMessage);
  } catch {
    // Network/transport failure — fall back to a live-only thread rather
    // than blocking the chat UI on the history read.
    return [];
  }
}

export function useChatWs(jwt: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<WsStatus>("closed");
  const wsRef = useRef<WebSocket | null>(null);

  // Re-hydrate persisted history on mount so messages survive a reload
  // (UAT-G08 step 5). Merge ahead of any in-flight optimistic messages,
  // de-duped by id so a reload never doubles a bubble.
  useEffect(() => {
    if (!jwt) return;
    let cancelled = false;
    void fetchHistory(jwt).then((history) => {
      if (cancelled || history.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(history.map((m) => m.id));
        return [...history, ...prev.filter((m) => !seen.has(m.id))];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [jwt]);

  useEffect(() => {
    if (!jwt) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/v1/chat/ws`;

    setStatus("connecting");
    // The JWT rides in the subprotocol list, NOT the URL: a query string is
    // echoed into the BFF request log and Traefik's access log alike, and D15
    // requires that a token is never logged. See CHAT_JWT_SUBPROTOCOL.
    const ws = new WebSocket(url, [CHAT_JWT_SUBPROTOCOL, jwt]);
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (evt: MessageEvent<string>) => {
      const msg = frameToMessage(evt.data);
      if (msg) setMessages((prev) => [...prev, msg]);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [jwt]);

  const send = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(text);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from: "me", body: text, ts: Date.now() },
    ]);
  }, []);

  return { messages, status, send };
}
