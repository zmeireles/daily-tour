import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/lib/i18n/formatting-locale";
import { ChatBubble } from "./chat-bubble";
import { ChatEmptyState } from "./chat-empty-state";
import { SuggestionStrip } from "./suggested-prompts";
import type { ChatMessage, WsStatus } from "./use-chat-ws";

interface ConversationPanelProps {
  messages: ChatMessage[];
  status: WsStatus;
  onSend: (text: string) => void;
}

// Local-day key (YYYY-MM-DD) so messages crossing midnight separate correctly.
// Duplicated from chat-window.tsx rather than shared: extracting a list would
// have to move these module-private helpers and so touch the snapshot-guarded
// mobile ChatWindow. The loop below renders byte-identically to mobile.
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

// The bounded conversation card at the heart of desktop Chat. Surface is the
// CANVAS (bg-surface) reading as paper via a hairline + shadow, so the host
// (them) bubbles — themselves bg-surface-container-low — sit one step proud of
// it. Owns the desktop composer (44px send, no mic) and the SuggestionStrip,
// keeping all composer changes desktop-only. Reuses ChatBubble verbatim.
export function ConversationPanel({ messages, status, onSend }: ConversationPanelProps) {
  const { t, i18n } = useTranslation("discover");
  // Date conventions, not the translation bundle — see formatting-locale.ts.
  const locale = formattingLocale(i18n.language);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom doesn't implement scrollIntoView — guard so tests don't blow up.
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(draft);
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status !== "open") return;
    onSend(trimmed);
    setDraft("");
  }

  const inputDisabled = status !== "open";
  const sendDisabled = inputDisabled || draft.trim().length === 0;
  const hasMessages = messages.length > 0;
  const showEmptyState = status === "open" && !hasMessages;

  return (
    <div
      className="mx-auto flex w-[clamp(640px,60vw,820px)] min-h-[560px] max-h-[820px] flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm"
      data-testid="conversation-panel"
    >
      <div
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-5"
        aria-live="polite"
        aria-label={t("chat.title")}
      >
        {status === "connecting" && (
          <p className="text-center text-sm text-on-surface-variant" data-testid="chat-connecting">
            {t("chat.connecting")}
          </p>
        )}
        {showEmptyState && <ChatEmptyState onPick={submit} />}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDay = !prev || !isSameDay(msg.ts, prev.ts);
          return (
            <Fragment key={msg.id}>
              {showDay && (
                <div className="flex justify-center py-2" data-testid="chat-day-separator">
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                    {dayLabel(msg.ts, locale, t("chat.day_today"))}
                  </span>
                </div>
              )}
              <ChatBubble body={msg.body} from={msg.from} ts={msg.ts} />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-outline-variant bg-surface px-6 py-4">
        {hasMessages && <SuggestionStrip onPick={submit} className="mb-3 pb-1" />}
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chat.placeholder")}
            disabled={inputDisabled}
            className="flex-1 rounded-full border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant disabled:opacity-50"
            aria-label={t("chat.placeholder")}
          />
          <button
            type="submit"
            disabled={sendDisabled}
            aria-label={t("chat.send")}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-5" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
