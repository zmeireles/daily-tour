import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatBubble } from "./chat-bubble";
import type { ChatMessage, WsStatus } from "./use-chat-ws";

interface ChatWindowProps {
  messages: ChatMessage[];
  status: WsStatus;
  onSend: (text: string) => void;
}

// Local-day key (YYYY-MM-DD) so messages crossing midnight separate correctly.
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(ts: number, ref: number): boolean {
  return dayKey(ts) === dayKey(ref);
}

function dayLabel(ts: number, locale: string, today: string): string {
  if (isSameDay(ts, Date.now())) return today;
  return new Date(ts).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ChatWindow({ messages, status, onSend }: ChatWindowProps) {
  const { t, i18n } = useTranslation("discover");
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
    <div className="flex flex-col h-full bg-surface">
      <div
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        aria-live="polite"
        aria-label={t("chat.title")}
      >
        {status === "connecting" && (
          <p className="text-center text-sm text-on-surface-variant" data-testid="chat-connecting">
            {t("chat.connecting")}
          </p>
        )}
        {status === "open" && messages.length === 0 && (
          <p className="text-center text-sm text-on-surface-variant">{t("chat.empty")}</p>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDay = !prev || !isSameDay(msg.ts, prev.ts);
          return (
            <Fragment key={msg.id}>
              {showDay && (
                <div className="flex justify-center py-2" data-testid="chat-day-separator">
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                    {dayLabel(msg.ts, i18n.language, t("chat.day_today"))}
                  </span>
                </div>
              )}
              <ChatBubble body={msg.body} from={msg.from} ts={msg.ts} />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-outline-variant bg-surface px-4 py-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chat.placeholder")}
          disabled={inputDisabled}
          className="flex-1 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant disabled:opacity-50"
          aria-label={t("chat.placeholder")}
        />
        {/* Decorative: no STT is wired on this screen, so the mic is non-interactive. */}
        <Mic
          className="size-5 shrink-0 text-on-surface-variant"
          aria-hidden="true"
          data-testid="chat-mic"
        />
        <button
          type="submit"
          disabled={sendDisabled}
          aria-label={t("chat.send")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Send className="size-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
