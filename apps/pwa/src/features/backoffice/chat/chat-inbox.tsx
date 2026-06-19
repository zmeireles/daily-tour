import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useChatThreads,
  useThreadHistory,
  useSendReply,
  type ChatThread,
  type AdminChatMessage,
} from "./use-admin-chat";

// No guest names in the thread payload — show a short, stable label from the id.
function guestLabel(guestId: string): string {
  return guestId.length > 8 ? `${guestId.slice(0, 8)}…` : guestId;
}

function relativeTime(iso: string | null, locale: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThreadRow({
  thread,
  selected,
  onSelect,
  locale,
}: {
  thread: ChatThread;
  selected: boolean;
  onSelect: () => void;
  locale: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-1 border-b px-4 py-3 text-left transition-colors",
        selected ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{guestLabel(thread.guest_id)}</span>
        <time className="shrink-0 text-xs text-muted-foreground">
          {relativeTime(thread.last_ts, locale)}
        </time>
      </div>
      {thread.last_body ? (
        <span className="truncate text-sm text-muted-foreground">{thread.last_body}</span>
      ) : null}
    </button>
  );
}

// Owner-perspective bubble: the host (Miguel) is "me" and right-aligned, so the
// mapping is the INVERSE of the guest ChatBubble. We map by `direction` here
// rather than reusing the guest "me/them" convention: "outbound" = host = me.
function MessageBubble({ message }: { message: AdminChatMessage }) {
  const isOwner = message.direction === "outbound";
  return (
    <div className={cn("flex", isOwner ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words",
          isOwner ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
        data-testid={`admin-chat-bubble-${isOwner ? "owner" : "guest"}`}
      >
        {message.body}
      </div>
    </div>
  );
}

function ThreadPane({ guestId }: { guestId: string }) {
  const { t } = useTranslation("admin");
  const { data: messages, isLoading, isError } = useThreadHistory(guestId);
  const sendReply = useSendReply(guestId);
  const [draft, setDraft] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sendReply.isPending) return;
    sendReply.mutate(body, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("chat.loading", "Loading…")}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">
            {t("chat.history_error", "Failed to load messages.")}
          </p>
        ) : (
          (messages ?? []).map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chat.placeholder", "Type a reply…")}
          aria-label={t("chat.placeholder", "Type a reply…")}
          rows={2}
          className="border-input bg-background flex-1 resize-none rounded-md border px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={sendReply.isPending || draft.trim().length === 0}>
          {t("chat.send", "Send")}
        </Button>
      </form>
    </div>
  );
}

// Two-pane owner inbox. LEFT = thread list (selecting loads history); RIGHT =
// the selected thread's messages + a reply composer. No live WebSocket on the
// owner side — useSendReply invalidates the history query so the reply appears.
export function ChatInbox() {
  const { t, i18n } = useTranslation("admin");
  const { data: threads, isLoading, isError } = useChatThreads();
  const [selected, setSelected] = useState<string | null>(null);

  const rows = threads ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("chat.title", "Messages")}</h1>

      <div className="flex h-[70vh] overflow-hidden rounded-md border">
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-r">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">{t("chat.loading", "Loading…")}</p>
          ) : isError ? (
            <p className="p-4 text-sm text-destructive">
              {t("chat.threads_error", "Failed to load conversations.")}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t("chat.threads_empty", "No conversations yet.")}
            </p>
          ) : (
            rows.map((thread) => (
              <ThreadRow
                key={thread.guest_id}
                thread={thread}
                selected={selected === thread.guest_id}
                onSelect={() => setSelected(thread.guest_id)}
                locale={i18n.language}
              />
            ))
          )}
        </div>

        {selected ? (
          <ThreadPane key={selected} guestId={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">
              {t("chat.select_thread", "Select a conversation to view messages.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
