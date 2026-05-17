import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  body: string;
  ts: number;
}

export type WsStatus = "connecting" | "open" | "closed" | "error";

interface ChatFrame {
  body?: string;
}

function parseFrame(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as ChatFrame;
    return parsed.body ?? raw;
  } catch {
    return raw;
  }
}

export function useChatWs(jwt: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<WsStatus>("closed");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jwt) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/v1/chat/ws?token=${encodeURIComponent(jwt)}`;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (evt: MessageEvent<string>) => {
      const body = parseFrame(evt.data);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from: "them", body, ts: Date.now() },
      ]);
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
