import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChatBubble } from "./chat-bubble";
import type { ChatMessage, WsStatus } from "./use-chat-ws";

interface ChatWindowProps {
  messages: ChatMessage[];
  status: WsStatus;
  onSend: (text: string) => void;
}

export function ChatWindow({ messages, status, onSend }: ChatWindowProps) {
  const { t } = useTranslation("discover");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom doesn't implement scrollIntoView — guard so tests don't blow up.
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  const inputDisabled = status !== "open";
  const sendDisabled = inputDisabled || draft.trim().length === 0;

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        aria-live="polite"
        aria-label={t("chat.title")}
      >
        {status === "connecting" && (
          <p className="text-center text-sm text-muted-foreground" data-testid="chat-connecting">
            {t("chat.connecting")}
          </p>
        )}
        {status === "open" && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">{t("chat.empty")}</p>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} body={msg.body} from={msg.from} />
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border px-4 py-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chat.placeholder")}
          disabled={inputDisabled}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50"
          aria-label={t("chat.placeholder")}
        />
        <button
          type="submit"
          disabled={sendDisabled}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {t("chat.send")}
        </button>
      </form>
    </div>
  );
}
